import { describe, expect, it } from 'vitest';
import { waypointFromPlain } from '$lib/logic/transform';
import {
	estimateJsonBytes,
	hasUsableSimulatorRoute,
	isWithinStorageLimit,
	MAX_STORED_BYTES,
	MAX_WAYPOINTS,
	type PlannerPersistedState,
	type SimulatorPersistedState,
	simulatorSessionsMatch,
	STORAGE_VERSION,
	waypointsMatchPersisted
} from './localStorageState';

function makeWaypoint(index: number): Record<string, unknown> {
	return {
		id: `waypoint-${index}`,
		type: 4,
		location: [-1.234567 + index * 0.01, 52.123456 + index * 0.01],
		index,
		name: `Waypoint ${index}`,
		referenceObjectId: index % 3 === 0 ? `airport-${index}` : undefined
	};
}

function makePlannerState(waypointCount: number): PlannerPersistedState {
	return {
		version: STORAGE_VERSION,
		waypoints: Array.from({ length: waypointCount }, (_, index) => makeWaypoint(index)),
		scenarioSeed: 'abcd1234',
		hasEmergencies: true,
		maxFlightLevel: 20,
		routeDistanceDisplayUnit: 'Nautical Miles',
		routeSeed: 'route-seed',
		unnamedWaypointCount: waypointCount + 1
	};
}

function makeSimulatorState(waypointCount: number): SimulatorPersistedState {
	return {
		version: STORAGE_VERSION,
		seed: 'abcd1234',
		hasEmergencies: false,
		waypoints: Array.from({ length: waypointCount }, (_, index) => makeWaypoint(index)),
		callsign: 'G-OFLY',
		prefix: 'STUDENT',
		aircraftType: 'Cessna 172',
		startPointIndex: 0,
		endPointIndex: waypointCount - 1,
		currentScenarioPointIndex: 2,
		radioState: {
			mode: 'COM',
			dialMode: 'SBY',
			activeFrequency: '121.800',
			standbyFrequency: '129.800',
			tertiaryFrequency: '177.200'
		},
		transponderState: {
			dialMode: 'SBY',
			frequency: '7000',
			identEnabled: false,
			vfrHasExecuted: false
		},
		altimeterState: {
			pressure: 1013
		},
		mostRecentlyReceivedMessage: 'London Information, G-OFLY, good afternoon'
	};
}

describe('simulator route validation', () => {
	it('requires at least two waypoints', () => {
		expect(hasUsableSimulatorRoute([])).toBe(false);
		expect(hasUsableSimulatorRoute([makeWaypoint(0)])).toBe(false);
		expect(hasUsableSimulatorRoute([makeWaypoint(0), makeWaypoint(1)])).toBe(true);
	});

	it('matches persisted waypoints when the route is unchanged', () => {
		const storedWaypoints = [makeWaypoint(0), makeWaypoint(1)];
		const currentWaypoints = storedWaypoints.map((waypoint) => waypointFromPlain(waypoint));
		expect(waypointsMatchPersisted(storedWaypoints, currentWaypoints)).toBe(true);
		expect(waypointsMatchPersisted(storedWaypoints, [waypointFromPlain(makeWaypoint(0))])).toBe(
			false
		);
	});

	it('matches simulator sessions by seed, emergencies, and route', () => {
		const saved = makeSimulatorState(2);
		const currentWaypoints = saved.waypoints.map((waypoint) => waypointFromPlain(waypoint));
		expect(
			simulatorSessionsMatch(saved, {
				seed: 'abcd1234',
				hasEmergencies: false,
				waypoints: currentWaypoints
			})
		).toBe(true);
		expect(
			simulatorSessionsMatch(saved, {
				seed: 'other-seed',
				hasEmergencies: false,
				waypoints: currentWaypoints
			})
		).toBe(false);
	});
});

describe('localStorageState size limits', () => {
	it('keeps a realistic planner payload well below the storage cap', () => {
		const bytes = estimateJsonBytes(makePlannerState(20));
		expect(bytes).toBeLessThan(MAX_STORED_BYTES / 10);
	});

	it('keeps a realistic simulator payload well below the storage cap', () => {
		const bytes = estimateJsonBytes(makeSimulatorState(20));
		expect(bytes).toBeLessThan(MAX_STORED_BYTES / 10);
	});

	it('rejects payloads above the configured storage cap', () => {
		const oversized = 'x'.repeat(MAX_STORED_BYTES + 1);
		expect(isWithinStorageLimit(oversized)).toBe(false);
	});

	it('allows payloads at the configured storage cap', () => {
		const maxSized = 'x'.repeat(MAX_STORED_BYTES);
		expect(isWithinStorageLimit(maxSized)).toBe(true);
	});

	it('stays below the cap even at the waypoint ceiling', () => {
		const plannerBytes = estimateJsonBytes(makePlannerState(MAX_WAYPOINTS));
		const simulatorBytes = estimateJsonBytes(makeSimulatorState(MAX_WAYPOINTS));

		expect(plannerBytes).toBeLessThan(MAX_STORED_BYTES);
		expect(simulatorBytes).toBeLessThan(MAX_STORED_BYTES);
	});
});
