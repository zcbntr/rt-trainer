<script lang="ts">
	import { run } from 'svelte/legacy';

	import DoubleFrequencyDial from './DoubleFrequencyDial.svelte';
	import Dial from './ModeDial.svelte';
	import RadioDisplay from './RadioDisplay.svelte';
	import TransmitButton from './TransmitButton.svelte';
	import { RadioStateStore } from '$lib/stores';
	import { get } from 'svelte/store';

	var RadioDialModes: ArrayMaxLength7MinLength2 = ['OFF', 'SBY'];
	type ArrayMaxLength7MinLength2 = readonly [
		string,
		string,
		string?,
		string?,
		string?,
		string?,
		string?
	];

	let activeFrequency: number = $state(121.8);
	let standbyFrequency: number = $state(129.8);
	let tertiaryFrequency: number = $state(177.2);

	let displayOn: boolean = $state(false);
	let frequencyDialEnabled: boolean = $state(false);
	let transmitButtonEnabled: boolean = $state(false);
	let transmitting: boolean = false;

	const handleCOMButtonClick = () => {
		const radioState = get(RadioStateStore);
		if (radioState.dialMode != 'OFF') {
			const COMModeButton = document.getElementById('button-com') as HTMLInputElement;
			if (COMModeButton != null) {
				if (radioState.mode != 'COM') {
					if (radioState.mode === 'NAV') {
						const NAVModeButton = document.getElementById('button-nav') as HTMLInputElement;
						NAVModeButton.classList.remove('active-button');
					}
					RadioStateStore.update((state) => ({ ...state, mode: 'COM' }));
					COMModeButton.classList.add('active-button');
				}
			}
		}
	};

	const handleNAVButtonClick = () => {
		const radioState = get(RadioStateStore);
		if (radioState.dialMode != 'OFF') {
			const NAVModeButton = document.getElementById('button-nav') as HTMLInputElement;
			if (NAVModeButton != null) {
				if (radioState.mode != 'NAV') {
					if (radioState.mode === 'COM') {
						const COMModeButton = document.getElementById('button-com') as HTMLInputElement;
						COMModeButton.classList.remove('active-button');
					}
					RadioStateStore.update((state) => ({ ...state, mode: 'NAV' }));
					NAVModeButton.classList.add('active-button');
				}
			}
		}
	};

	const handleSWAPButtonClick = () => {
		if (get(RadioStateStore).dialMode != 'OFF') {
			let tempFrequency: number = activeFrequency;
			activeFrequency = standbyFrequency;
			standbyFrequency = tempFrequency;

			RadioStateStore.update((state) => ({
				...state,
				activeFrequency: activeFrequency.toFixed(3),
				standbyFrequency: standbyFrequency.toFixed(3)
			}));
		}
	};

	function onDialModeChange(newDialModeIndex: number) {
		const radioState = get(RadioStateStore);
		if (newDialModeIndex == 0) {
			if (radioState.mode === 'COM') {
				const COMModeButton = document.getElementById('button-com') as HTMLInputElement;
				COMModeButton.classList.remove('active-button');
			} else if (radioState.mode === 'NAV') {
				const NAVModeButton = document.getElementById('button-nav') as HTMLInputElement;
				NAVModeButton.classList.remove('active-button');
				RadioStateStore.update((state) => ({ ...state, mode: 'COM' }));
			}
			displayOn = false;
			frequencyDialEnabled = false;
			transmitButtonEnabled = false;
		} else {
			const COMModeButton = document.getElementById('button-com') as HTMLInputElement;
			COMModeButton.classList.add('active-button');
			displayOn = true;
			frequencyDialEnabled = true;
			transmitButtonEnabled = true;
		}

		RadioStateStore.update((state) => ({
			...state,
			dialMode: newDialModeIndex == 0 ? 'OFF' : 'SBY'
		}));
	}

	function onRadioFrequencyIncreaseLarge() {
		standbyFrequency += 1;
		RadioStateStore.update((state) => ({
			...state,
			standbyFrequency: standbyFrequency.toFixed(3)
		}));
	}

	function onRadioFrequencyReduceLarge() {
		standbyFrequency -= 1;
		RadioStateStore.update((state) => ({
			...state,
			standbyFrequency: standbyFrequency.toFixed(3)
		}));
	}

	function onRadioFrequencyIncreaseSmall() {
		standbyFrequency = parseFloat((standbyFrequency + 0.005).toPrecision(6));
		RadioStateStore.update((state) => ({
			...state,
			standbyFrequency: standbyFrequency.toFixed(3)
		}));
	}

	function onRadioFrequencyReduceSmall() {
		standbyFrequency = parseFloat((standbyFrequency - 0.005).toPrecision(6));
		RadioStateStore.update((state) => ({
			...state,
			standbyFrequency: standbyFrequency.toFixed(3)
		}));
	}
</script>

<div
	class="flex flex-row card gap-2 bg-neutral-600 text-white grow place-content-evenly p-3 max-w-screen-lg flex-wrap"
>
	<Dial
		Modes={RadioDialModes}
		CurrentModeIndex={0}
		id="radio-mode-dial"
		modeChange={onDialModeChange}
	/>

	<div class="flex flex-col place-content-end gap-1">
		<div class="flex flex-row place-content-center">
			<TransmitButton enabled={transmitButtonEnabled} {transmitting} />
		</div>
		<div class="flex flex-row place-content-center">Transmit</div>
	</div>

	<div class="display-panel flex flex-col w-full grow order-first sm:order-2">
		<div class="flex flex-row place-content-evenly grow">
			<div>ACTIVE</div>
			<div>STANDBY</div>
		</div>
		<RadioDisplay
			DisplayOn={displayOn}
			mode={$RadioStateStore.mode}
			bind:activeFrequency
			bind:standbyFrequency
			bind:tertiaryFrequency
		/>
		<div class="display-buttons-container flex flex-row grow place-content-center">
			<button class="button" id="button-com" onclick={handleCOMButtonClick}>COM</button>
			<button class="button" id="button-swap" onclick={handleSWAPButtonClick}>⇆</button>
			<button class="button" id="button-nav" onclick={handleNAVButtonClick}>NAV</button>
		</div>
	</div>
	<div class="flex flex-row mx-2 order-5">
		<DoubleFrequencyDial
			DialEnabled={frequencyDialEnabled}
			id="radio-frequency-dial"
			dialInnerAntiClockwiseTurn={onRadioFrequencyReduceSmall}
			dialInnerClockwiseTurn={onRadioFrequencyIncreaseSmall}
			dialOuterAntiClockwiseTurn={onRadioFrequencyReduceLarge}
			dialOuterClockwiseTurn={onRadioFrequencyIncreaseLarge}
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
		background-color: #afa548;
		color: black;
	}
</style>
