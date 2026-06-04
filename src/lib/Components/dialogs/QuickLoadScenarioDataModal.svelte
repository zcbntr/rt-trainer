<script lang="ts">
	import { init } from '@paralleldrive/cuid2';
	import { dialog } from '$lib/components/singletons/dialog.svelte';

	const shortCuid = init({ length: 8 });

	const formData = $state({
		scenarioSeed: shortCuid(),
		hasEmergencies: true
	});

	const cBase = 'w-full space-y-4';
	const cHeader = 'text-2xl font-bold';
	const cForm = 'space-y-4 rounded-container';

	function onSubmit(): void {
		dialog.close({
			scenarioSeed: formData.scenarioSeed,
			hasEmergencies: formData.hasEmergencies
		});
	}
</script>

<div class={cBase} aria-label="Load scenario data">
	<header class={cHeader}>Load Scenario</header>
	<p class="text-sm text-surface-600-400">
		No scenario seed was provided. Enter a seed to generate a practice scenario.
	</p>
	<form class="space-y-4 {cForm}" onsubmit={(e) => e.preventDefault()}>
		<label class="label">
			<span class="text-sm">Scenario Seed (required)</span>
			<input
				class="input"
				type="text"
				bind:value={formData.scenarioSeed}
				placeholder="My Scenario"
			/>
		</label>
		<label class="label">
			<span class="flex items-center gap-2">
				<input
					id="emergency-events-checkbox"
					class="checkbox"
					type="checkbox"
					checked={formData.hasEmergencies}
					onchange={() => (formData.hasEmergencies = !formData.hasEmergencies)}
				/>
				Emergency Events
			</span>
			<span class="text-sm text-surface-600-400"
				>Engine failure, other aircraft in distress, etc.</span
			>
		</label>
	</form>
	<footer class="flex justify-end gap-2">
		<button type="button" class="btn preset-tonal" onclick={() => dialog.dismiss()}>Cancel</button>
		<button
			type="button"
			class="btn preset-filled"
			disabled={!formData.scenarioSeed?.length}
			onclick={onSubmit}
		>
			Load
		</button>
	</footer>
</div>
