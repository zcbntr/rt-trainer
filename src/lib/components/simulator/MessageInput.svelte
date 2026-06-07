<script lang="ts">
	import {
		ExpectedUserMessageStore,
		LiveFeedbackStore,
		SpeechBufferStore,
		SpeechInputEnabledStore,
		UserMessageStore
	} from '$lib/stores';
	import { onMount } from 'svelte';
	import { Switch } from '@skeletonlabs/skeleton-svelte';
	import HoverTooltip from '$lib/components/HoverTooltip.svelte';
	import { dialog } from '$lib/components/singletons/dialog.svelte';

	interface Props {
		class?: string;
		speechRecognitionSupported?: boolean;
		submit?: () => void;
	}

	let {
		class: className = '',
		speechRecognitionSupported = false,
		submit: onSubmit = () => {}
	}: Props = $props();
	let mounted = $state(false);
	let message = $state('');

	$effect(() => {
		if (!mounted) return;
		const inputBox = document.getElementById('call-input') as HTMLTextAreaElement;
		if (inputBox?.value != null) {
			message = inputBox.value;
		}
	});

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
		onSubmit();
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
	class="flex min-h-72 max-w-lg grow grid-cols-1 flex-col gap-2 card rounded-md bg-neutral-600 p-1.5 text-white {className}"
>
	<div class="flex grow justify-self-stretch">
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

	<div class="flex flex-row flex-wrap place-content-evenly gap-x-1 pb-1 lg:flex-nowrap">
		<div class="flex flex-col py-2">
			<div class="flex flex-row place-content-start gap-2">
				<Switch
					checked={$LiveFeedbackStore}
					name="enable-live-feedback"
					ids={{ hiddenInput: 'enable-live-feedback' }}
					aria-label="Toggle live feedback"
					onCheckedChange={(e) => LiveFeedbackStore.set(e.checked)}
				>
					<Switch.Control>
						<Switch.Thumb />
					</Switch.Control>
					<Switch.HiddenInput />
				</Switch>
				<HoverTooltip label="Feedback">
					<p>Shows feedback immediately, instead of just at the end of the scenario.</p>
				</HoverTooltip>
			</div>
		</div>

		{#if speechRecognitionSupported}
			<div class="flex flex-col py-2">
				<div class="flex flex-row place-content-start gap-2">
					<Switch
						checked={$SpeechInputEnabledStore}
						name="enable-voice-input"
						ids={{ hiddenInput: 'enable-voice-input' }}
						aria-label="Toggle speech input"
						onCheckedChange={(e) => {
							SpeechInputEnabledStore.set(e.checked);
							if (e.checked) {
								dialog.trigger({
									type: 'alert',
									title: 'Speech input is enabled',
									body: 'Hold down the spacebar or click and hold the red button to record your message. Let go when you are done.'
								});
							}
						}}
					>
						<Switch.Control>
							<Switch.Thumb />
						</Switch.Control>
						<Switch.HiddenInput />
					</Switch>
					<HoverTooltip label="Voice Input">
						<p>Speech recognition is experimental, you may need to correct the recorded text.</p>
					</HoverTooltip>
				</div>
			</div>
		{:else}
			<div class="flex flex-col py-2">
				<div class="flex flex-row place-content-start gap-2">
					<Switch
						checked={$SpeechInputEnabledStore}
						name="enable-voice-input"
						ids={{ hiddenInput: 'enable-voice-input' }}
						disabled
						aria-label="Toggle speech input"
					>
						<Switch.Control>
							<Switch.Thumb />
						</Switch.Control>
						<Switch.HiddenInput />
					</Switch>
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

		<button class="submit-button btn bg-surface-400 px-3" onclick={submit}>Submit</button>

		<button class="clear-button btn bg-surface-400" onclick={handleDelete}>Clear</button>
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
