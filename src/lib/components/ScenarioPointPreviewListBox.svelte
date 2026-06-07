<script lang="ts">
	import { CurrentScenarioPointIndexStore } from '$lib/stores';
	import type Scenario from '$lib/logic/Scenario';
	import { MapPinOutline } from 'flowbite-svelte-icons';
	import { Listbox, useListCollection } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		scenario: Scenario;
	}

	type ScenarioPointItem = {
		label: string;
		value: string;
	};

	let { scenario }: Props = $props();

	const items = $derived<ScenarioPointItem[]>(
		scenario.scenarioPoints.map((scenarioPoint) => ({
			label: scenarioPoint.stage,
			value: String(scenarioPoint.index)
		}))
	);

	const collection = $derived(
		useListCollection({
			items,
			itemToString: (item) => item.label,
			itemToValue: (item) => item.value
		})
	);

	function handleValueChange(details: { value: string[] }) {
		const index = Number.parseInt(details.value[0] ?? '0', 10);
		if (Number.isNaN(index)) return;
		CurrentScenarioPointIndexStore.set(index);
	}
</script>

{#if scenario.scenarioPoints.length < 1}
	<div>No scenario points to show.</div>
{:else}
	<Listbox
		class="max-h-64 overflow-auto card"
		{collection}
		value={[String($CurrentScenarioPointIndexStore)]}
		onValueChange={handleValueChange}
	>
		<Listbox.Content>
			{#each collection.items as item (item.value)}
				<Listbox.Item {item}>
					<span class="badge-icon preset-tonal-secondary p-4">
						<MapPinOutline />
					</span>
					<Listbox.ItemText>
						<span class="font-bold">{item.label}</span>
					</Listbox.ItemText>
					<Listbox.ItemIndicator />
				</Listbox.Item>
			{/each}
		</Listbox.Content>
	</Listbox>
{/if}
