import type Airport from './aeronautics/Airport';
import type Airspace from './aeronautics/Airspace';
import type Waypoint from './aeronautics/Waypoint';
import Scenario from './Scenario';
import type ScenarioPoint from './ScenarioPoints';
import {
	getAirborneScenarioPoints,
	getEndAirportScenarioPoints,
	getStartAirportScenarioPoints
} from './ScenarioPoints';
import { findIntersections } from './utils';

export function generateScenario(
	seed: string,
	waypoints: Waypoint[],
	airports: Airport[],
	airspaces: Airspace[],
	hasEmergencies: boolean
): Scenario {
	if (!airspaces || airspaces.length === 0) {
		throw new Error('No airspaces found');
	}

	if (!waypoints || waypoints.length === 0) {
		throw new Error('No waypoints found');
	}

	const scenarioPoints: ScenarioPoint[] = [];

	const startAirport = airports.find((x) => x.id === waypoints[0].referenceObjectId);

	const endAirport = airports.find(
		(x) => x.id === waypoints[waypoints.length - 1].referenceObjectId
	);

	// Get all airspace along the route
	const route: [number, number][] = waypoints.map((x) => x.location);

	// Collect all intersection points with airspaces
	const intersectionPoints = findIntersections(route, airspaces);

	if (startAirport)
		scenarioPoints.push(...getStartAirportScenarioPoints(seed, waypoints, airspaces, startAirport));

	scenarioPoints.push(
		...getAirborneScenarioPoints(
			scenarioPoints.length,
			seed,
			waypoints,
			airspaces,
			intersectionPoints,
			startAirport,
			endAirport,
			scenarioPoints[scenarioPoints.length - 1],
			hasEmergencies
		)
	);

	if (endAirport)
		scenarioPoints.push(
			...getEndAirportScenarioPoints(
				scenarioPoints.length,
				seed,
				waypoints,
				airspaces,
				endAirport,
				scenarioPoints[scenarioPoints.length - 1]
			)
		);

	return new Scenario(seed, waypoints, airspaces, airports, scenarioPoints);
}
