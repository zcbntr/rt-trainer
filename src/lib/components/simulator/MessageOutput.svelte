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
	class="flex min-h-72 max-w-lg grow grid-cols-1 flex-col gap-1 card rounded-md bg-neutral-600 p-1.5 text-white {className}"
>
	<div
		class="flex grow flex-col gap-2 justify-self-stretch card border-0 bg-neutral-700 px-2 py-1.5"
	>
		<div>{currentContextDisplay}</div>
		<div>{$MostRecentlyReceivedMessageStore}</div>
	</div>

	<div class="flex flex-row flex-wrap gap-x-1">
		<div class="toggle shrink-0 px-2">
			<div class="flex flex-col py-2">
				<div class="flex flex-row place-content-start gap-2">
					<div class="flex flex-row place-content-start gap-2">
						<Switch
							checked={$SpeechOutputEnabledStore}
							name="enabled-audio-messages"
							ids={{ hiddenInput: 'enabled-audio-messages' }}
							aria-label="Toggle text-to-speech audio messages"
							onCheckedChange={(e) => SpeechOutputEnabledStore.set(e.checked)}
						>
							<Switch.Control>
								<Switch.Thumb />
							</Switch.Control>
							<Switch.HiddenInput />
						</Switch>
						<HoverTooltip label="Read Aloud Received Calls">
							<p>Audio messages read aloud when you receive a call from ATC or another aircraft.</p>
						</HoverTooltip>
					</div>
					<div class="flex flex-row place-content-start gap-2">
						<Switch
							checked={$SpeechNoiseStore > 0}
							name="enabled-audio-messages-noise"
							ids={{ hiddenInput: 'enabled-audio-messages-noise' }}
							disabled={!$SpeechOutputEnabledStore}
							aria-label="Toggle interference noise"
							onCheckedChange={(e) => SpeechNoiseStore.set(e.checked ? 0.1 : 0)}
						>
							<Switch.Control>
								<Switch.Thumb />
							</Switch.Control>
							<Switch.HiddenInput />
						</Switch>
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
