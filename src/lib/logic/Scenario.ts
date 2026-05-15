import Waypoint from './aeronautics/Waypoint';
import ScenarioPoint from './ScenarioPoints';
import Airport from './aeronautics/Airport';
import Airspace from './aeronautics/Airspace';

export default class Scenario {
	seed: string;
	scenarioPoints: ScenarioPoint[] = [];
	airports: Airport[] = [];
	airspaces: Airspace[] = [];
	waypoints: Waypoint[] = [];
	currentPointIndex: number = 0;

	constructor(
		seed: string,
		waypoints: Waypoint[],
		airspace: Airspace[],
		airports: Airport[],
		scenarioPoints: ScenarioPoint[]
	) {
		this.seed = seed;
		this.waypoints = waypoints;
		this.airspaces = airspace;
		this.airports = airports;
		this.scenarioPoints = scenarioPoints;
	}

	public getCurrentPoint(): ScenarioPoint {
		return this.scenarioPoints[this.currentPointIndex];
	}

	public getPoints(): ScenarioPoint[] {
		return this.scenarioPoints;
	}

	public getStartPoint(): ScenarioPoint {
		return this.scenarioPoints[0];
	}

	public getEndPoint(): ScenarioPoint {
		return this.scenarioPoints[this.scenarioPoints.length - 1];
	}

	public getStartAirport(): Airport {
		return this.airports[0];
	}

	public getEndAirport(): Airport {
		return this.airports[this.airports.length - 1];
	}
}
