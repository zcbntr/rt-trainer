<script lang="ts">
	import {
		CurrentScenarioContextStore,
		MostRecentlyReceivedMessageStore,
		SpeechNoiseStore,
		SpeechOutputEnabledStore
	} from '$lib/stores';
	import { Switch } from '@skeletonlabs/skeleton-svelte';
	import HoverTooltip from '$lib/components/HoverTooltip.svelte';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	const currentContextDisplay = $derived(
		$CurrentScenarioContextStore === ''
			? 'Context for your current point in the scenario will appear here'
			: $CurrentScenarioContextStore
	);
</script>

<div
	class="p-1.5 card rounded-md max-w-lg min-h-72 flex flex-col grid-cols-1 gap-1 bg-neutral-600 text-white grow {className}"
>
	<div
		class="border-0 card bg-neutral-700 grow flex flex-col justify-self-stretch px-2 py-1.5 gap-2"
	>
		<div>{currentContextDisplay}</div>
		<div>{$MostRecentlyReceivedMessageStore}</div>
	</div>

	<div class="flex flex-row gap-x-1 flex-wrap">
		<div class="toggle px-2 shrink-0">
			<div class="flex flex-col py-2">
				<div class="flex flex-row place-content-start gap-2">
					<div class="flex flex-row place-content-start gap-2">
						<Switch
							id="enabled-audio-messages"
							name="slider-label"
							checked={$SpeechOutputEnabledStore}
							active="bg-primary-500"
							size="sm"
							role="switch"
							aria-checked={$SpeechOutputEnabledStore}
							aria-label="Toggle text-to-speech audio messages"
							onclick={() => {
								$SpeechOutputEnabledStore = !$SpeechOutputEnabledStore;
							}}
						/>
						<HoverTooltip label="Read Aloud Received Calls">
							<p>Audio messages read aloud when you receive a call from ATC or another aircraft.</p>
						</HoverTooltip>
					</div>
					<div class="flex flex-row place-content-start gap-2">
						<Switch
							id="enabled-audio-messages-noise"
							name="slider-label"
							active="bg-primary-500"
							size="sm"
							disabled={!$SpeechOutputEnabledStore}
							role="switch"
							aria-checked={$SpeechNoiseStore > 0}
							aria-label="Toggle interference noise"
							onclick={() => {
								$SpeechNoiseStore = $SpeechNoiseStore === 0 ? 0.1 : 0;
							}}
						/>
						<HoverTooltip label="Interference Noise">
							<p>
								Adds static noise to read out calls. <br />Requires Read Aloud Recieved Calls to be
								enabled.
							</p>
						</HoverTooltip>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.textarea {
		resize: none;
		overflow: hidden;
		height: auto;
		outline: none;
		border: none;
	}
</style>
