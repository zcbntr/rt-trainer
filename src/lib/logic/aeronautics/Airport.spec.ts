import { describe, expect, it } from 'vitest';
import Airport from './Airport';
import Runway from './Runway';

function createRunway(landingOnly: boolean, takeOffOnly: boolean): Runway {
	return new Runway(
		'09',
		90,
		false,
		0,
		true,
		0,
		landingOnly,
		takeOffOnly,
		1000,
		0,
		30,
		0,
		1000,
		0,
		1000,
		0,
		1000,
		0,
		1000,
		0,
		[0, 0],
		0,
		0,
		[],
		false,
		[],
		[]
	);
}

function createAirport(runways: Runway[]): Airport {
	return new Airport(
		'test-airport',
		'Test Airport',
		'TEST',
		'',
		'',
		3,
		'GB',
		[0, 0],
		[],
		0,
		[],
		false,
		false,
		false,
		false,
		runways,
		[]
	);
}

describe('Airport runway selection', () => {
	it('selects a takeoff runway when some runways are landing only', () => {
		const airport = createAirport([createRunway(true, false), createRunway(false, false)]);

		expect(airport.getTakeoffRunway(0).landingOnly).toBe(false);
	});

	it('throws when no takeoff runway is available', () => {
		const airport = createAirport([createRunway(true, false)]);

		expect(() => airport.getTakeoffRunway(0)).toThrow(/No takeoff runway available/);
	});

	it('throws when the airport has no runways', () => {
		const airport = createAirport([]);

		expect(() => airport.getTakeoffRunway(0)).toThrow(/No takeoff runway available/);
	});
});
