import Waypoint, { WaypointType } from './aeronautics/Waypoint';
import type Airspace from './aeronautics/Airspace';
import {
	filterAirspacesForMaxFlightLevel,
	getNthPhoneticAlphabetLetter,
	simpleHash,
	toCoordinatePair,
	type LngLat
} from './utils';
import type Airport from './aeronautics/Airport';
import type { RouteData } from './scenarioRoute';
import { generateScenario } from './ScenarioGenerator';
import { isValidUkPracticeWaypoint } from './aeronautics/ukPracticeArea';
import * as turf from '@turf/turf';

const PRACTICE_ROUTE_MAX_ATTEMPTS = 10;
const MAX_ROUTE_SEARCH_ITERATIONS = 2000;

const TURN_FIX_BEFORE_CORNER_KM = 4;
const MIN_TURN_FOR_FIX_DEG = 32;
const MIN_LEG_KM = 2;
/** Minimum separation between MATZ entry and exit boundary points. */
const MIN_MATZ_TRANSIT_KM = 2;
/** Minimum distance the entry–exit leg must run inside the MATZ. */
const MIN_MATZ_INTERIOR_KM = 1.5;
/** Minimum flown distance inside the MATZ along the entry→exit route segment. */
const MIN_MATZ_ROUTE_INTERIOR_KM = 2;
/** How far inside the MATZ entry/exit must sit from the boundary. */
const MATZ_PENETRATION_SAMPLE_KM = 0.75;
const MATZ_BOUNDARY_TOLERANCE_KM = 0.08;
const MAX_ROUTE_POINTS = 6;
const COORDINATE_PRECISION = 6;

type MatzTransitStrategy = 'nearest' | 'direct';

type RouteCandidate = {
	destination: Airport;
	matzEntry: LngLat;
	matzExit: LngLat;
	locations: LngLat[];
	onRouteAirspace: Airspace[];
};

function getAirportsWithTakeoffRunways(airports: Airport[]): Airport[] {
	return airports.filter((airport) => airport.hasTakeoffRunway());
}

function roundCoord([lng, lat]: LngLat): LngLat {
	return [
		+parseFloat(lng.toFixed(COORDINATE_PRECISION)),
		+parseFloat(lat.toFixed(COORDINATE_PRECISION))
	];
}

function coordinatesEqual(a: LngLat, b: LngLat, epsilon = 1e-5): boolean {
	return Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon;
}

function dedupeLocations(points: LngLat[]): LngLat[] {
	const unique: LngLat[] = [];
	for (const point of points) {
		if (!unique.some((existing) => coordinatesEqual(existing, point))) {
			unique.push(point);
		}
	}
	return unique;
}

function matzBoundaryLine(matz: Airspace) {
	return turf.lineString(matz.coordinates[0]);
}

function nearestPointOnMatzBoundary(point: LngLat, matz: Airspace): LngLat {
	const snapped = turf.nearestPointOnLine(matzBoundaryLine(matz), turf.point(point));
	return toCoordinatePair(snapped.geometry.coordinates as LngLat);
}

export function snapToMatzBoundary(point: LngLat, matz: Airspace): LngLat {
	return roundCoord(nearestPointOnMatzBoundary(point, matz));
}

export function isOnMatzBoundary(point: LngLat, matz: Airspace): boolean {
	const snapped = nearestPointOnMatzBoundary(point, matz);
	return turf.distance(point, snapped, { units: 'kilometers' }) <= MATZ_BOUNDARY_TOLERANCE_KM;
}

/** Entry and exit must be apart with the connecting leg passing inside the MATZ, not just grazing a vertex. */
export function isValidMatzTransit(entry: LngLat, exit: LngLat, matz: Airspace): boolean {
	if (coordinatesEqual(entry, exit)) return false;

	const separationKm = turf.distance(entry, exit, { units: 'kilometers' });
	if (separationKm < MIN_MATZ_TRANSIT_KM) return false;

	if (!isOnMatzBoundary(entry, matz) || !isOnMatzBoundary(exit, matz)) return false;

	const polygon = turf.polygon(matz.coordinates);
	const transitBearing = turf.bearing(entry, exit);
	const insideFromEntry = turf.destination(entry, MATZ_PENETRATION_SAMPLE_KM, transitBearing, {
		units: 'kilometers'
	});
	const insideFromExit = turf.destination(exit, MATZ_PENETRATION_SAMPLE_KM, transitBearing + 180, {
		units: 'kilometers'
	});

	if (!turf.booleanPointInPolygon(insideFromEntry, polygon)) return false;
	if (!turf.booleanPointInPolygon(insideFromExit, polygon)) return false;

	const midpoint = turf.midpoint(entry, exit);
	if (!turf.booleanPointInPolygon(midpoint, polygon)) return false;

	const segment = turf.lineString([entry, exit]);
	const segmentKm = turf.length(segment, { units: 'kilometers' });
	const steps = Math.max(4, Math.ceil(segmentKm / 0.25));
	const stepKm = segmentKm / steps;
	let interiorKm = 0;

	for (let step = 0; step <= steps; step++) {
		const sample = turf.along(segment, stepKm * step, { units: 'kilometers' });
		if (turf.booleanPointInPolygon(sample, polygon)) {
			interiorKm += step === 0 || step === steps ? stepKm / 2 : stepKm;
		}
	}

	return interiorKm >= MIN_MATZ_INTERIOR_KM;
}

function isValidDestinationAirport(
	startAirport: Airport,
	candidate: Airport,
	startAirportIsControlled: boolean,
	chosenMATZ: Airspace
): boolean {
	if (candidate === startAirport) return false;
	if (chosenMATZ.pointInsideATZ(candidate.coordinates)) return false;
	if (!candidate.hasLandingRunway()) return false;

	if (startAirportIsControlled) {
		return candidate.type !== 3;
	}

	return candidate.type === 3 || candidate.type === 9;
}

function turnAngleDegrees(previous: LngLat, corner: LngLat, next: LngLat): number {
	const inbound = turf.bearing(previous, corner);
	const outbound = turf.bearing(corner, next);
	let turn = Math.abs(outbound - inbound);
	while (turn > 180) turn = 360 - turn;
	return turn;
}

export function routeTransitsMatz(route: LngLat[], matz: Airspace): boolean {
	const line = turf.lineString(route);
	const polygon = turf.polygon(matz.coordinates);
	return turf.booleanIntersects(line, polygon);
}

/** Total distance flown inside the MATZ along the full route polyline. */
export function measureRouteInteriorKm(route: LngLat[], matz: Airspace): number {
	const polygon = turf.polygon(matz.coordinates);
	let interiorKm = 0;

	for (let index = 0; index < route.length - 1; index++) {
		const segment = turf.lineString([route[index], route[index + 1]]);
		const segmentKm = turf.length(segment, { units: 'kilometers' });
		const steps = Math.max(2, Math.ceil(segmentKm / 0.2));

		for (let step = 0; step < steps; step++) {
			const sample = turf.along(segment, (segmentKm * (step + 0.5)) / steps, {
				units: 'kilometers'
			});
			if (turf.booleanPointInPolygon(sample, polygon)) {
				interiorKm += segmentKm / steps;
			}
		}
	}

	return interiorKm;
}

/** Where the direct track between two points crosses a MATZ boundary. */
export function getMatzCrossingPoints(
	start: LngLat,
	destination: LngLat,
	matz: Airspace
): [LngLat, LngLat] | undefined {
	const track = turf.lineString([start, destination]);
	const polygon = turf.polygon(matz.coordinates);
	const intersections = turf.lineIntersect(track, polygon);

	if (intersections.features.length < 2) return undefined;

	const points = dedupeLocations(
		intersections.features.map((feature) =>
			roundCoord(toCoordinatePair(feature.geometry.coordinates as LngLat))
		)
	).sort(
		(a, b) =>
			turf.distance(start, a, { units: 'kilometers' }) -
			turf.distance(start, b, { units: 'kilometers' })
	);

	if (points.length < 2) return undefined;

	const entry = snapToMatzBoundary(points[0], matz);
	const exit = snapToMatzBoundary(points[points.length - 1], matz);

	if (!isValidMatzTransit(entry, exit, matz)) return undefined;

	return [entry, exit];
}

/** MATZ entry/exit on the boundary closest to each airfield — produces more varied route shapes. */
export function getNearestMatzTransitPoints(
	start: LngLat,
	destination: LngLat,
	matz: Airspace
): [LngLat, LngLat] | undefined {
	const entry = snapToMatzBoundary(nearestPointOnMatzBoundary(start, matz), matz);
	const exit = snapToMatzBoundary(nearestPointOnMatzBoundary(destination, matz), matz);

	const probeRoute = [start, entry, exit, destination];
	if (!routeTransitsMatz(probeRoute, matz)) return undefined;
	if (!isValidMatzTransit(entry, exit, matz)) return undefined;

	return [entry, exit];
}

export function selectMatzTransitPoints(
	start: LngLat,
	destination: LngLat,
	matz: Airspace,
	strategy: MatzTransitStrategy
): [LngLat, LngLat] | undefined {
	if (strategy === 'direct') {
		return getMatzCrossingPoints(start, destination, matz);
	}

	return getNearestMatzTransitPoints(start, destination, matz);
}

function pointBeforeCorner(
	approachFrom: LngLat,
	corner: LngLat,
	distanceKm: number
): LngLat | undefined {
	const legKm = turf.distance(approachFrom, corner, { units: 'kilometers' });
	if (legKm <= distanceKm + MIN_LEG_KM) return undefined;

	const bearing = turf.bearing(approachFrom, corner);
	return roundCoord(
		toCoordinatePair(
			turf.destination(approachFrom, legKm - distanceKm, bearing, { units: 'kilometers' }).geometry
				.coordinates
		)
	);
}

/**
 * Builds a route from the four FRTOL anchors, adding at most one fix before each sharp corner.
 * Avoids collinear filler points that only make straight lines look busier.
 */
export function buildRouteLocations(
	start: LngLat,
	matzEntry: LngLat,
	matzExit: LngLat,
	end: LngLat
): LngLat[] {
	const anchors = [roundCoord(start), roundCoord(matzEntry), roundCoord(matzExit), roundCoord(end)];
	const locations: LngLat[] = [];

	const append = (point: LngLat, options?: { force?: boolean }) => {
		const last = locations[locations.length - 1];
		if (last && coordinatesEqual(last, point)) return;
		if (
			!options?.force &&
			last &&
			turf.distance(last, point, { units: 'kilometers' }) < MIN_LEG_KM
		) {
			return;
		}
		locations.push(point);
	};

	for (let index = 0; index < anchors.length; index++) {
		const corner = anchors[index];
		const previous = index > 0 ? anchors[index - 1] : undefined;
		const next = index < anchors.length - 1 ? anchors[index + 1] : undefined;

		// Never split the MATZ entry→exit leg — fixes there create exit points outside the airspace.
		if (
			index !== 2 &&
			previous &&
			next &&
			locations.length < MAX_ROUTE_POINTS - 1 &&
			turnAngleDegrees(previous, corner, next) >= MIN_TURN_FOR_FIX_DEG
		) {
			const fix = pointBeforeCorner(previous, corner, TURN_FIX_BEFORE_CORNER_KM);
			if (fix && isValidUkPracticeWaypoint(fix)) {
				append(fix);
			}
		}

		append(corner, { force: index === 1 || index === 2 });
	}

	return locations;
}

function routeIncludesOrderedMatzTransit(
	route: LngLat[],
	entry: LngLat,
	exit: LngLat,
	matz: Airspace
): boolean {
	if (!isValidMatzTransit(entry, exit, matz)) return false;

	const entryIndex = route.findIndex((point) => coordinatesEqual(point, entry));
	const exitIndex = route.findIndex((point) => coordinatesEqual(point, exit));
	if (entryIndex < 0 || exitIndex < 0 || exitIndex <= entryIndex) return false;

	return routeTransitsMatz(route.slice(entryIndex, exitIndex + 1), matz);
}

export function validateFrtolRoute(
	route: LngLat[],
	chosenMATZ: Airspace,
	maxFL: number,
	airspaces: Airspace[],
	matzTransit: [LngLat, LngLat]
): { valid: boolean; onRouteAirspace: Airspace[] } {
	for (const point of route) {
		if (!isValidUkPracticeWaypoint(point)) {
			return { valid: false, onRouteAirspace: [] };
		}
	}

	if (!routeTransitsMatz(route, chosenMATZ)) {
		return { valid: false, onRouteAirspace: [] };
	}

	if (!routeIncludesOrderedMatzTransit(route, matzTransit[0], matzTransit[1], chosenMATZ)) {
		return { valid: false, onRouteAirspace: [] };
	}

	const entryIndex = route.findIndex((point) => coordinatesEqual(point, matzTransit[0]));
	const exitIndex = route.findIndex((point) => coordinatesEqual(point, matzTransit[1]));
	const matzLeg = route.slice(entryIndex, exitIndex + 1);
	if (measureRouteInteriorKm(matzLeg, chosenMATZ) < MIN_MATZ_ROUTE_INTERIOR_KM) {
		return { valid: false, onRouteAirspace: [] };
	}

	const onRouteAirspace: Airspace[] = [];

	for (const airspace of airspaces) {
		if (!airspace.isIncludedInRoute(route, maxFL)) continue;

		if (airspace.type === 1 || (airspace.type === 14 && airspace !== chosenMATZ)) {
			return { valid: false, onRouteAirspace: [] };
		}

		if (airspace !== chosenMATZ) {
			onRouteAirspace.push(airspace);
		}
	}

	onRouteAirspace.push(chosenMATZ);

	if (onRouteAirspace.length < 2 || onRouteAirspace.length > 5) {
		return { valid: false, onRouteAirspace: [] };
	}

	return { valid: true, onRouteAirspace };
}

function buildRouteWaypoints(
	locations: LngLat[],
	startAirport: Airport,
	destinationAirport: Airport,
	chosenMATZ: Airspace,
	matzEntry: LngLat,
	matzExit: LngLat
): Waypoint[] {
	let fixCount = 0;

	return locations.map((location, index) => {
		if (index === 0) {
			return new Waypoint(
				startAirport.name,
				location,
				WaypointType.Airport,
				index,
				startAirport.id
			);
		}

		if (index === locations.length - 1) {
			return new Waypoint(
				destinationAirport.name,
				location,
				WaypointType.Airport,
				index,
				destinationAirport.id
			);
		}

		if (coordinatesEqual(location, matzEntry)) {
			return new Waypoint(
				chosenMATZ.getDisplayName() + ' Entry',
				location,
				WaypointType.NewAirspace,
				index
			);
		}

		if (coordinatesEqual(location, matzExit)) {
			return new Waypoint(
				chosenMATZ.getDisplayName() + ' Exit',
				location,
				WaypointType.NewAirspace,
				index
			);
		}

		fixCount++;
		return new Waypoint(
			`Waypoint ${getNthPhoneticAlphabetLetter(fixCount)}`,
			location,
			WaypointType.Fix,
			index
		);
	});
}

function matzStrategiesForSeed(seed: number, iteration: number): MatzTransitStrategy[] {
	const roll = Math.abs(seed + iteration * 1315423911) % 10;
	if (roll < 6) return ['nearest', 'direct'];
	if (roll < 9) return ['direct', 'nearest'];
	return ['nearest'];
}

function collectRouteCandidates(
	startAirport: Airport,
	chosenMATZ: Airspace,
	possibleDestinations: Airport[],
	startAirportIsControlled: boolean,
	seed: number,
	iteration: number,
	maxFL: number,
	airspaces: Airspace[]
): RouteCandidate[] {
	const candidates: RouteCandidate[] = [];
	const strategies = matzStrategiesForSeed(seed, iteration);

	for (let destIterations = 0; destIterations < possibleDestinations.length; destIterations++) {
		const destinationIndex =
			Math.floor(
				Math.abs(seed * 765432198 + iteration * 345678912 + destIterations * 567891234)
			) % possibleDestinations.length;
		const candidate = possibleDestinations[destinationIndex];

		if (
			!isValidDestinationAirport(startAirport, candidate, startAirportIsControlled, chosenMATZ)
		) {
			continue;
		}

		for (const strategy of strategies) {
			const transit = selectMatzTransitPoints(
				startAirport.coordinates,
				candidate.coordinates,
				chosenMATZ,
				strategy
			);
			if (!transit) continue;

			const [matzEntry, matzExit] = transit;
			const locations = buildRouteLocations(
				startAirport.coordinates,
				matzEntry,
				matzExit,
				candidate.coordinates
			);
			const validation = validateFrtolRoute(locations, chosenMATZ, maxFL, airspaces, [
				matzEntry,
				matzExit
			]);
			if (!validation.valid) continue;

			candidates.push({
				destination: candidate,
				matzEntry,
				matzExit,
				locations,
				onRouteAirspace: validation.onRouteAirspace
			});
		}
	}

	return candidates;
}

export function generatePracticeRoute(
	routeSeed: string,
	scenarioSeed: string,
	airports: Airport[],
	airspaces: Airspace[],
	maxFL: number,
	hasEmergencies: boolean,
	maxAttempts: number = PRACTICE_ROUTE_MAX_ATTEMPTS
): { routeData: RouteData; routeSeed: string } | undefined {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const seed = attempt === 0 ? routeSeed : `${routeSeed}-${attempt}`;
		const routeData = generateFRTOLRouteFromSeed(seed, airports, airspaces, maxFL);
		if (!routeData) continue;

		try {
			generateScenario(
				scenarioSeed,
				routeData.waypoints,
				routeData.airports,
				routeData.airspaces,
				hasEmergencies
			);
			return { routeData, routeSeed: seed };
		} catch (error) {
			console.warn(`Skipping route seed "${seed}" due to scenario generation failure`, error);
		}
	}

	return undefined;
}

export function generateFRTOLRouteFromSeed(
	seedString: string,
	airports: Airport[],
	airspaces: Airspace[],
	maxFL: number
): RouteData | undefined {
	if (
		seedString === '' ||
		!airports ||
		airports.length === 0 ||
		!airspaces ||
		airspaces.length === 0
	) {
		return undefined;
	}

	const reachableAirspaces = filterAirspacesForMaxFlightLevel(airspaces, maxFL);
	if (reachableAirspaces.length === 0) {
		return undefined;
	}

	const airportsWithTakeoffRunways = getAirportsWithTakeoffRunways(airports);
	if (airportsWithTakeoffRunways.length === 0) {
		return undefined;
	}

	const seed = simpleHash(seedString);
	let startAirport: Airport | undefined;
	let chosenMATZ: Airspace | undefined;
	let selectedRoute: RouteCandidate | undefined;

	let iterations = 0;

	while (!selectedRoute && iterations < MAX_ROUTE_SEARCH_ITERATIONS) {
		iterations++;

		startAirport =
			airportsWithTakeoffRunways[
				Math.floor(Math.abs(seed * 987654321 + iterations * 123456789)) %
					airportsWithTakeoffRunways.length
			];
		const startAirportIsControlled = startAirport.type === 3 || startAirport.type === 9;

		const nearbyMATZs = reachableAirspaces.filter(
			(airspace) =>
				airspace.type === 14 &&
				turf.distance(startAirport!.coordinates, airspace.coordinates[0][0], {
					units: 'kilometers'
				}) < 40 &&
				!airspace.pointInsideATZ(startAirport!.coordinates)
		);

		if (nearbyMATZs.length === 0) continue;

		chosenMATZ =
			nearbyMATZs[
				Math.floor(Math.abs(seed * 876543219 + iterations * 234567891)) % nearbyMATZs.length
			];

		if (chosenMATZ.pointInsideATZ(startAirport.coordinates)) continue;

		const possibleDestinations = airports.filter((airport) => {
			const distance = turf.distance(chosenMATZ!.coordinates[0][0], airport.coordinates, {
				units: 'kilometers'
			});

			return (
				(airport.type === 0 ||
					airport.type === 2 ||
					airport.type === 3 ||
					airport.type === 9) &&
				airport.hasLandingRunway() &&
				distance < 100
			);
		});

		if (possibleDestinations.length === 0) continue;

		const candidates = collectRouteCandidates(
			startAirport,
			chosenMATZ,
			possibleDestinations,
			startAirportIsControlled,
			seed,
			iterations,
			maxFL,
			reachableAirspaces
		);

		if (candidates.length === 0) continue;

		selectedRoute =
			candidates[Math.abs(seed * 1597334677 + iterations * 97531) % candidates.length];
	}

	if (iterations >= MAX_ROUTE_SEARCH_ITERATIONS || !chosenMATZ || !startAirport || !selectedRoute) {
		console.log(`Could not find a valid route after ${iterations} iterations`);
		return undefined;
	}

	const { destination: destinationAirport, matzEntry, matzExit, locations, onRouteAirspace } =
		selectedRoute;

	if (!startAirport.hasTakeoffRunway() || !destinationAirport.hasLandingRunway()) {
		return undefined;
	}

	console.log('Route generated in ' + iterations + ' iterations');

	const waypoints = buildRouteWaypoints(
		locations,
		startAirport,
		destinationAirport,
		chosenMATZ,
		matzEntry,
		matzExit
	);

	return {
		waypoints,
		airspaces: onRouteAirspace,
		airports: [startAirport, destinationAirport]
	};
}
