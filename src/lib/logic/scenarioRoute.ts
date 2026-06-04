import { get } from 'svelte/store';
import {
	ClearSimulationStores,
	CurrentScenarioPointIndexStore,
	EndPointIndexStore,
	NullRouteStore,
	StartPointIndexStore,
	WaypointsStore
} from '$lib/stores';
import type Airport from './aeronautics/Airport';
import type Airspace from './aeronautics/Airspace';
import type Waypoint from './aeronautics/Waypoint';

export function resetCurrentRoutePointIndex(): void {
	CurrentScenarioPointIndexStore.set(get(StartPointIndexStore));
}

export type RouteData = {
	waypoints: Waypoint[];
	airports: Airport[];
	airspaces: Airspace[];
};

export type LoadRouteDataOptions = {
	/** When false, only updates route waypoints (planner auto-generate). Default true for simulator flows. */
	clearSimulation?: boolean;
};

/**
 * Loads the given route data into the stores.
 */
export function loadRouteData(routeData: RouteData, options: LoadRouteDataOptions = {}): void {
	const { clearSimulation = true } = options;

	if (routeData == null || routeData == undefined) {
		console.log('Bad route data attempted to be loaded into stores');
		NullRouteStore.set(true);
		return;
	}

	if (clearSimulation) {
		ClearSimulationStores();
	} else {
		NullRouteStore.set(false);
	}

	WaypointsStore.set(routeData.waypoints.sort((a, b) => a.index - b.index));
}
