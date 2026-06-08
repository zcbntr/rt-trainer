import type Waypoint from './aeronautics/Waypoint';
import { waypointToPlain } from './transform';

export type SimulatorUrlOptions = {
	seed: string;
	hasEmergencies: boolean;
	waypoints: Waypoint[];
	airportIds: string[];
	tutorial?: boolean;
};

export function buildSimulatorSearchParams(options: SimulatorUrlOptions): URLSearchParams {
	const searchParams = new URLSearchParams();
	searchParams.set('seed', options.seed);
	searchParams.set('hasEmergencies', String(options.hasEmergencies));
	searchParams.set(
		'waypoints',
		JSON.stringify(options.waypoints.map((waypoint) => waypointToPlain(waypoint)))
	);
	searchParams.set('airports', options.airportIds.join(','));

	if (options.tutorial) {
		searchParams.set('tutorial', 'true');
	}

	return searchParams;
}

export function buildSimulatorUrl(basePath: string, options: SimulatorUrlOptions): string {
	return `${basePath}?${buildSimulatorSearchParams(options).toString()}`;
}
