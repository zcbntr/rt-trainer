<script lang="ts">
	import DoubleFrequencyDial from './DoubleFrequencyDial.svelte';
	import Dial from './ModeDial.svelte';
	import RadioDisplay from './RadioDisplay.svelte';
	import TransmitButton from './TransmitButton.svelte';
	import { RadioStateStore } from '$lib/stores';
	import { get } from 'svelte/store';

	const RadioDialModes: ArrayMaxLength7MinLength2 = ['OFF', 'SBY'];
	type ArrayMaxLength7MinLength2 = readonly [
		string,
		string,
		string?,
		string?,
		string?,
		string?,
		string?
	];

	let transmitting = $state(false);

	const radioPowered = $derived($RadioStateStore.dialMode !== 'OFF');

	function parseFrequency(value: string): number {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function formatFrequency(value: number): string {
		return value.toFixed(3);
	}

	const handleCOMButtonClick = () => {
		const { dialMode, mode } = get(RadioStateStore);
		if (dialMode !== 'OFF' && mode !== 'COM') {
			RadioStateStore.update((state) => ({ ...state, mode: 'COM' }));
		}
	};

	const handleNAVButtonClick = () => {
		const { dialMode, mode } = get(RadioStateStore);
		if (dialMode !== 'OFF' && mode !== 'NAV') {
			RadioStateStore.update((state) => ({ ...state, mode: 'NAV' }));
		}
	};

	const handleSWAPButtonClick = () => {
		if (get(RadioStateStore).dialMode === 'OFF') return;

		RadioStateStore.update((state) => ({
			...state,
			activeFrequency: state.standbyFrequency,
			standbyFrequency: state.activeFrequency
		}));
	};

	function onDialModeChange(newDialModeIndex: number) {
		const isOff = newDialModeIndex === 0;

		RadioStateStore.update((state) => ({
			...state,
			dialMode: isOff ? 'OFF' : 'SBY',
			...(!isOff && state.mode === 'OFF' ? { mode: 'COM' as const } : {})
		}));
	}

	function adjustStandbyFrequency(delta: number) {
		const current = parseFrequency(get(RadioStateStore).standbyFrequency);
		RadioStateStore.update((state) => ({
			...state,
			standbyFrequency: formatFrequency(current + delta)
		}));
	}

	function onRadioFrequencyIncreaseLarge() {
		adjustStandbyFrequency(1);
	}

	function onRadioFrequencyReduceLarge() {
		adjustStandbyFrequency(-1);
	}

	function onRadioFrequencyIncreaseSmall() {
		const current = parseFrequency(get(RadioStateStore).standbyFrequency);
		const next = parseFloat((current + 0.005).toPrecision(6));
		RadioStateStore.update((state) => ({
			...state,
			standbyFrequency: formatFrequency(next)
		}));
	}

	function onRadioFrequencyReduceSmall() {
		const current = parseFrequency(get(RadioStateStore).standbyFrequency);
		const next = parseFloat((current - 0.005).toPrecision(6));
		RadioStateStore.update((state) => ({
			...state,
			standbyFrequency: formatFrequency(next)
		}));
	}
</script>

<div
	class="flex max-w-screen-lg grow flex-row flex-wrap place-content-evenly gap-2 card bg-neutral-600 p-3 text-white"
>
	<Dial
		Modes={RadioDialModes}
		CurrentModeIndex={0}
		id="radio-mode-dial"
		modeChange={onDialModeChange}
	/>

	<div class="flex flex-col place-content-end gap-1">
		<div class="flex flex-row place-content-center">
			<TransmitButton enabled={radioPowered} {transmitting} />
		</div>
		<div class="flex flex-row place-content-center">Transmit</div>
	</div>

	<div class="display-panel order-first flex w-full grow flex-col sm:order-2">
		<div class="flex grow flex-row place-content-evenly">
			<div>ACTIVE</div>
			<div>STANDBY</div>
		</div>
		<RadioDisplay
			DisplayOn={radioPowered}
			mode={$RadioStateStore.mode}
			activeFrequency={parseFrequency($RadioStateStore.activeFrequency)}
			standbyFrequency={parseFrequency($RadioStateStore.standbyFrequency)}
			tertiaryFrequency={parseFrequency($RadioStateStore.tertiaryFrequency)}
		/>
		<div class="display-buttons-container flex grow flex-row place-content-center">
			<button
				class="button"
				class:active-button={radioPowered && $RadioStateStore.mode === 'COM'}
				onclick={handleCOMButtonClick}>COM</button
			>
			<button class="button" onclick={handleSWAPButtonClick}>⇆</button>
			<button
				class="button"
				class:active-button={radioPowered && $RadioStateStore.mode === 'NAV'}
				onclick={handleNAVButtonClick}>NAV</button
			>
		</div>
	</div>
	<div class="order-5 mx-2 flex flex-row">
		<DoubleFrequencyDial
			DialEnabled={radioPowered}
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

	:global(.active-button) {
		background-color: #afa548;
		color: black;
	}
</style>
