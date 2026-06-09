import { instanceToPlain, plainToInstance, type ClassConstructor } from 'class-transformer';
import Runway from './aeronautics/Runway';
import { Frequency } from './Frequency';
import { METORData } from './aeronautics/METORData';
import Airport from './aeronautics/Airport';
import Airspace from './aeronautics/Airspace';
import ReportingPoint from './aeronautics/ReportingPoint';
import Navaid from './aeronautics/Navaid';
import Scenario from './Scenario';
import ScenarioPoint from './ScenarioPoints';
import Waypoint from './aeronautics/Waypoint';
import Feedback from './Feedback';

function fromPlain<T>(cls: ClassConstructor<T>, plain: unknown): T {
	return plainToInstance(cls, plain);
}

function fromPlainArray<T>(cls: ClassConstructor<T>, items: unknown[] | undefined): T[] {
	return (items ?? []).map((item) => fromPlain(cls, item));
}

function toPlainRecord(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== 'object') {
		return {};
	}
	return instanceToPlain(value) as Record<string, unknown>;
}

export function runwayFromPlain(plain: unknown): Runway {
	return fromPlain(Runway, plain);
}

export function runwayToPlain(runway: Runway): Record<string, unknown> {
	return instanceToPlain(runway) as Record<string, unknown>;
}

export function frequencyFromPlain(plain: unknown): Frequency {
	return fromPlain(Frequency, plain);
}

export function frequencyToPlain(frequency: Frequency): Record<string, unknown> {
	return instanceToPlain(frequency) as Record<string, unknown>;
}

export function metorDataFromPlain(plain: unknown): METORData {
	return fromPlain(METORData, plain);
}

export function metorDataToPlain(metorData: METORData): Record<string, unknown> {
	return instanceToPlain(metorData) as Record<string, unknown>;
}

export function airportFromPlain(plain: unknown): Airport {
	const data = toPlainRecord(plain);
	return plainToInstance(Airport, {
		...data,
		runways: fromPlainArray(Runway, data.runways as unknown[] | undefined),
		frequencies: fromPlainArray(Frequency, data.frequencies as unknown[] | undefined),
		metorData: data.metorData ? metorDataFromPlain(data.metorData) : undefined
	});
}

export function airportToPlain(airport: Airport): Record<string, unknown> {
	return instanceToPlain(airport) as Record<string, unknown>;
}

export function airspaceFromPlain(plain: unknown): Airspace {
	const data = toPlainRecord(plain);
	return plainToInstance(Airspace, {
		...data,
		frequencies: fromPlainArray(Frequency, data.frequencies as unknown[] | undefined)
	});
}

export function airspaceToPlain(airspace: Airspace): Record<string, unknown> {
	return instanceToPlain(airspace) as Record<string, unknown>;
}

export function reportingPointFromPlain(plain: unknown): ReportingPoint {
	return fromPlain(ReportingPoint, plain);
}

export function reportingPointToPlain(reportingPoint: ReportingPoint): Record<string, unknown> {
	return instanceToPlain(reportingPoint) as Record<string, unknown>;
}

export function navaidFromPlain(plain: unknown): Navaid {
	return fromPlain(Navaid, plain);
}

export function navaidToPlain(navaid: Navaid): Record<string, unknown> {
	return instanceToPlain(navaid) as Record<string, unknown>;
}

export function waypointFromPlain(plain: unknown): Waypoint {
	return fromPlain(Waypoint, plain);
}

export function waypointToPlain(waypoint: Waypoint): Record<string, unknown> {
	return instanceToPlain(waypoint) as Record<string, unknown>;
}

export function scenarioPointFromPlain(plain: unknown): ScenarioPoint {
	return fromPlain(ScenarioPoint, plain);
}

export function scenarioPointToPlain(scenarioPoint: ScenarioPoint): Record<string, unknown> {
	return instanceToPlain(scenarioPoint) as Record<string, unknown>;
}

export function scenarioFromPlain(plain: unknown): Scenario {
	const data = toPlainRecord(plain);
	return plainToInstance(Scenario, {
		...data,
		scenarioPoints:
			(data.scenarioPoints as unknown[] | undefined)?.map(scenarioPointFromPlain) ?? [],
		airports: (data.airports as unknown[] | undefined)?.map(airportFromPlain) ?? [],
		airspaces: (data.airspaces as unknown[] | undefined)?.map(airspaceFromPlain) ?? [],
		waypoints: fromPlainArray(Waypoint, data.waypoints as unknown[] | undefined)
	});
}

export function scenarioToPlain(scenario: Scenario): Record<string, unknown> {
	return instanceToPlain(scenario) as Record<string, unknown>;
}

export function feedbackFromPlain(plain: unknown): Feedback {
	return fromPlain(Feedback, plain);
}

export function feedbackToPlain(feedback: Feedback): Record<string, unknown> {
	return instanceToPlain(feedback) as Record<string, unknown>;
}
