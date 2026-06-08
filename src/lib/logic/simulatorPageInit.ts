import { page } from '$app/state';
import type { WaypointURLObject } from '$lib/logic/ScenarioTypes';
import {
	applySimulatorState,
	clearSimulatorPersistedState,
	hasUsableSimulatorRoute,
	loadSimulatorPersistedState,
	restoreSimulatorSessionIfMatching
} from '$lib/persistence/localStorageState';
import { waypointFromPlain } from '$lib/logic/transform';
import {
	AircraftDetailsStore,
	CurrentScenarioPointIndexStore,
	EndPointIndexStore,
	ScenarioStore,
	StartPointIndexStore,
	TutorialStore,
	WaypointsStore
} from '$lib/stores';
import { get } from 'svelte/store';

const VALID_PREFIXES = new Set([
	'',
	'STUDENT',
	'HELICOPTER',
	'POLICE',
	'SUPER',
	'FASTJET',
	'FASTPROP'
]);

export type SimulatorPageInit = {
	seed: string;
	hasEmergencies: boolean;
	callsign: string;
	prefix: string;
	aircraftType: string;
	startPointIndex: number;
	endPointIndex: number;
	criticalDataMissing: boolean;
	restoredFromStorage: boolean;
	cockpitStateRestored: boolean;
	tutorial: boolean;
};

function parseStartPointIndex(value: string | null, currentStartPointIndex: number): number {
	if (value == null) return currentStartPointIndex;

	const parsed = parseInt(value);
	return parsed < 0 ? 0 : parsed;
}

function parseEndPointIndex(
	value: string | null,
	startPointIndex: number,
	currentEndPointIndex: number
): number {
	if (value == null) return currentEndPointIndex;

	const parsed = parseInt(value);
	return parsed < 0 || parsed >= startPointIndex ? -1 : parsed;
}

export function initializeSimulatorPage(): SimulatorPageInit {
	const seedString = page.url.searchParams.get('seed');
	const waypointsString = page.url.searchParams.get('waypoints');
	const airportsString = page.url.searchParams.get('airports');
	const hasUrlScenarioData =
		seedString != null && seedString !== '' && waypointsString != null && airportsString != null;

	let seed = '';
	let hasEmergencies = false;
	let callsign = 'G-OFLY';
	let prefix = '';
	let aircraftType = 'Cessna 172';
	let startPointIndex = 0;
	let endPointIndex = -1;
	let criticalDataMissing = false;
	let restoredFromStorage = false;
	let cockpitStateRestored = false;

	if (hasUrlScenarioData) {
		seed = seedString;
		hasEmergencies = page.url.searchParams.get('hasEmergencies') === 'true';

		const waypointsDataArray: WaypointURLObject[] = JSON.parse(waypointsString);
		WaypointsStore.set(waypointsDataArray.map((waypoint) => waypointFromPlain(waypoint)));
	} else {
		const savedScenario = loadSimulatorPersistedState();
		if (savedScenario) {
			restoredFromStorage = true;
			cockpitStateRestored = true;
			const restored = applySimulatorState(savedScenario);
			seed = restored.seed;
			hasEmergencies = restored.hasEmergencies;
			callsign = restored.callsign;
			prefix = restored.prefix;
			aircraftType = restored.aircraftType;
			startPointIndex = restored.startPointIndex;
			endPointIndex = restored.endPointIndex;
		} else {
			criticalDataMissing = true;
		}
	}

	if (!hasUsableSimulatorRoute(get(WaypointsStore))) {
		criticalDataMissing = true;
		restoredFromStorage = false;
		clearSimulatorPersistedState();
	}

	const callsignString = page.url.searchParams.get('callsign');
	if (callsignString != null && callsignString !== '') {
		callsign = callsignString;
	}

	const prefixString = page.url.searchParams.get('prefix');
	if (prefixString != null && VALID_PREFIXES.has(prefixString)) {
		prefix = prefixString;
	}

	const aircraftTypeString = page.url.searchParams.get('aircraftType');
	if (aircraftTypeString != null && aircraftTypeString !== '') {
		aircraftType = aircraftTypeString;
	}

	startPointIndex = parseStartPointIndex(page.url.searchParams.get('startPoint'), startPointIndex);
	endPointIndex = parseEndPointIndex(
		page.url.searchParams.get('endPoint'),
		startPointIndex,
		endPointIndex
	);

	const tutorial = page.url.searchParams.get('tutorial') === 'true';

	if (
		!criticalDataMissing &&
		hasUrlScenarioData &&
		restoreSimulatorSessionIfMatching({
			seed,
			hasEmergencies,
			waypoints: get(WaypointsStore)
		})
	) {
		restoredFromStorage = true;
		cockpitStateRestored = true;

		const aircraftDetails = get(AircraftDetailsStore);
		callsign = aircraftDetails.callsign;
		prefix = aircraftDetails.prefix;
		aircraftType = aircraftDetails.aircraftType;
		startPointIndex = get(StartPointIndexStore);
		endPointIndex = get(EndPointIndexStore);
	}

	return {
		seed,
		hasEmergencies,
		callsign,
		prefix,
		aircraftType,
		startPointIndex,
		endPointIndex,
		criticalDataMissing,
		restoredFromStorage,
		cockpitStateRestored,
		tutorial
	};
}

export function applySimulatorPageInitToStores(init: SimulatorPageInit): void {
	ScenarioStore.set(undefined);

	if (!init.restoredFromStorage) {
		CurrentScenarioPointIndexStore.set(init.startPointIndex);
	}

	StartPointIndexStore.set(init.startPointIndex);
	TutorialStore.set(init.tutorial);
	AircraftDetailsStore.set({
		callsign: init.callsign,
		prefix: init.prefix,
		aircraftType: init.aircraftType
	});
}
