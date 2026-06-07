import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import { ukPlannerBounds, type LngLat } from '../utils';

/** Simplified island of Ireland — used with {@link northernIrelandPolygon} to exclude the Republic only. */
const irelandIslandPolygon: Feature<Polygon> = turf.polygon([
	[
		[-10.75, 51.42],
		[-10.5, 55.45],
		[-7.2, 55.4],
		[-7.8, 54.8],
		[-8.2, 54.3],
		[-7.5, 54.0],
		[-6.5, 53.85],
		[-6.0, 53.3],
		[-6.0, 52.5],
		[-7.5, 51.85],
		[-10.75, 51.42]
	]
]);

/** Northern Ireland remains valid UK practice airspace. */
const northernIrelandPolygon: Feature<Polygon> = turf.polygon([
	[
		[-5.43, 54.0],
		[-5.43, 55.35],
		[-6.0, 55.35],
		[-7.5, 55.2],
		[-8.17, 54.75],
		[-7.3, 54.15],
		[-6.2, 54.0],
		[-5.43, 54.0]
	]
]);

/** Mainland Europe north of the Channel — excludes French/Belgian/Dutch territory inside the UK bbox. */
const continentalEuropePolygon: Feature<Polygon> = turf.polygon([
	[
		[-1.0, 48.5],
		[3.5, 48.5],
		[3.5, 51.5],
		[1.0, 51.5],
		[-1.0, 51.0],
		[-1.0, 48.5]
	]
]);

const [southWest, northEast] = ukPlannerBounds;

/** Approximate sample spacing when checking whether a route segment crosses an area. */
const ROUTE_SAMPLE_SPACING_KM = 5;

export type UnsupportedPracticeRegion =
	| 'republic-of-ireland'
	| 'continental-europe'
	| 'outside-bounds';

const unsupportedRegionLabels: Record<UnsupportedPracticeRegion, string> = {
	'republic-of-ireland': 'the Republic of Ireland',
	'continental-europe': 'continental Europe',
	'outside-bounds': 'areas outside the UK practice bounds'
};

export function isWithinUkPlannerBounds([lng, lat]: LngLat): boolean {
	return lat >= southWest[0] && lat <= northEast[0] && lng >= southWest[1] && lng <= northEast[1];
}

function isInRepublicOfIreland([lng, lat]: LngLat): boolean {
	const point = turf.point([lng, lat]);

	return (
		turf.booleanPointInPolygon(point, irelandIslandPolygon) &&
		!turf.booleanPointInPolygon(point, northernIrelandPolygon)
	);
}

function isInContinentalEurope([lng, lat]: LngLat): boolean {
	return turf.booleanPointInPolygon(turf.point([lng, lat]), continentalEuropePolygon);
}

/**
 * Whether a waypoint may be placed for UK radiotelephony practice.
 * Sea around the UK is allowed; foreign land and territorial waters are not.
 */
export function isValidUkPracticeWaypoint(location: LngLat): boolean {
	if (!isWithinUkPlannerBounds(location)) return false;
	if (isInRepublicOfIreland(location)) return false;
	if (isInContinentalEurope(location)) return false;

	return true;
}

function segmentCrossesArea(
	start: LngLat,
	end: LngLat,
	predicate: (location: LngLat) => boolean
): boolean {
	const line = turf.lineString([start, end]);
	const lengthKm = turf.length(line, { units: 'kilometers' });
	const steps = Math.max(2, Math.ceil(lengthKm / ROUTE_SAMPLE_SPACING_KM));

	for (let step = 0; step <= steps; step++) {
		const point = turf.along(line, (lengthKm * step) / steps, { units: 'kilometers' });
		const location = point.geometry.coordinates as LngLat;

		if (predicate(location)) return true;
	}

	return false;
}

function segmentLeavesPracticeBounds(start: LngLat, end: LngLat): boolean {
	return segmentCrossesArea(start, end, (location) => !isWithinUkPlannerBounds(location));
}

/**
 * Returns unsupported practice regions crossed by the straight-line route between waypoints.
 * Does not block routing — used for advisory warnings only.
 */
export function getRouteUnsupportedRegions(route: LngLat[]): UnsupportedPracticeRegion[] {
	if (route.length < 2) return [];

	const regions = new Set<UnsupportedPracticeRegion>();

	for (let index = 0; index < route.length - 1; index++) {
		const start = route[index];
		const end = route[index + 1];

		if (segmentCrossesArea(start, end, isInRepublicOfIreland)) {
			regions.add('republic-of-ireland');
		}

		if (segmentCrossesArea(start, end, isInContinentalEurope)) {
			regions.add('continental-europe');
		}

		if (segmentLeavesPracticeBounds(start, end)) {
			regions.add('outside-bounds');
		}
	}

	return [...regions];
}

export function describeUnsupportedRouteRegions(regions: UnsupportedPracticeRegion[]): string {
	if (regions.length === 0) return '';

	const labels = regions.map((region) => unsupportedRegionLabels[region]);
	const regionList =
		labels.length === 1
			? labels[0]
			: `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;

	return `Your route crosses ${regionList}. RT Trainer only supports UK radiotelephony — consider plotting around these areas for more accurate practice.`;
}

export const ukPracticeAreaRejectionMessage =
	'Waypoints must stay within the UK practice area. The Republic of Ireland and other foreign territories are not supported.';
