<script lang="ts">
	import FrequencyDial from './FrequencyDial.svelte';
	import Dial from './ModeDial.svelte';
	import TransponderDisplay from './TransponderDisplay.svelte';
	import { TransponderStateStore } from '$lib/stores';
	import type { TransponderState } from '$lib/logic/SimulatorTypes';
	import { get } from 'svelte/store';

	const transponderDialModes = ['OFF', 'SBY', 'GND', 'ON', 'ALT', 'TEST'] as const;

	function dialIndexForMode(dialMode: string): number {
		const index = transponderDialModes.indexOf(dialMode as (typeof transponderDialModes)[number]);
		return index >= 0 ? index : 0;
	}

	function digitsForFrequency(frequency: string): number[] {
		return frequency
			.padStart(4, '0')
			.slice(-4)
			.split('')
			.map((digit) => Number.parseInt(digit, 10));
	}

	function applyTransponderUi(state: TransponderState): void {
		dialModeIndex = dialIndexForMode(state.dialMode);
		displayOn = state.dialMode !== 'OFF';
		digitArr = digitsForFrequency(state.frequency);
		frequencyDialEnabled = state.dialMode !== 'OFF';
	}

	const initialTransponderState = get(TransponderStateStore);
	let dialModeIndex = $state(dialIndexForMode(initialTransponderState.dialMode));
	let displayOn = $state(initialTransponderState.dialMode !== 'OFF');
	let digitArr = $state(digitsForFrequency(initialTransponderState.frequency));
	let frequencyDialEnabled = $state(initialTransponderState.dialMode !== 'OFF');
	let displayDigitSelected = $state(0);

	function syncFrequencyToStore(): void {
		const squawk = digitArr.join('');
		TransponderStateStore.update((state) => ({ ...state, frequency: squawk }));
	}

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

	function onTransponderDialModeChange(newModeIndex: number): void {
		const targetDialMode = transponderDialModes[newModeIndex] ?? 'SBY';

		if (newModeIndex == 0) {
			if (get(TransponderStateStore).identEnabled) {
				const IDENTModeButton = document.getElementById('button-ident') as HTMLInputElement;
				IDENTModeButton.classList.remove('active-button');
			}
			displayOn = false;
			frequencyDialEnabled = false;
			TransponderStateStore.set({
				dialMode: 'OFF',
				frequency: digitArr.join(''),
				identEnabled: false,
				vfrHasExecuted: get(TransponderStateStore).vfrHasExecuted
			});
			return;
		}

		displayOn = true;
		frequencyDialEnabled = true;
		TransponderStateStore.update((state) => ({
			...state,
			dialMode: targetDialMode
		}));
		syncFrequencyToStore();
	}

	function onTransponderFrequencyIncrease() {
		if (digitArr[displayDigitSelected] == 7) {
			digitArr[displayDigitSelected] = 0;
		} else {
			digitArr[displayDigitSelected] += 1;
		}
		syncFrequencyToStore();
	}

	function onTransponderFrequencyReduce() {
		if (digitArr[displayDigitSelected] == 0) {
			digitArr[displayDigitSelected] = 7;
		} else {
			digitArr[displayDigitSelected] -= 1;
		}
		syncFrequencyToStore();
	}

	$effect(() => {
		applyTransponderUi($TransponderStateStore);
	});
</script>

<div
	class="flex max-w-5xl grow flex-row flex-wrap place-content-evenly gap-2 card bg-neutral-600 p-3 text-white"
>
	<Dial
		Modes={transponderDialModes}
		id="transponder-mode-dial"
		bind:CurrentModeIndex={dialModeIndex}
		modeChange={onTransponderDialModeChange}
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
