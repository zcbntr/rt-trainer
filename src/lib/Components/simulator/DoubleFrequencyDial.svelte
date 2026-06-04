<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		class?: string;
		DialEnabled?: boolean;
		id?: string;
	}

	let { class: className = '', DialEnabled = false, id = '' }: Props = $props();

	let intervalId: ReturnType<typeof setInterval> | undefined;
	const defaultIntervalDuration = 200;
	const minIntervalDuration = 20;
	const intervalStep = 10;
	let intervalDuration = $state(defaultIntervalDuration);

	const outerEnabledClass = $derived(DialEnabled ? 'enabled' : '');

	$effect(() => {
		if (!DialEnabled) {
			clearInterval(intervalId);
		}
	});

	const dispatch = createEventDispatcher();

	const onDialOuterAntiClockwiseTurn = () => {
		dispatch('dialOuterAntiClockwiseTurn');
	};

	const onDialOuterClockwiseTurn = () => {
		dispatch('dialOuterClockwiseTurn');
	};

	const onDialInnerAntiClockwiseTurn = () => {
		dispatch('dialInnerAntiClockwiseTurn');
	};

	const onDialInnerClockwiseTurn = () => {
		dispatch('dialInnerClockwiseTurn');
	};

	function startIncrementingInnerAntiClockwiseHold() {
		onDialInnerAntiClockwiseTurn();
		intervalId = setInterval(() => {
			onDialInnerAntiClockwiseTurn();
			updateIntervalDuration(startIncrementingInnerAntiClockwiseHold);
		}, intervalDuration);
	}

	function stopIncrementingInnerAntiClockwiseHold() {
		clearInterval(intervalId);
		intervalDuration = defaultIntervalDuration;
	}

	function startIncrementingInnerClockwiseHold() {
		onDialInnerClockwiseTurn();
		intervalId = setInterval(() => {
			onDialInnerClockwiseTurn();
			updateIntervalDuration(startIncrementingInnerClockwiseHold);
		}, intervalDuration);
	}

	function stopIncrementingInnerClockwiseHold() {
		clearInterval(intervalId);
		intervalDuration = defaultIntervalDuration;
	}

	function startIncrementingOuterAntiClockwiseHold() {
		onDialOuterAntiClockwiseTurn();
		intervalId = setInterval(() => {
			onDialOuterAntiClockwiseTurn();
			updateIntervalDuration(startIncrementingOuterAntiClockwiseHold);
		}, intervalDuration);
	}

	function stopIncrementingOuterAntiClockwiseHold() {
		clearInterval(intervalId);
		intervalDuration = defaultIntervalDuration;
	}

	function startIncrementingOuterClockwiseHold() {
		onDialOuterClockwiseTurn();
		intervalId = setInterval(() => {
			onDialOuterClockwiseTurn();
			updateIntervalDuration(startIncrementingOuterClockwiseHold);
		}, intervalDuration);
	}

	function stopIncrementingOuterClockwiseHold() {
		clearInterval(intervalId);
		intervalDuration = defaultIntervalDuration;
	}

	function updateIntervalDuration(incrementMethod: () => void) {
		if (intervalDuration > minIntervalDuration) {
			clearInterval(intervalId);
			intervalDuration -= intervalStep;
			incrementMethod();
		}
	}
</script>

<div {id} class="flex items-center justify-center {className}">
	<div id={'dial-container-' + id} class="relative">
		<div
			id={'frequency-center-div-' + id}
			class="absolute"
			style="top: 50%; left: 50%; position: absolute; margin: auto;"
		></div>
		<button
			id={'double-frequency-dial-outer-' + id}
			class="double-frequency-dial-outer flex {outerEnabledClass}"
			aria-label="Outer Dial"
		>
			<div class="absolute" style="left: 8px; top: 30%; width: 12px; pointer-events: none;">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2.97 9.43"
					><g opacity="0.25"
						><path
							data-name="rad jog left out line"
							d="M1.65 8.25A11.22 11.22 0 011.48.17"
							fill="none"
							stroke="#fff"
							stroke-miterlimit="10"
						/><path data-name="rad jog left out arrow" fill="#fff" d="M2.97 6.45v2.98H0" /></g
					></svg
				>
			</div>
			<div class="absolute" style="right: 8px; top: 30%; width: 12px; pointer-events: none;">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2.97 9.43"
					><g opacity="0.25"
						><path
							data-name="rad jog right out arrow"
							d="M1.54.17a11.25 11.25 0 01-.17 8.09"
							fill="none"
							stroke="#fff"
							stroke-miterlimit="10"
						/><path data-name="rad jog right out line" fill="#fff" d="M2.97 9.43H0V6.45" /></g
					></svg
				>
			</div>
			<div
				id={'click-container-' + id}
				class="absolute flex flex-row"
				style="top: 0px; left: 0px; width: 100%; height: 100%;"
			>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="relative"
					style="width: 50%;"
					aria-label="Outer Dial Anti-Clockwise"
					onmousedown={startIncrementingOuterAntiClockwiseHold}
					onmouseup={stopIncrementingOuterAntiClockwiseHold}
					onmouseleave={stopIncrementingOuterAntiClockwiseHold}
				></div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					style="width: 50%;"
					aria-label="Outer Dial Clockwise"
					onmousedown={startIncrementingOuterClockwiseHold}
					onmouseup={stopIncrementingOuterClockwiseHold}
					onmouseleave={stopIncrementingOuterClockwiseHold}
				></div>
			</div>
		</button>
		<button
			id={'double-frequency-dial-inner-' + id}
			class="double-frequency-dial-inner absolute flex"
			aria-label="Inner Dial"
		>
			<div class="absolute" style="left: 8px; top: 26%; width: 12px; pointer-events: none;">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2.7 5.92"
					><g opacity="0.25"
						><path
							data-name="rad jog left in line"
							d="M1.48 4.85a4.12 4.12 0 01-.81-2.46A4.06 4.06 0 011.26.26"
							fill="none"
							stroke="#fff"
							stroke-miterlimit="10"
						/><path data-name="rad jog left in arrow" fill="#fff" d="M2.7 3.23v2.69H0" /></g
					></svg
				>
			</div>
			<div class="absolute" style="right: 8px; top: 26%; width: 12px; pointer-events: none;">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2.7 5.92"
					><g opacity="0.25"
						><path
							data-name="rad jog right in line"
							d="M1.57.26a4.07 4.07 0 01.6 2.13 4.13 4.13 0 01-.82 2.46"
							fill="none"
							stroke="#fff"
							stroke-miterlimit="10"
						/><path data-name="rad jog right in line" fill="#fff" d="M2.7 5.92H0V3.23" /></g
					></svg
				>
			</div>
			<div class="absolute flex flex-row" style="top: 0px; left: 0px; width:100%; height:100%;">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="relative"
					style="width: 50%;"
					aria-label="Inner Dial Anti-Clockwise"
					onmousedown={startIncrementingInnerAntiClockwiseHold}
					onmouseup={stopIncrementingInnerAntiClockwiseHold}
					onmouseleave={stopIncrementingInnerAntiClockwiseHold}
				></div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="relative"
					style="width: 50%;"
					aria-label="Inner Dial Clockwise"
					onmousedown={startIncrementingInnerClockwiseHold}
					onmouseup={stopIncrementingInnerClockwiseHold}
					onmouseleave={stopIncrementingInnerClockwiseHold}
				></div>
			</div></button
		>
	</div>
</div>

<style>
	.double-frequency-dial-outer {
		width: 100px;
		height: 100px;
		border: 2px solid #fff;
		border-radius: 50%;
		transition: all 0.35s ease-in-out 0s;
		justify-content: center;
		display: flex;
	}

	.double-frequency-dial-inner {
		width: 50px;
		height: 50px;
		top: 25%;
		border: 2px solid #fff;
		border-radius: 50%;
		transition: all 0.35s ease-in-out 0s;
		justify-content: center;
		display: flex;
	}

	:global(.enabled) {
		box-shadow: rgb(255, 255, 255) 0px 0px 20px -5px;
	}
</style>
