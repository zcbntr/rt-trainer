<script lang="ts">
	import { SpeechBufferStore, SpeechInputEnabledStore } from '$lib/stores';
	import { swapDigitsWithWords } from '$lib/logic/utils';

	interface Props {
		class?: string;
		enabled?: boolean;
		transmitting?: boolean;
	}

	let {
		class: className = '',
		enabled = false,
		transmitting = $bindable(false)
	}: Props = $props();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let recognition: any = $state(null);
	let isActive = $state(false);

	const transmitButtonClasses = $derived(
		isActive
			? 'enabled active'
			: $SpeechInputEnabledStore && enabled
				? 'enabled'
				: 'disabled'
	);

	$effect(() => {
		if ($SpeechInputEnabledStore) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const SpeechRecognitionType: any =
				(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
			const instance = new SpeechRecognitionType();
			instance.lang = 'en';
			instance.onresult = (event: any) => {
				let speechInput = event.results[0][0].transcript;
				console.log(`You said: ${speechInput}, Confidence: ${event.results[0][0].confidence}`);

				speechInput = swapDigitsWithWords(speechInput);

				SpeechBufferStore.set(speechInput);
			};
			recognition = instance;
		} else {
			recognition = null;
		}
	});

	const startTransmitting = () => {
		if ($SpeechInputEnabledStore && enabled && !transmitting) {
			isActive = true;
			transmitting = true;
			recognition?.start();
		}
	};

	const stopTransmitting = () => {
		if ($SpeechInputEnabledStore && enabled && transmitting) {
			isActive = false;
			transmitting = false;
			recognition?.stop();
		}
	};

	const handleTransmitMouseDown = () => {
		startTransmitting();
	};

	const handleTransmitMouseUp = () => {
		stopTransmitting();
	};

	const handleTransmitMouseLeave = () => {
		stopTransmitting();
	};

	function onKeyDown(e: KeyboardEvent) {
		if (e.keyCode === 32) {
			startTransmitting();
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		if (e.keyCode === 32) {
			stopTransmitting();
		}
	}

</script>

<div
	id="transmit-button"
	class="{className} {transmitButtonClasses} transmit-button rounded-full cursor-pointer"
	on:mousedown={handleTransmitMouseDown}
	on:keydown={handleTransmitMouseDown}
	on:mouseup={handleTransmitMouseUp}
	on:keyup={handleTransmitMouseUp}
	on:mouseleave={handleTransmitMouseLeave}
	aria-label="Transmit Button"
	tabindex="0"
	role="button"
></div>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />

<style>
	.transmit-button {
		width: 50px;
		height: 50px;
		background-color: rgba(80, 40, 40, 1);
	}

	:global(.transmit-button.enabled) {
		background-color: rgb(220, 65, 65, 0.5);
	}

	:global(.transmit-button.enabled.active) {
		background-color: rgb(220, 0, 0, 0.8);
	}
</style>
