<script lang="ts">
	import { CurrentScenarioPointIndexStore } from '$lib/stores';
	import type Scenario from '$lib/ts/Scenario';
	import { ListBox, ListBoxItem } from '@skeletonlabs/skeleton';
	import { MapPinOutline } from 'flowbite-svelte-icons';

	interface Props {
		scenario: Scenario;
	}

	let { scenario }: Props = $props();

	let selectedScenarioPointIndex: number = $state(0);

	function handleScenarioPointChange(event: MouseEvent) {
		const newPoint = parseInt((event.target as HTMLInputElement).value);
		CurrentScenarioPointIndexStore.set(newPoint);
		selectedScenarioPointIndex = newPoint;
	}
</script>

{#if scenario.scenarioPoints.length < 1}
	<div>No scenario points to show.</div>
{:else}
	<ListBox class="card max-h-64 overflow-auto">
		{#each scenario.scenarioPoints as scenarioPoint}
			<ListBoxItem
				bind:group={selectedScenarioPointIndex}
				name="scenarioPointId"
				value={scenarioPoint.index}
				on:click={handleScenarioPointChange}
			>
				{#snippet lead()}
					<span class="badge-icon p-4 variant-soft-secondary">
						<MapPinOutline />
					</span>
				{/snippet}
				<div class="flex flex-row gap-2">
					<div class="flex-col place-content-center">
						<dt class="font-bold">{scenarioPoint.stage}</dt>
					</div>
				</div>
			</ListBoxItem>
		{/each}
	</ListBox>
{/if}
