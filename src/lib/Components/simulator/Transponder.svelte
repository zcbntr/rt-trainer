<script lang="ts">
	import { onMount } from 'svelte';
	import FrequencyDial from './FrequencyDial.svelte';
	import Dial from './ModeDial.svelte';
	import TransponderDisplay from './TransponderDisplay.svelte';
	import { TransponderStateStore } from '$lib/stores';
	import { get } from 'svelte/store';

	const transponderDialModes: ArrayMaxLength7MinLength2 = [
		'OFF',
		'SBY',
		'GND',
		'ON',
		'ALT',
		'TEST'
	];

	type ArrayMaxLength7MinLength2 = readonly [
		string,
		string,
		string?,
		string?,
		string?,
		string?,
		string?
	];

	let dialModeIndex: number = $state(0);
	let displayOn: boolean = $state(false);
	let digitArr = $state([7, 0, 0, 0]);
	let frequency: string = $state('7000');
	let frequencyDialEnabled: boolean = $state(false);
	let displayDigitSelected: number = $state(0);
	let mounted: boolean = $state(false);

	// Click handlers
	const handleIDENTButtonClick = () => {
		if (get(TransponderStateStore).dialMode != 'OFF') {
			const IDENTModeButton = document.getElementById('button-ident') as HTMLInputElement;
			IDENTModeButton.classList.toggle('blink-continiously');
			TransponderStateStore.update((state) => ({
				...state,
				identEnabled: !state.identEnabled
			}));
		}
	};

	const handleVFRButtonClick = () => {
		if (get(TransponderStateStore).dialMode != 'OFF') {
			const VFRModeButton = document.getElementById('button-vfr') as HTMLInputElement;
			VFRModeButton.classList.toggle('blink-once');
			TransponderStateStore.update((state) => ({ ...state, identEnabled: true }));
		}
	};

	const handleENTERButtonClick = () => {
		if (displayOn) {
			if (displayDigitSelected < 3) {
				displayDigitSelected += 1;
			} else {
				displayDigitSelected = 0;
			}
		}
	};

	const handleBACKButtonClick = () => {
		if (displayOn) {
			if (displayDigitSelected > 0) {
				displayDigitSelected -= 1;
			} else {
				displayDigitSelected = 3;
			}
		}
	};

	function onTransponderDialModeChange(newModeIndex: number) {
		if (newModeIndex == 0) {
			if (get(TransponderStateStore).identEnabled) {
				const IDENTModeButton = document.getElementById('button-ident') as HTMLInputElement;
				IDENTModeButton.classList.remove('active-button');
			}
			displayOn = false;
			frequencyDialEnabled = false;
			TransponderStateStore.update((state) => ({
				...state,
				dialMode: 'OFF',
				identEnabled: false
			}));
		} else {
			const dialModes = ['OFF', 'SBY', 'GND', 'ON', 'ALT', 'TEST'] as const;
			displayOn = true;
			frequencyDialEnabled = true;
			TransponderStateStore.update((state) => ({
				...state,
				dialMode: dialModes[newModeIndex] ?? 'SBY'
			}));
		}
	}

	function onTransponderFrequencyIncrease() {
		if (digitArr[displayDigitSelected] == 7) {
			digitArr[displayDigitSelected] = 0;
		} else {
			digitArr[displayDigitSelected] += 1;
		}
	}

	function onTransponderFrequencyReduce() {
		if (digitArr[displayDigitSelected] == 0) {
			digitArr[displayDigitSelected] = 7;
		} else {
			digitArr[displayDigitSelected] -= 1;
		}
	}

	onMount(() => {
		mounted = true;
	});

	$effect(() => {
		if (mounted) {
			frequency = digitArr.join('');
			TransponderStateStore.update((state) => ({ ...state, frequency }));
		}
	});

	$effect(() => {
		onTransponderDialModeChange(dialModeIndex);
	});
</script>

<div
	class="flex max-w-5xl grow flex-row flex-wrap place-content-evenly gap-2 card bg-neutral-600 p-3 text-white"
>
	<Dial
		Modes={transponderDialModes}
		id="transponder-mode-dial"
		bind:CurrentModeIndex={dialModeIndex}
	/>

	<div class="display-panel order-first flex grow flex-col items-center justify-center sm:order-2">
		<TransponderDisplay
			DisplayOn={displayOn}
			mode={transponderDialModes[dialModeIndex]}
			{digitArr}
			DigitSelected={displayDigitSelected}
		/>
		<div class="flex flex-row items-center gap-2 pt-1">
			<button class="button" id="button-ident" onclick={handleIDENTButtonClick}>IDENT</button>
			<button class="button" id="button-vfr" onclick={handleVFRButtonClick}>VFR</button>
			<button class="button" id="button-enter" onclick={handleENTERButtonClick}>ENT</button>
			<button class="button" id="button-back" onclick={handleBACKButtonClick}>BACK</button>
		</div>
	</div>

	<div class="order-3 mx-4 flex flex-row">
		<FrequencyDial
			dialAntiClockwiseTurn={onTransponderFrequencyReduce}
			dialClockwiseTurn={onTransponderFrequencyIncrease}
			DialEnabled={frequencyDialEnabled}
			id="transponder-frequency-dial"
		/>
	</div>
</div>

<style>
	.display-panel {
		max-width: 600px;
		min-width: 200px;
	}

	.button {
		width: 50px;
	}

	/* Global flag required otherwise .active-button is unused at page load 
    and hence removed by the compiler */
	:global(.active-button) {
		background-color: rgb(175, 165, 72);
		color: black;
	}

	:global(.blink-continiouosly) {
		animation: blinker 2s linear infinite;
	}

	:global(.blink-once) {
		animation: blinker 2s linear 1;
	}

	@keyframes blinker {
		25% {
			background-color: rgb(175, 165, 72, 1);
		}
		50% {
			background-color: rgba(175, 165, 72, 0);
		}
		75% {
			background-color: rgba(175, 165, 72, 1);
		}
	}
</style>
