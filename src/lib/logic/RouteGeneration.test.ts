import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import Airspace from './aeronautics/Airspace';
import {
	buildRouteLocations,
	getMatzCrossingPoints,
	getNearestMatzTransitPoints,
	isOnMatzBoundary,
	isValidMatzTransit,
	snapToMatzBoundary,
	validateFrtolRoute
} from './RouteGeneration';
import type { LngLat } from './utils';

function matzFromCenter(center: LngLat, radiusKm: number): Airspace {
	const circle = turf.circle(center, radiusKm, { units: 'kilometers', steps: 32 });
	return new Airspace(
		`matz-${center.join(',')}`,
		'TEST MATZ',
		14,
		0,
		0,
		false,
		false,
		false,
		false,
		false,
		circle.geometry.coordinates,
		'GB',
		100,
		0,
		0,
		0,
		1,
		6,
		0,
		2,
		[]
	);
}

function restrictedAirspaceOverRoute(center: LngLat, radiusKm: number): Airspace {
	const circle = turf.circle(center, radiusKm, { units: 'kilometers', steps: 32 });
	return new Airspace(
		'restricted-high',
		'HIGH RESTRICTED',
		1,
		0,
		0,
		false,
		false,
		false,
		false,
		false,
		circle.geometry.coordinates,
		'GB',
		100,
		55,
		0,
		0,
		6,
		6,
		0,
		2,
		[]
	);
}

describe('MATZ transit point selection', () => {
	const start: LngLat = [-1.55, 52.19];
	const destination: LngLat = [-1.29, 52.21];
	const matz = matzFromCenter([-1.42, 52.19], 6);

	it('direct crossing stays on the start-destination track', () => {
		const crossing = getMatzCrossingPoints(start, destination, matz);
		expect(crossing).toBeDefined();
		expect(crossing![0][0]).toBeLessThan(crossing![1][0]);
	});

	it('nearest transit can differ from the direct track for more shape variety', () => {
		const nearest = getNearestMatzTransitPoints(start, destination, matz);
		const direct = getMatzCrossingPoints(start, destination, matz);

		expect(nearest).toBeDefined();
		expect(direct).toBeDefined();
		expect(nearest).not.toEqual(direct);
	});
});

describe('buildRouteLocations', () => {
	it('keeps the four core anchors and avoids collinear filler points on a straight transit', () => {
		const start: LngLat = [-1.55, 52.19];
		const destination: LngLat = [-1.29, 52.19];
		const matz = matzFromCenter([-1.42, 52.19], 6);
		const crossing = getMatzCrossingPoints(start, destination, matz)!;

		const route = buildRouteLocations(start, crossing[0], crossing[1], destination);

		expect(route.length).toBeLessThanOrEqual(6);
		expect(route.length).toBe(4);
		expect(route[0]).toEqual(start);
		expect(route[route.length - 1]).toEqual(destination);
	});

	it('adds a fix only when a corner turn is sharp', () => {
		const start: LngLat = [-1.55, 52.25];
		const destination: LngLat = [-1.29, 52.13];
		const matz = matzFromCenter([-1.42, 52.19], 6);
		const nearest = getNearestMatzTransitPoints(start, destination, matz)!;

		const route = buildRouteLocations(start, nearest[0], nearest[1], destination);

		expect(route.length).toBeGreaterThanOrEqual(4);
		expect(route.length).toBeLessThanOrEqual(6);
	});
});

describe('isValidMatzTransit', () => {
	const matz = matzFromCenter([-1.42, 52.19], 6);

	it('rejects entry and exit at the same boundary point', () => {
		const point: LngLat = [-1.48, 52.19];
		expect(isValidMatzTransit(point, point, matz)).toBe(false);
	});

	it('rejects a tangent touch with no interior penetration', () => {
		const start: LngLat = [-1.55, 52.19];
		const destination: LngLat = [-1.29, 52.19];
		const tangent = getMatzCrossingPoints(start, destination, matz);
		expect(tangent).toBeDefined();
		expect(isValidMatzTransit(tangent![0], tangent![0], matz)).toBe(false);
	});

	it('accepts a chord with measurable interior distance', () => {
		const crossing = getMatzCrossingPoints([-1.55, 52.19], [-1.29, 52.19], matz);
		expect(crossing).toBeDefined();
		expect(isValidMatzTransit(crossing![0], crossing![1], matz)).toBe(true);
	});
});

describe('validateFrtolRoute', () => {
	it('requires the chosen MATZ to be crossed', () => {
		const start: LngLat = [-1.55, 52.19];
		const destination: LngLat = [-1.29, 52.19];
		const matz = matzFromCenter([-1.42, 52.19], 6);
		const otherMatz = matzFromCenter([-1.2, 52.35], 5);
		const bypass: LngLat[] = [start, [-1.55, 52.35], [-1.29, 52.35], destination];
		const fakeTransit: [LngLat, LngLat] = [
			[-1.48, 52.19],
			[-1.36, 52.19]
		];

		const result = validateFrtolRoute(bypass, matz, 20, [matz, otherMatz], fakeTransit);

		expect(result.valid).toBe(false);
	});

	it('snaps transit points onto the MATZ boundary', () => {
		const start: LngLat = [-1.55, 52.19];
		const destination: LngLat = [-1.29, 52.19];
		const matz = matzFromCenter([-1.42, 52.19], 6);
		const crossing = getMatzCrossingPoints(start, destination, matz)!;

		expect(isOnMatzBoundary(crossing[0], matz)).toBe(true);
		expect(isOnMatzBoundary(crossing[1], matz)).toBe(true);
		expect(snapToMatzBoundary(crossing[0], matz)).toEqual(crossing[0]);
	});

	it('ignores restricted airspace above max flight level even when crossed horizontally', () => {
		const start: LngLat = [-1.55, 52.19];
		const destination: LngLat = [-1.29, 52.19];
		const matz = matzFromCenter([-1.42, 52.19], 6);
		const startAtz = matzFromCenter(start, 4);
		startAtz.type = 0;
		startAtz.name = 'START ATZ';
		const crossing = getMatzCrossingPoints(start, destination, matz)!;
		const route = buildRouteLocations(start, crossing[0], crossing[1], destination);
		const highRestricted = restrictedAirspaceOverRoute([-1.42, 52.19], 8);

		const result = validateFrtolRoute(
			route,
			matz,
			20,
			[matz, startAtz, highRestricted],
			crossing
		);

		expect(result.valid).toBe(true);
		expect(result.onRouteAirspace).toContain(matz);
		expect(result.onRouteAirspace).toContain(startAtz);
		expect(result.onRouteAirspace).not.toContain(highRestricted);
	});

	it('keeps distinct MATZ entry and exit waypoints on the built route', () => {
		const start: LngLat = [-1.55, 52.19];
		const destination: LngLat = [-1.29, 52.19];
		const matz = matzFromCenter([-1.42, 52.19], 6);
		const crossing = getMatzCrossingPoints(start, destination, matz)!;
		const route = buildRouteLocations(start, crossing[0], crossing[1], destination);

		const entryIndex = route.findIndex(
			(point) => point[0] === crossing[0][0] && point[1] === crossing[0][1]
		);
		const exitIndex = route.findIndex(
			(point) => point[0] === crossing[1][0] && point[1] === crossing[1][1]
		);

		expect(entryIndex).toBeGreaterThanOrEqual(0);
		expect(exitIndex).toBeGreaterThan(entryIndex);
	});
});
