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

let startPointIndex = 0;
StartPointIndexStore.subscribe((value) => {
	startPointIndex = value;
});

let endPointIndex = 0;
EndPointIndexStore.subscribe((value) => {
	endPointIndex = value;
});

export function resetCurrentRoutePointIndex(): void {
	CurrentScenarioPointIndexStore.set(startPointIndex);
}

export type RouteData = {
	waypoints: Waypoint[];
	airports: Airport[];
	airspaces: Airspace[];
};

/**
 * Loads the given route data into the stores.
 */
export function loadRouteData(routeData: RouteData): void {
	if (routeData == null || routeData == undefined) {
		console.log('Bad route data attempted to be loaded into stores');
		NullRouteStore.set(true);
		return;
	}

	ClearSimulationStores();
	NullRouteStore.set(false);
	WaypointsStore.set(routeData.waypoints.sort((a, b) => a.index - b.index));
}
