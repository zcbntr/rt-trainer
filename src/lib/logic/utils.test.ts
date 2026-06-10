import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import Airspace from './aeronautics/Airspace';
import {
	airspaceLowerLimitInFlHundreds,
	filterAirspacesForMaxFlightLevel,
	isAirspaceIncludedInRoute,
	isAirspaceWithinMaxFlightLevel
} from './utils';
import type { LngLat } from './utils';

function airspaceFromCircle(
	id: string,
	name: string,
	type: number,
	center: LngLat,
	radiusKm: number,
	lowerLimit: number,
	lowerLimitUnit: number
): Airspace {
	const circle = turf.circle(center, radiusKm, { units: 'kilometers', steps: 16 });
	return new Airspace(
		id,
		name,
		type,
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
		lowerLimit,
		0,
		0,
		lowerLimitUnit,
		6,
		0,
		2,
		[]
	);
}

describe('airspace vertical limits', () => {
	it('normalises feet and flight-level lower limits to FL hundreds', () => {
		const sfc = airspaceFromCircle('sfc', 'SFC MATZ', 14, [-1.42, 52.19], 6, 0, 1);
		const feet = airspaceFromCircle('feet', 'FEET FLOOR', 0, [-1.42, 52.19], 6, 2500, 1);
		const fl = airspaceFromCircle('fl', 'FL FLOOR', 2, [-1.42, 52.19], 6, 55, 6);

		expect(airspaceLowerLimitInFlHundreds(sfc)).toBe(0);
		expect(airspaceLowerLimitInFlHundreds(feet)).toBe(25);
		expect(airspaceLowerLimitInFlHundreds(fl)).toBe(55);
	});

	it('filters airspaces by max flight level', () => {
		const sfc = airspaceFromCircle('sfc', 'SFC MATZ', 14, [-1.42, 52.19], 6, 0, 1);
		const high = airspaceFromCircle('high', 'HIGH CTA', 2, [-1.42, 52.19], 6, 55, 6);

		expect(filterAirspacesForMaxFlightLevel([sfc, high], 20)).toEqual([sfc]);
		expect(isAirspaceWithinMaxFlightLevel(high, 20)).toBe(false);
	});

	it('does not treat horizontal crossings of high airspace as on-route below max FL', () => {
		const route: LngLat[] = [
			[-1.55, 52.19],
			[-1.29, 52.19]
		];
		const high = airspaceFromCircle('high', 'HIGH CTA', 1, [-1.42, 52.19], 8, 55, 6);

		expect(isAirspaceIncludedInRoute(route, high, 20)).toBe(false);
	});
});
