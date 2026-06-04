<script lang="ts">
	import {
		ExpectedUserMessageStore,
		LiveFeedbackStore,
		SpeechBufferStore,
		SpeechInputEnabledStore,
		UserMessageStore
	} from '$lib/stores';
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { Switch } from '@skeletonlabs/skeleton-svelte';
	import HoverTooltip from '$lib/components/HoverTooltip.svelte';
	import { dialog } from '$lib/components/singletons/dialog.svelte';

	interface Props {
		class?: string;
		speechRecognitionSupported?: boolean;
	}

	let { class: className = '', speechRecognitionSupported = false }: Props = $props();
	let mounted = $state(false);
	let message = $state('');

	$effect(() => {
		if (!mounted) return;
		const inputBox = document.getElementById('call-input') as HTMLTextAreaElement;
		if (inputBox?.value != null) {
			message = inputBox.value;
		}
	});

	const dispatch = createEventDispatcher();

	const handleDelete = () => {
		resetBox();
	};

	const resetBox = () => {
		const inputBox = document.getElementById('call-input') as HTMLTextAreaElement;
		inputBox.value = '';
		message = '';
		UserMessageStore.set(message);
	};

	const submit = () => {
		const inputBox = document.getElementById('call-input') as HTMLTextAreaElement;
		message = inputBox.value;
		UserMessageStore.set(message);
		dispatch('submit');
	};

	function fillInputFromStore(value: string) {
		resetBox();
		const inputBox = document.getElementById('call-input') as HTMLTextAreaElement;
		if (inputBox) {
			inputBox.value = value;
		}
		message = value;
		UserMessageStore.set(value);
	}

	$effect(() => {
		const expected = $ExpectedUserMessageStore;
		if (expected !== '') {
			fillInputFromStore(expected);
			ExpectedUserMessageStore.set('');
		}
	});

	$effect(() => {
		const buffer = $SpeechBufferStore;
		if (buffer !== '') {
			fillInputFromStore(buffer);
			SpeechBufferStore.set('');
		}
	});

	onMount(() => {
		mounted = true;
	});
</script>

<div
	class="p-1.5 card rounded-md max-w-lg min-h-72 flex flex-col grid-cols-1 gap-2 bg-neutral-600 text-white grow {className}"
>
	<div class="grow flex justify-self-stretch">
		<textarea
			class="textarea bg-neutral-700"
			id="call-input"
			name="call-input"
			rows="4"
			cols="50"
			maxlength="200"
			placeholder="Enter your radio message here."
		>
		</textarea>
	</div>

	<div class="flex flex-row flex-wrap gap-x-1 pb-1 place-content-evenly lg:flex-nowrap">
		<div class="flex flex-col py-2">
			<div class="flex flex-row place-content-start gap-2">
				<Switch
					id="enable-live-feedback"
					name="slider-label"
					checked={$LiveFeedbackStore}
					active="bg-primary-500"
					size="sm"
					role="switch"
					aria-checked={$LiveFeedbackStore}
					aria-label="Toggle live feedback"
					on:click={() => {
						$LiveFeedbackStore = !$LiveFeedbackStore;
					}}
				/>
				<HoverTooltip label="Feedback">
					<p>Shows feedback immediately, instead of just at the end of the scenario.</p>
				</HoverTooltip>
			</div>
		</div>

		{#if speechRecognitionSupported}
			<div class="flex flex-col py-2">
				<div class="flex flex-row place-content-start gap-2">
					<Switch
						id="enable-voice-input"
						name="slider-label"
						checked={$SpeechInputEnabledStore}
						active="bg-primary-500"
						size="sm"
						role="switch"
						aria-checked={$SpeechInputEnabledStore}
						aria-label="Toggle speech input"
						on:click={() => {
							$SpeechInputEnabledStore = !$SpeechInputEnabledStore;
							if ($SpeechInputEnabledStore) {
								dialog.trigger({
									type: 'alert',
									title: 'Speech input is enabled',
									body: 'Hold down the spacebar or click and hold the red button to record your message. Let go when you are done.'
								});
							}
						}}
					/>
					<HoverTooltip label="Voice Input">
						<p>Speech recognition is experimental, you may need to correct the recorded text.</p>
					</HoverTooltip>
				</div>
			</div>
		{:else}
			<div class="flex flex-col py-2">
				<div class="flex flex-row place-content-start gap-2">
					<Switch
						id="enable-voice-input"
						name="slider-label"
						checked={$SpeechInputEnabledStore}
						active="bg-primary-500"
						size="sm"
						disabled
					/>
					<HoverTooltip label="Voice Input">
						<p>
							Speech recognition is not supported in this browser.<br />Please use a different
							browser if you would like to use this feature.<br />Google Chrome, Microsoft Edge and
							Safari are recommended.
						</p>
					</HoverTooltip>
				</div>
			</div>
		{/if}

		<button class="submit-button btn px-3 bg-surface-400" on:click={submit}>Submit</button>

		<button class="clear-button btn bg-surface-400" on:click={handleDelete}>Clear</button>
	</div>
</div>

<style>
	.textarea {
		resize: none;
		overflow: auto;
	}

	.btn {
		height: 40px;
	}
</style>
