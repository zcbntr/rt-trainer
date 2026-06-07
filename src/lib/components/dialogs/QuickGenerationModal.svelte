<script lang="ts">
	import {
		AllAirportsStore,
		AllAirspacesStore,
		DEFAULT_MAX_FLIGHT_LEVEL,
		fetchAirports,
		fetchAirspaces
	} from '$lib/stores';
	import { generateFRTOLRouteFromSeed } from '$lib/logic/RouteGeneration';
	import { loadRouteData } from '$lib/logic/scenarioRoute';
	import { init } from '@paralleldrive/cuid2';
	import { get } from 'svelte/store';
	import { resolve } from '$app/paths';
	
	interface Props {
		parent: {
			regionFooter: string;
			buttonPositive: string;
		};
	}

	let { parent }: Props = $props();

	const shortCUID = init({ length: 8 });

	$effect(() => {
		if ($AllAirportsStore.length === 0) fetchAirports();
		if ($AllAirspacesStore.length === 0) fetchAirspaces();
	});

	const formData = $state({
		routeSeed: shortCUID(),
		scenarioSeed: shortCUID(),
		hasEmergencies: true
	});

	function onFormSubmit() {
		const routeData = generateFRTOLRouteFromSeed(
			formData.routeSeed,
			get(AllAirportsStore),
			get(AllAirspacesStore),
			DEFAULT_MAX_FLIGHT_LEVEL
		);
		if (routeData) {
			loadRouteData(routeData);
		} else {
			failedRouteSeed = formData.routeSeed;
		}
	}

	const cBase = 'card p-4 w-modal-slim shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold';
	const cForm = 'space-y-4 rounded-container';

	let failedRouteSeed = $state<string | null>(null);
	let validSettings = $derived(
		formData.scenarioSeed.length > 0 &&
			formData.routeSeed.length > 0 &&
			formData.routeSeed !== failedRouteSeed
	);
	let cRouteSeedInput = $derived(validSettings ? '' : 'input-error');
	let cRouteSeedInputErrorMessage = $derived(validSettings ? 'hidden' : '');
</script>

<div class={cBase} title="Quick Generation" aria-label="Quick Generation modal">
	<header class={cHeader} id="title">Quick Generation</header>
	<form class="modal-form {cForm}">
		<label class="label"
			><span class="text-sm">Route Seed (required)</span>
			<input
				class="input {cRouteSeedInput}"
				type="text"
				bind:value={formData.routeSeed}
				placeholder="My Route"
			/>
			<div class="text-sm text-red-500 {cRouteSeedInputErrorMessage}">
				Route generation failed, please try another seed.
			</div></label
		><label class="label"
			><span class="text-sm">Scenario Seed (required)</span>
			<input
				class="textarea"
				type="text"
				bind:value={formData.scenarioSeed}
				placeholder=""
			/></label
		><label class="label">
			<label class="flex items-center space-x-2">
				<input
					id="emergency-events-checkbox"
					class="checkbox"
					type="checkbox"
					checked={formData.hasEmergencies}
					onchange={() => (formData.hasEmergencies = !formData.hasEmergencies)}
				/>
				<p>Emergency Events</p>
			</label>
			<div class="text-sm text-slate-500">Engine failure, other aircraft in distress, etc...</div>
		</label>
	</form>
	<footer class="flex flex-row justify-between {parent.regionFooter}">
		<div class="flex flex-col place-content-center">
			<a href={resolve('/scenario-planner')} class="anchor">Scenario Planner</a>
		</div>
		<button
			class="btn text-sm {parent.buttonPositive}"
			disabled={!validSettings}
			onclick={onFormSubmit}>Submit</button
		>
	</footer>
</div>
