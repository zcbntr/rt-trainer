import { get } from 'svelte/store';
import {
	AircraftDetailsStore,
	AltimeterStateStore,
	CurrentScenarioPointIndexStore,
	EndPointIndexStore,
	HasEmergenciesStore,
	MostRecentlyReceivedMessageStore,
	RadioStateStore,
	RouteDistanceDisplayUnitStore,
	ScenarioSeedStore,
	StartPointIndexStore,
	TransponderStateStore,
	WaypointsStore,
	maxFlightLevelStore,
	PlannerUnnamedWaypointCountStore
} from '$lib/stores';
import type { AltimeterState, RadioState, TransponderState } from '$lib/logic/SimulatorTypes';
import type Waypoint from '$lib/logic/aeronautics/Waypoint';
import { waypointFromPlain, waypointToPlain } from '$lib/logic/transform';

export const PLANNER_STORAGE_KEY = 'rt-trainer-planner-state';
export const SIMULATOR_STORAGE_KEY = 'rt-trainer-simulator-state';
export const STORAGE_VERSION = 1;

/** Conservative limit below the typical ~5 MB localStorage cap (per origin). */
export const MAX_STORED_BYTES = 4 * 1024 * 1024;

/** Routes with more waypoints are rejected to keep payloads small and predictable. */
export const MAX_WAYPOINTS = 100;

/** A simulator scenario needs at least two waypoints to form a route. */
export const MIN_SIMULATOR_WAYPOINTS = 2;

export function hasUsableSimulatorRoute(
	waypoints: Waypoint[] | Record<string, unknown>[]
): boolean {
	return Array.isArray(waypoints) && waypoints.length >= MIN_SIMULATOR_WAYPOINTS;
}

/** Typical planner payload with 20 waypoints is ~4–8 KB; simulator adds only a few KB more. */
export const TYPICAL_PLANNER_BYTES = 8 * 1024;

export type PlannerPersistedState = {
	version: number;
	waypoints: Record<string, unknown>[];
	scenarioSeed: string;
	hasEmergencies: boolean;
	maxFlightLevel: number;
	routeDistanceDisplayUnit: string;
	routeSeed: string;
	unnamedWaypointCount: number;
};

export type SimulatorPersistedState = {
	version: number;
	seed: string;
	hasEmergencies: boolean;
	waypoints: Record<string, unknown>[];
	callsign: string;
	prefix: string;
	aircraftType: string;
	startPointIndex: number;
	endPointIndex: number;
	currentScenarioPointIndex: number;
	radioState: RadioState;
	transponderState: TransponderState;
	altimeterState: AltimeterState;
	mostRecentlyReceivedMessage: string;
};

function isBrowser(): boolean {
	return typeof localStorage !== 'undefined';
}

export function estimateJsonBytes(value: unknown): number {
	return new Blob([JSON.stringify(value)]).size;
}

export function isWithinStorageLimit(serialized: string): boolean {
	return serialized.length <= MAX_STORED_BYTES;
}

function waypointsToPlain(waypoints: Waypoint[]): Record<string, unknown>[] {
	if (waypoints.length > MAX_WAYPOINTS) {
		throw new Error(`Cannot persist more than ${MAX_WAYPOINTS} waypoints`);
	}

	return waypoints.map((waypoint) => waypointToPlain(waypoint));
}

function waypointsFromPlain(waypoints: Record<string, unknown>[]): Waypoint[] {
	if (waypoints.length > MAX_WAYPOINTS) {
		throw new Error(`Stored plan has too many waypoints (${waypoints.length})`);
	}

	return waypoints.map((waypoint) => waypointFromPlain(waypoint));
}

function readJson<T>(key: string): T | null {
	if (!isBrowser()) return null;

	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;

		return JSON.parse(raw) as T;
	} catch (error) {
		console.warn(`Failed to read persisted state from ${key}`, error);
		return null;
	}
}

function writeJson(key: string, value: unknown): boolean {
	if (!isBrowser()) return false;

	try {
		const serialized = JSON.stringify(value);
		if (!isWithinStorageLimit(serialized)) {
			console.warn(
				`Persisted state for ${key} exceeds the storage limit (${serialized.length} bytes)`
			);
			return false;
		}

		localStorage.setItem(key, serialized);
		return true;
	} catch (error) {
		console.warn(`Failed to write persisted state to ${key}`, error);
		return false;
	}
}

function removeKey(key: string): void {
	if (!isBrowser()) return;
	localStorage.removeItem(key);
}

function isPlannerState(value: unknown): value is PlannerPersistedState {
	if (!value || typeof value !== 'object') return false;

	const state = value as PlannerPersistedState;
	return (
		state.version === STORAGE_VERSION &&
		Array.isArray(state.waypoints) &&
		typeof state.scenarioSeed === 'string' &&
		typeof state.hasEmergencies === 'boolean' &&
		typeof state.maxFlightLevel === 'number' &&
		typeof state.routeDistanceDisplayUnit === 'string' &&
		typeof state.routeSeed === 'string' &&
		typeof state.unnamedWaypointCount === 'number'
	);
}

function isSimulatorState(value: unknown): value is SimulatorPersistedState {
	if (!value || typeof value !== 'object') return false;

	const state = value as SimulatorPersistedState;
	return (
		state.version === STORAGE_VERSION &&
		typeof state.seed === 'string' &&
		state.seed.length > 0 &&
		typeof state.hasEmergencies === 'boolean' &&
		hasUsableSimulatorRoute(state.waypoints) &&
		typeof state.callsign === 'string' &&
		typeof state.prefix === 'string' &&
		typeof state.aircraftType === 'string' &&
		typeof state.startPointIndex === 'number' &&
		typeof state.endPointIndex === 'number' &&
		typeof state.currentScenarioPointIndex === 'number' &&
		typeof state.radioState === 'object' &&
		typeof state.transponderState === 'object' &&
		typeof state.altimeterState === 'object' &&
		typeof state.mostRecentlyReceivedMessage === 'string'
	);
}

export function collectPlannerState(options: {
	routeSeed: string;
	unnamedWaypointCount: number;
}): PlannerPersistedState {
	return {
		version: STORAGE_VERSION,
		waypoints: waypointsToPlain(get(WaypointsStore)),
		scenarioSeed: get(ScenarioSeedStore),
		hasEmergencies: get(HasEmergenciesStore),
		maxFlightLevel: get(maxFlightLevelStore),
		routeDistanceDisplayUnit: get(RouteDistanceDisplayUnitStore),
		routeSeed: options.routeSeed,
		unnamedWaypointCount: options.unnamedWaypointCount
	};
}

export function applyPlannerState(state: PlannerPersistedState): void {
	WaypointsStore.set(waypointsFromPlain(state.waypoints));
	ScenarioSeedStore.set(state.scenarioSeed);
	HasEmergenciesStore.set(state.hasEmergencies);
	maxFlightLevelStore.set(state.maxFlightLevel);
	RouteDistanceDisplayUnitStore.set(state.routeDistanceDisplayUnit);
}

export function getDefaultPlannerState(scenarioSeed: string): PlannerPersistedState {
	return {
		version: STORAGE_VERSION,
		waypoints: [],
		scenarioSeed,
		hasEmergencies: true,
		maxFlightLevel: 30,
		routeDistanceDisplayUnit: 'Nautical Miles',
		routeSeed: '',
		unnamedWaypointCount: 1
	};
}

export function loadPlannerPersistedState(): PlannerPersistedState | null {
	const state = readJson<unknown>(PLANNER_STORAGE_KEY);
	if (!isPlannerState(state)) return null;

	try {
		waypointsFromPlain(state.waypoints);
		return state;
	} catch (error) {
		console.warn('Ignoring invalid planner persisted state', error);
		return null;
	}
}

export function savePlannerPersistedState(state: PlannerPersistedState): boolean {
	try {
		waypointsFromPlain(state.waypoints);
	} catch (error) {
		console.warn('Refusing to save invalid planner state', error);
		return false;
	}

	return writeJson(PLANNER_STORAGE_KEY, state);
}

export function clearPlannerPersistedState(): void {
	removeKey(PLANNER_STORAGE_KEY);
	plannerPersistenceEnabled = false;
	plannerStateInitialized = false;
}

let plannerStateInitialized = false;
let plannerPersistenceEnabled = false;

export function isPlannerPersistenceEnabled(): boolean {
	return plannerPersistenceEnabled;
}

export function initializePlannerFromStorage(
	defaultScenarioSeed: string
): PlannerPersistedState | null {
	if (plannerStateInitialized) {
		return loadPlannerPersistedState();
	}

	plannerStateInitialized = true;

	const savedPlannerState = loadPlannerPersistedState();
	if (savedPlannerState) {
		applyPlannerState(savedPlannerState);
		PlannerUnnamedWaypointCountStore.set(savedPlannerState.unnamedWaypointCount);
		plannerPersistenceEnabled = true;
		return savedPlannerState;
	}

	applyPlannerState(getDefaultPlannerState(defaultScenarioSeed));
	PlannerUnnamedWaypointCountStore.set(1);
	plannerPersistenceEnabled = true;
	return null;
}

export function reenablePlannerPersistenceAfterReset(): void {
	plannerStateInitialized = true;
	plannerPersistenceEnabled = true;
}

function normalizeWaypointForMatch(plain: Record<string, unknown>): string {
	const location = plain.location as [number, number] | undefined;

	return JSON.stringify({
		name: plain.name,
		type: plain.type,
		index: plain.index,
		location: location?.map((coordinate) => +Number(coordinate).toFixed(6)),
		referenceObjectId: plain.referenceObjectId ?? null
	});
}

export function waypointsMatchPersisted(
	stored: Record<string, unknown>[],
	current: Waypoint[]
): boolean {
	if (stored.length !== current.length) return false;

	const storedKeys = stored.map(normalizeWaypointForMatch).sort();
	const currentKeys = current
		.map((waypoint) => normalizeWaypointForMatch(waypointToPlain(waypoint)))
		.sort();

	return storedKeys.join('\n') === currentKeys.join('\n');
}

export function simulatorSessionsMatch(
	saved: SimulatorPersistedState,
	options: {
		seed: string;
		hasEmergencies: boolean;
		waypoints: Waypoint[];
	}
): boolean {
	return (
		saved.seed === options.seed &&
		saved.hasEmergencies === options.hasEmergencies &&
		waypointsMatchPersisted(saved.waypoints, options.waypoints)
	);
}

export function applySimulatorSessionState(state: SimulatorPersistedState): void {
	CurrentScenarioPointIndexStore.set(state.currentScenarioPointIndex);
	StartPointIndexStore.set(state.startPointIndex);
	EndPointIndexStore.set(state.endPointIndex);
	RadioStateStore.set(state.radioState);
	TransponderStateStore.set(state.transponderState);
	AltimeterStateStore.set(state.altimeterState);
	MostRecentlyReceivedMessageStore.set(state.mostRecentlyReceivedMessage);
	AircraftDetailsStore.set({
		callsign: state.callsign,
		prefix: state.prefix,
		aircraftType: state.aircraftType
	});
}

export function restoreSimulatorSessionIfMatching(options: {
	seed: string;
	hasEmergencies: boolean;
	waypoints: Waypoint[];
}): boolean {
	const saved = loadSimulatorPersistedState();
	if (!saved || !simulatorSessionsMatch(saved, options)) return false;

	applySimulatorSessionState(saved);
	return true;
}

export function collectSimulatorState(options: {
	seed: string;
	hasEmergencies: boolean;
}): SimulatorPersistedState {
	const aircraftDetails = get(AircraftDetailsStore);

	return {
		version: STORAGE_VERSION,
		seed: options.seed,
		hasEmergencies: options.hasEmergencies,
		waypoints: waypointsToPlain(get(WaypointsStore)),
		callsign: aircraftDetails.callsign,
		prefix: aircraftDetails.prefix,
		aircraftType: aircraftDetails.aircraftType,
		startPointIndex: get(StartPointIndexStore),
		endPointIndex: get(EndPointIndexStore),
		currentScenarioPointIndex: get(CurrentScenarioPointIndexStore),
		radioState: get(RadioStateStore),
		transponderState: get(TransponderStateStore),
		altimeterState: get(AltimeterStateStore),
		mostRecentlyReceivedMessage: get(MostRecentlyReceivedMessageStore)
	};
}

export function applySimulatorState(state: SimulatorPersistedState): {
	seed: string;
	hasEmergencies: boolean;
	callsign: string;
	prefix: string;
	aircraftType: string;
	startPointIndex: number;
	endPointIndex: number;
} {
	WaypointsStore.set(waypointsFromPlain(state.waypoints));
	applySimulatorSessionState(state);

	return {
		seed: state.seed,
		hasEmergencies: state.hasEmergencies,
		callsign: state.callsign,
		prefix: state.prefix,
		aircraftType: state.aircraftType,
		startPointIndex: state.startPointIndex,
		endPointIndex: state.endPointIndex
	};
}

function clearEmptySimulatorPersistedState(state: unknown): void {
	if (!state || typeof state !== 'object') return;

	const waypoints = (state as SimulatorPersistedState).waypoints;
	if (Array.isArray(waypoints) && !hasUsableSimulatorRoute(waypoints)) {
		clearSimulatorPersistedState();
	}
}

export function loadSimulatorPersistedState(): SimulatorPersistedState | null {
	const state = readJson<unknown>(SIMULATOR_STORAGE_KEY);
	if (!state) return null;

	if (!isSimulatorState(state)) {
		clearEmptySimulatorPersistedState(state);
		return null;
	}

	try {
		const waypoints = waypointsFromPlain(state.waypoints);
		if (!hasUsableSimulatorRoute(waypoints)) {
			clearSimulatorPersistedState();
			return null;
		}

		return state;
	} catch (error) {
		console.warn('Ignoring invalid simulator persisted state', error);
		clearSimulatorPersistedState();
		return null;
	}
}

export function saveSimulatorPersistedState(state: SimulatorPersistedState): boolean {
	if (!hasUsableSimulatorRoute(state.waypoints)) {
		clearSimulatorPersistedState();
		return false;
	}

	try {
		waypointsFromPlain(state.waypoints);
	} catch (error) {
		console.warn('Refusing to save invalid simulator state', error);
		return false;
	}

	return writeJson(SIMULATOR_STORAGE_KEY, state);
}

export function clearSimulatorPersistedState(): void {
	removeKey(SIMULATOR_STORAGE_KEY);
}
