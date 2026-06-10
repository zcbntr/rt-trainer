import { derived, get, writable } from 'svelte/store';
import type {
	AircraftDetails,
	AltimeterState,
	RadioState,
	TransponderState
} from './logic/SimulatorTypes';
import type RadioCall from './logic/RadioCall';
import type Scenario from './logic/Scenario';
import Airspace from './logic/aeronautics/Airspace';
import type Waypoint from './logic/aeronautics/Waypoint';
import Airport from './logic/aeronautics/Airport';
import ReportingPoint from './logic/aeronautics/ReportingPoint';
import Navaid from './logic/aeronautics/Navaid';
import { filterAirspacesForMaxFlightLevel } from './logic/utils';
import * as turf from '@turf/turf';
import axios from 'axios';
import type {
	AirportData,
	AirportReportingPointData,
	AirspaceData,
	NavaidData
} from './logic/aeronautics/OpenAIPTypes';
import {
	airspaceFromPlain,
	airportFromPlain,
	navaidFromPlain,
	reportingPointFromPlain
} from './logic/transform';
import { countAirspaceCrossings, toLeafletLatLng } from './logic/utils';
import {
	describeUnsupportedRouteRegions,
	getRouteUnsupportedRegions,
	type UnsupportedPracticeRegion
} from './logic/aeronautics/ukPracticeArea';

const initialAircraftDetails: AircraftDetails = {
	prefix: 'STUDENT',
	callsign: 'G-OFLY',
	aircraftType: 'Cessna 172'
};

const initialRadioState: RadioState = {
	mode: 'OFF',
	dialMode: 'OFF',
	activeFrequency: '121.800',
	standbyFrequency: '129.800',
	tertiaryFrequency: '177.200'
};

const initialTransponderState: TransponderState = {
	dialMode: 'OFF',
	frequency: '7000',
	identEnabled: false,
	vfrHasExecuted: false
};

const initialAltimeterState: AltimeterState = {
	pressure: 1013
};

export const AircraftDetailsStore = writable<AircraftDetails>(initialAircraftDetails);

export const ScenarioSeedStore = writable<string>('');

export const HasEmergenciesStore = writable<boolean>(false);

export const SpeechInputEnabledStore = writable<boolean>(false);

export const SpeechBufferStore = writable<string>('');

export const SpeechOutputEnabledStore = writable<boolean>(false);

export const SpeechNoiseStore = writable<number>(0);

export const LiveFeedbackStore = writable<boolean>(false);

export const RadioStateStore = writable<RadioState>(initialRadioState);

export const TransponderStateStore = writable<TransponderState>(initialTransponderState);

export const AltimeterStateStore = writable<AltimeterState>(initialAltimeterState);

export const UserMessageStore = writable<string>('');

export const ExpectedUserMessageStore = writable<string>('');

export const MostRecentlyReceivedMessageStore = writable<string>('');

// Scenario/route stores
export const ScenarioStore = writable<Scenario | undefined>(undefined);

export const ScenarioPointsStore = derived(ScenarioStore, ($ScenarioStore) => {
	if ($ScenarioStore) {
		return $ScenarioStore.scenarioPoints;
	} else {
		return [];
	}
});

export const WaypointsStore = writable<Waypoint[]>([]);

/** Used by the scenario planner page and sidebar when persisting unnamed fix labels. */
export const PlannerUnnamedWaypointCountStore = writable(1);

export const WaypointPointsMapStore = derived(WaypointsStore, ($WaypointsStore) => {
	return $WaypointsStore.map((waypoint) => toLeafletLatLng(waypoint.location));
});

export const RouteDistanceMetersStore = derived(WaypointsStore, ($RoutePointStore) => {
	let distance = 0;
	for (let i = 0; i < $RoutePointStore.length - 1; i++) {
		const point1 = $RoutePointStore[i];
		const point2 = $RoutePointStore[i + 1];
		distance += turf.distance(point1.location, point2.location, { units: 'meters' });
	}
	return distance;
});

export const RouteDistanceDisplayUnitStore = writable<string>('Nautical Miles');

export const RouteDistanceDisplayStore = derived(
	[RouteDistanceMetersStore, RouteDistanceDisplayUnitStore],
	([$RouteDistanceMetersStore, $RouteDistanceDisplayUnitStore]) => {
		if ($RouteDistanceDisplayUnitStore == 'Nautical Miles') {
			return ($RouteDistanceMetersStore / 1852).toFixed(2) + ' nm';
		} else if ($RouteDistanceDisplayUnitStore == 'Miles') {
			return ($RouteDistanceMetersStore / 1609.344).toFixed(2) + ' mi';
		} else {
			return ($RouteDistanceMetersStore / 1000).toFixed(2) + ' km';
		}
	}
);

export const RouteUnsupportedRegionsStore = derived(WaypointsStore, ($WaypointsStore) => {
	return getRouteUnsupportedRegions($WaypointsStore.map((waypoint) => waypoint.location));
});

export const RouteUnsupportedRegionsWarningStore = derived(
	RouteUnsupportedRegionsStore,
	($RouteUnsupportedRegionsStore): string | undefined => {
		if ($RouteUnsupportedRegionsStore.length === 0) return undefined;

		return describeUnsupportedRouteRegions($RouteUnsupportedRegionsStore);
	}
);

export type { UnsupportedPracticeRegion };

export const AllAirspacesStore = writable<Airspace[]>([]);

/** Default max FL for FRTOL route generation and scenario filtering (FL20 = 2000 ft). */
export const DEFAULT_MAX_FLIGHT_LEVEL = 20;

export const maxFlightLevelStore = writable<number>(DEFAULT_MAX_FLIGHT_LEVEL);

export const FilteredAirspacesStore = derived(
	[AllAirspacesStore, maxFlightLevelStore],
	([$AllAirspacesStore, $MaxFlightLevelStore]) =>
		filterAirspacesForMaxFlightLevel($AllAirspacesStore, $MaxFlightLevelStore)
);

export const OnRouteAirspacesStore = derived(
	[FilteredAirspacesStore, maxFlightLevelStore, WaypointsStore],
	([$FilteredAirspacesStore, $MaxFlightLevelStore, $WaypointStore]) => {
		if ($FilteredAirspacesStore.length === 0 || $WaypointStore.length === 0) return [];

		const filteredAirspaces: Airspace[] = [];
		$FilteredAirspacesStore.forEach((airspace) => {
			if (
				airspace.isIncludedInRoute(
					$WaypointStore.map((waypoint) => waypoint.location),
					$MaxFlightLevelStore
				)
			) {
				filteredAirspaces.push(airspace);
			}
		});
		return filteredAirspaces;
	}
);

export const OnRouteAirspaceCrossingsStore = derived(
	[OnRouteAirspacesStore, WaypointsStore],
	([$OnRouteAirspacesStore, $WaypointStore]) => {
		if ($OnRouteAirspacesStore.length === 0 || $WaypointStore.length < 2) return 0;

		const route = $WaypointStore.map((waypoint) => waypoint.location);
		return countAirspaceCrossings(route, $OnRouteAirspacesStore);
	}
);

export const AllAirportsStore = writable<Airport[]>([]);

export const AllReportingPointsStore = writable<ReportingPoint[]>([]);

export const AllNavaidsStore = writable<Navaid[]>([]);

export const OnRouteAirportsStore = derived(
	[AllAirportsStore, WaypointsStore],
	([$AllAirportsStore, $WaypointStore]) => {
		if ($AllAirportsStore.length === 0 || $WaypointStore.length === 0) return [];

		const onRouteAirports: Airport[] = [];
		$AllAirportsStore.forEach((airport) => {
			const waypoint = $WaypointStore.find((x) => x.referenceObjectId === airport.id);
			if (waypoint) {
				onRouteAirports.push(airport);
			}
		});
		return onRouteAirports;
	}
);

export const CurrentScenarioPointIndexStore = writable<number>(0);

function createStartPointIndexStore() {
	const { subscribe, set } = writable(0);
	return {
		subscribe,
		set: (value: number) => {
			if (value >= 0) {
				set(value);
			} else {
				throw new Error('Start point index cannot be negative');
			}
		}
	};
}

export const StartPointIndexStore = createStartPointIndexStore();

// Eventually add logic to prevent setting the end point index to a value greater than the length of the route
function createEndPointIndexStore() {
	const { subscribe, set } = writable(0);
	return {
		subscribe,
		set: (value: number) => {
			set(value);
		}
	};
}

export const EndPointIndexStore = createEndPointIndexStore();

export const CurrentScenarioPointStore = derived(
	[ScenarioStore, CurrentScenarioPointIndexStore],
	([$ScenarioStore, $CurrentScenarioPointStore]) => {
		if ($ScenarioStore) {
			if ($ScenarioStore.scenarioPoints.length > 0) {
				$ScenarioStore.currentPointIndex = Math.max(
					0,
					Math.min($CurrentScenarioPointStore, $ScenarioStore.scenarioPoints.length - 1)
				);
				return $ScenarioStore.getCurrentPoint();
			}
		}
	}
);

export const CurrentUpdateDataStore = derived(
	CurrentScenarioPointStore,
	($CurrentScenarioPointStore) => {
		return $CurrentScenarioPointStore?.updateData;
	}
);

export const CurrentScenarioContextStore = derived(
	CurrentScenarioPointStore,
	($CurrentScenarioPointStore) => {
		return $CurrentScenarioPointStore?.updateData.currentContext || '';
	}
);

export const CurrentTargetStore = derived(CurrentUpdateDataStore, ($CurrentUpdateDataStore) => {
	return $CurrentUpdateDataStore?.currentTarget || '';
});

export const CurrentTargetFrequencyStore = derived(
	CurrentScenarioPointStore,
	($CurrentRoutePointStore) => {
		return $CurrentRoutePointStore?.updateData.currentTargetFrequency || '000.000';
	}
);

// Radio calls history
export const RadioCallsHistoryStore = writable<RadioCall[]>([]);

// Page stores
export const TutorialStore = writable<boolean>(false);

// System status stores
export const NullRouteStore = writable<boolean>(false);

// Server response stores - for blocking repeated server requests
export const AwaitingServerResponseStore = writable<boolean>(false);

export function ResetSimulatorProgressStores(): void {
	CurrentScenarioPointIndexStore.set(get(StartPointIndexStore));
	RadioStateStore.set({ ...initialRadioState });
	TransponderStateStore.set({ ...initialTransponderState });
	AltimeterStateStore.set({ ...initialAltimeterState });
	UserMessageStore.set('');
	ExpectedUserMessageStore.set('');
	MostRecentlyReceivedMessageStore.set('');
	RadioCallsHistoryStore.set([]);
	ScenarioStore.set(undefined);
}

export function ClearSimulationStores(): void {
	AircraftDetailsStore.set(initialAircraftDetails);
	ScenarioSeedStore.set('');
	HasEmergenciesStore.set(false);
	SpeechInputEnabledStore.set(false);
	SpeechOutputEnabledStore.set(false);
	SpeechNoiseStore.set(0);
	LiveFeedbackStore.set(false);
	RadioStateStore.set(initialRadioState);
	TransponderStateStore.set(initialTransponderState);
	AltimeterStateStore.set(initialAltimeterState);
	UserMessageStore.set('');
	ExpectedUserMessageStore.set('');
	MostRecentlyReceivedMessageStore.set('');
	ScenarioStore.set(undefined);
	WaypointsStore.set([]);
	CurrentScenarioPointIndexStore.set(0);
	StartPointIndexStore.set(0);
	EndPointIndexStore.set(0);
	RadioCallsHistoryStore.set([]);
	NullRouteStore.set(false);
}

/** Airspaces along the current route, filtered by max flight level. */
export function getAirspacesAlongRoute(): Airspace[] {
	const waypoints = get(WaypointsStore);
	const maxFL = get(maxFlightLevelStore);
	const allAirspaces = get(AllAirspacesStore);

	if (waypoints.length === 0 || allAirspaces.length === 0) return [];

	const route = waypoints.map((waypoint) => waypoint.location);
	return allAirspaces.filter(
		(airspace) => airspace.lowerLimit <= maxFL && airspace.isIncludedInRoute(route, maxFL)
	);
}

export async function ensureAeronauticalData(): Promise<void> {
	await Promise.all([
		fetchAirports(),
		fetchAirspaces(),
		fetchReportingPoints(),
		fetchNavaids()
	]);
}

let airspacesFetchPromise: Promise<void> | null = null;
let airportsFetchPromise: Promise<void> | null = null;
let reportingPointsFetchPromise: Promise<void> | null = null;
let navaidsFetchPromise: Promise<void> | null = null;

export async function fetchAirspaces(): Promise<void> {
	if (get(AllAirspacesStore).length > 0) return;

	if (!airspacesFetchPromise) {
		airspacesFetchPromise = axios
			.get('/api/airspaces')
			.then((response) => {
				AllAirspacesStore.set(
					response.data.map((airspace: AirspaceData) => airspaceFromPlain(airspace))
				);
			})
			.finally(() => {
				airspacesFetchPromise = null;
			});
	}

	await airspacesFetchPromise;
}

export async function fetchAirports(): Promise<void> {
	if (get(AllAirportsStore).length > 0) return;

	if (!airportsFetchPromise) {
		airportsFetchPromise = axios
			.get('/api/airports')
			.then((response) => {
				AllAirportsStore.set(
					response.data.map((airport: AirportData) => airportFromPlain(airport))
				);
			})
			.finally(() => {
				airportsFetchPromise = null;
			});
	}

	await airportsFetchPromise;
}

export async function fetchReportingPoints(): Promise<void> {
	if (get(AllReportingPointsStore).length > 0) return;

	if (!reportingPointsFetchPromise) {
		reportingPointsFetchPromise = axios
			.get('/api/reporting-points')
			.then((response) => {
				AllReportingPointsStore.set(
					response.data.map((reportingPoint: AirportReportingPointData) =>
						reportingPointFromPlain(reportingPoint)
					)
				);
			})
			.finally(() => {
				reportingPointsFetchPromise = null;
			});
	}

	await reportingPointsFetchPromise;
}

export async function fetchNavaids(): Promise<void> {
	if (get(AllNavaidsStore).length > 0) return;

	if (!navaidsFetchPromise) {
		navaidsFetchPromise = axios
			.get('/api/navaids')
			.then((response) => {
				AllNavaidsStore.set(
					response.data.map((navaid: NavaidData) => navaidFromPlain(navaid))
				);
			})
			.finally(() => {
				navaidsFetchPromise = null;
			});
	}

	await navaidsFetchPromise;
}
