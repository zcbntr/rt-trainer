<script lang="ts">
	import { run } from 'svelte/legacy';

	import { Accordion, Popover, SegmentedControl } from '@skeletonlabs/skeleton-svelte';
	import { init } from '@paralleldrive/cuid2';
	import {
		RefreshOutline,
		WandMagicSparklesOutline,
		DotsHorizontalOutline
	} from 'flowbite-svelte-icons';
	import {
		AllAirportsStore,
		AllAirspacesStore,
		AwaitingServerResponseStore,
		ClearSimulationStores,
		HasEmergencyEventsStore,
		maxFlightLevelStore,
		RouteDistanceDisplayUnitStore,
		ScenarioSeedStore,
		WaypointsStore
	} from '$lib/stores';
	import { resolve } from '$app/paths';
	import type Waypoint from '$lib/logic/aeronautics/Waypoint';
	import { flip } from 'svelte/animate';
	import { loadRouteData } from '$lib/logic/scenarioRoute';
	import { generateFRTOLRouteFromSeed } from '$lib/logic/RouteGeneration';
	import type Airport from '$lib/logic/aeronautics/Airport';
	import type Airspace from '$lib/logic/aeronautics/Airspace';
	import { SvelteSet } from 'svelte/reactivity';

	ClearSimulationStores();

	// Random seed generation function
	const shortCUID = init({ length: 8 });

	// Scenario data
	let scenarioSeed: string = $state(shortCUID());
	ScenarioSeedStore.set(scenarioSeed); // Set initial value
	let hasEmergencyEvents: boolean = $state(true);
	HasEmergencyEventsStore.set(hasEmergencyEvents); // Set initial value

	// Route data
	let routeSeed: string = $state(''); // Only used for seeding the route generator
	let waypoints: Waypoint[] = $state([]); // Stores all the waypoints in the route

	// Aeronautical data
	let airports: Airport[] = [];
	let airspaces: Airspace[] = [];

	// Route preferences
	let distanceUnit: string = $state('Nautical Miles');
	let maxFL: number = $state(30);

	// Blocking new inputs during route generation
	let awaitingServerResponse: boolean = $state(false);
	AwaitingServerResponseStore.subscribe((value) => {
		awaitingServerResponse = value;
	});

	WaypointsStore.subscribe((value) => {
		waypoints = value;
	});

	AllAirportsStore.subscribe((value) => {
		airports = value;
	});

	AllAirspacesStore.subscribe((value) => {
		airspaces = value;
	});

	let distanceUnitValue = $state<string | null>('Nautical Miles');

	async function loadSeededRoute() {
		AwaitingServerResponseStore.set(true);
		const routeData = await generateFRTOLRouteFromSeed(routeSeed, airports, airspaces, maxFL);
		if (routeData) loadRouteData(routeData);
		AwaitingServerResponseStore.set(false);
	}

	const dragDuration: number = 200;
	let draggingWaypoint: Waypoint | undefined = $state(undefined);
	let animatingWaypoints = new SvelteSet<Waypoint>([]);

	function swapWith(waypoint: Waypoint): void {
		if (draggingWaypoint === waypoint || animatingWaypoints.has(waypoint)) return;
		animatingWaypoints.add(waypoint);
		setTimeout((): boolean => animatingWaypoints.delete(waypoint), dragDuration);
		const cardAIndex = waypoints.indexOf(draggingWaypoint);
		const cardBIndex = waypoints.indexOf(waypoint);
		waypoints[cardAIndex] = waypoint;
		waypoints[cardBIndex] = draggingWaypoint;
		waypoints.forEach((waypoint, index) => {
			waypoint.index = index;
		});
		WaypointsStore.set(waypoints);
	}
	run(() => {
		if (routeSeed !== '') {
			loadSeededRoute();
		}
	});
	run(() => {
		ScenarioSeedStore.set(scenarioSeed);
	});
	run(() => {
		HasEmergencyEventsStore.set(hasEmergencyEvents);
	});
	run(() => {
		RouteDistanceDisplayUnitStore.set(distanceUnit);
	});
	run(() => {
		maxFL = Math.max(15, maxFL);
		maxFlightLevelStore.set(maxFL);
	});
</script>

<div class="sidebar-container flex grow flex-col overflow-clip py-0">
	<div class="sticky top-0 z-50 flex flex-col bg-surface-100 p-3 dark:bg-surface-900">
		<strong><a href={resolve('/')} class="btn text-xl uppercase sm:text-2xl">RT Trainer</a></strong>

		<ol class="flex flex-row gap-2 pb-2 pl-3.5 font-light">
			<li class="">Scenario Planner</li>
		</ol>

		<hr />
	</div>

	<div class="overflow-auto px-3 pb-2">
		<div class="flex flex-col gap-2 px-2">
			<div><strong>Route Waypoints</strong></div>
			{#if waypoints.length == 0}
				<div class="px-1">
					<p class="text-sm text-slate-600 dark:text-slate-400">
						Add a waypoint by clicking on an airport or any other spot on the map. Or use the <b
							>Auto-generate</b
						> Tool below.
					</p>
				</div>
			{/if}
			<!-- for some reason the key (waypoint.index) has duplicates when coming from the route generator -->
			{#each waypoints as waypoint (waypoint.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="flex flex-row place-content-center gap-2 card p-2"
					draggable="true"
					animate:flip={{ duration: dragDuration }}
					ondragstart={() => {
						draggingWaypoint = waypoint;
					}}
					ondragend={() => {
						draggingWaypoint = undefined;
					}}
					ondragenter={() => {
						swapWith(waypoint);
					}}
					ondragover={(e) => {
						e.preventDefault();
					}}
				>
					<div class="flex flex-col place-content-center">
						{#if waypoint.index == 0}
							🛩️{:else if waypoint.index == waypoints.length - 1}🏁{:else}🚩{/if}
					</div>
					<div class="flex flex-col place-content-center">
						<textarea class="textarea" rows="1" placeholder={waypoint.name}></textarea>
					</div>
					<Popover>
						<Popover.Trigger class="flex flex-col place-content-center">
							<DotsHorizontalOutline />
						</Popover.Trigger>
						<Popover.Positioner>
							<Popover.Content class="z-50 w-auto card p-4 shadow-xl">
								<button
									onclick={() => {
										WaypointsStore.update((waypoints) => {
											waypoints = waypoints.filter((w) => w.id !== waypoint.id);
											waypoints.forEach((waypoint, index) => {
												waypoint.index = index;
											});
											return waypoints;
										});
									}}>Delete</button
								>
							</Popover.Content>
						</Popover.Positioner>
					</Popover>
				</div>
			{/each}
		</div>

		<div class="flex flex-col gap-2 p-2">
			<div>
				<strong>Scenario Settings</strong>
			</div>
			<div class="flex flex-col gap-1">
				<div class="label text-sm">Scenario Seed</div>
				<div class="flex flex-row gap-2">
					<textarea
						id="scenario-seed-input"
						class="textarea"
						rows="1"
						maxlength="20"
						placeholder="Enter a seed"
						bind:value={scenarioSeed}
					></textarea>
					<button
						type="button"
						class="btn w-10 preset-filled"
						onclick={() => {
							if (awaitingServerResponse) return;

							scenarioSeed = shortCUID();

							const element = document.getElementById('scenario-seed-input');
							if (element) {
								element.value = routeSeed;
							}
						}}><RefreshOutline /></button
					>
				</div>
			</div>

			<label class="flex items-center space-x-2">
				<input
					id="emergency-events-checkbox"
					class="checkbox"
					type="checkbox"
					checked
					onchange={() => (hasEmergencyEvents = !hasEmergencyEvents)}
				/>
				<p>Emergency Events</p>
			</label>
		</div>

		<div class="flex flex-col gap-2 p-2">
			<div>
				<strong>Preferences</strong>
			</div>
			<div>
				<div class="flex flex-col gap-1">
					<SegmentedControl
						defaultValue="Nautical Miles"
						{distanceUnitValue}
						onValueChange={(details) => (distanceUnitValue = details.value)}
					>
						<SegmentedControl.Label class="text-sm">Distance Units</SegmentedControl.Label>
						<SegmentedControl.Control>
							<SegmentedControl.Indicator />
							<SegmentedControl.Item value="Nautical Miles">
								<SegmentedControl.ItemText>nm</SegmentedControl.ItemText>
								<SegmentedControl.ItemHiddenInput />
							</SegmentedControl.Item>
							<SegmentedControl.Item value="Miles">
								<SegmentedControl.ItemText>mi</SegmentedControl.ItemText>
								<SegmentedControl.ItemHiddenInput />
							</SegmentedControl.Item>
							<SegmentedControl.Item value="Kilometers">
								<SegmentedControl.ItemText>km</SegmentedControl.ItemText>
								<SegmentedControl.ItemHiddenInput />
							</SegmentedControl.Item>
						</SegmentedControl.Control>
					</SegmentedControl>
				</div>
			</div>

			<div class="flex flex-col gap-1">
				<div class="label text-sm">Maximum Flight Level (100 ft)</div>
				<textarea id="fl-input" class="textarea" rows="1" maxlength="4" bind:value={maxFL}
				></textarea>
			</div>
		</div>

		<div class="flex flex-col gap-2 p-2">
			<div>
				<strong>Tools</strong>
			</div>

			<Accordion multiple>
				<Accordion.Item value="auto-generate-route">
					<h3>
						<Accordion.ItemTrigger class="flex items-center justify-between gap-2 font-bold">
							Auto-generate Route
							<Accordion.ItemIndicator class="group">
								<WandMagicSparklesOutline />
							</Accordion.ItemIndicator>
						</Accordion.ItemTrigger>
					</h3>
					<Accordion.ItemContent>
						<div class="flex flex-col gap-2">
							<div class="label">Route Seed</div>
							<div class="flex flex-row gap-2">
								<textarea
									id="route-seed-input"
									class="textarea"
									rows="1"
									maxlength="20"
									placeholder="Enter a seed"
									bind:value={routeSeed}
								></textarea>
								<button
									type="button"
									class="btn w-10 preset-filled"
									onclick={() => {
										if (awaitingServerResponse) return;

										routeSeed = shortCUID();

										const element = document.getElementById('route-seed-input');
										if (element) {
											element.value = routeSeed;
										}
									}}><RefreshOutline /></button
								>
							</div>
						</div>
					</Accordion.ItemContent>
				</Accordion.Item>
			</Accordion>
		</div>
	</div>
</div>

<style>
	textarea {
		resize: none;
	}
</style>
