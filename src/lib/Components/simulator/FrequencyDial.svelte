<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		class?: string;
		DialEnabled?: boolean;
		id?: string;
	}

	let { class: className = '', DialEnabled = false, id = '' }: Props = $props();
	let intervalId: ReturnType<typeof setInterval> | undefined;
	let intervalDuration: number = 250;

	const enabledClass = $derived(DialEnabled ? 'enabled' : 'disabled');

	$effect(() => {
		if (!DialEnabled) {
			clearInterval(intervalId);
		}
	});

	const dispatch = createEventDispatcher();

	const onDialAntiClockwiseTurn = () => {
		dispatch('dialAntiClockwiseTurn');
	};

	const onDialClockwiseTurn = () => {
		dispatch('dialClockwiseTurn');
	};

	function onAntiClockwiseTick() {
		onDialAntiClockwiseTurn();
		clearInterval(intervalId);
		intervalDuration = intervalDuration * 0.9 + 5;
		intervalId = setInterval(onAntiClockwiseTick, intervalDuration);
	}

	function startIncrementingAntiClockwiseHold() {
		intervalDuration = 250;
		onDialAntiClockwiseTurn();
		intervalId = setInterval(onAntiClockwiseTick, intervalDuration);
	}

	function stopIncrementingAntiClockwiseHold() {
		clearInterval(intervalId);
	}

	function onClockwiseTick() {
		onDialClockwiseTurn();
		clearInterval(intervalId);
		intervalDuration = intervalDuration * 0.9 + 5;
		intervalId = setInterval(onClockwiseTick, intervalDuration);
	}

	function startIncrementingClockwiseHold() {
		intervalDuration = 250;
		onDialClockwiseTurn();
		intervalId = setInterval(onClockwiseTick, intervalDuration);
	}

	function stopIncrementingClockwiseHold() {
		clearInterval(intervalId);
	}
</script>

<div class="flex flex-row {className}">
	<div id={'dial-and-frequency-container-' + id} class="flex flex-col place-content-center">
		<div id={'dial-container-' + id} class="relative">
			<div
				id={'frequency-center-div-' + id}
				class="absolute h-0 w-0"
				style="top: 50%; left: 50%; transform: rotate(0deg); position: absolute; margin: auto;"
			></div>
			<button
				id={'frequency-dial-' + id}
				class="frequency-dial flex h-20 w-20 rounded-full border-2 {enabledClass}"
			>
				<div style="position: absolute; left: 8px; top: 30%; width: 14px; pointer-events: none;">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2.7 6.25"
						><g opacity="0.25"
							><path
								data-name="X jog left line"
								d="M1.52 5.29A6.67 6.67 0 011.05.15"
								fill="none"
								stroke="#fff"
								stroke-miterlimit="10"
							/><path data-name="X jog left arrow" fill="#fff" d="M2.7 3.55v2.7H0" /></g
						></svg
					>
				</div>
				<div style="position: absolute; right: 8px; top: 30%; width: 14px; pointer-events: none;">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2.7 6.24"
						><g opacity="0.25"
							><path
								data-name="X jog right arrow"
								d="M1.82.15a6.62 6.62 0 01-.47 5.12"
								fill="none"
								stroke="#fff"
								stroke-miterlimit="10"
							/><path data-name="X jog right line" fill="#fff" d="M2.7 6.24H0v-2.7" /></g
						></svg
					>
				</div>
				<div
					class="absolute flex h-100 w-100 flex-row"
					style="top: 0px; left: 0px; width: 100%; height: 100%;"
				>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="z-3 h-100 w-100"
						style="width: 50%; height: 100%;"
						aria-label="Frequency dial anticlockwise turn"
						onmousedown={startIncrementingAntiClockwiseHold}
						onmouseup={stopIncrementingAntiClockwiseHold}
						onmouseleave={stopIncrementingAntiClockwiseHold}
					></div>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="z-3 h-100 w-100"
						style="width: 50%; height: 100%;"
						aria-label="Frequency dial clockwise turn"
						onmousedown={startIncrementingClockwiseHold}
						onmouseup={stopIncrementingClockwiseHold}
						onmouseleave={stopIncrementingClockwiseHold}
					></div>
				</div>

				<div class="center absolute h-10 w-0.5 bg-white"></div>
			</button>
		</div>
	</div>
</div>

<style>
	.frequency-dial {
		transition: all 0.35s ease-in-out 0s;
		justify-content: center;
		box-shadow: rgb(255, 255, 255) 0px 0px 20px -5px;
	}

	:global(.enabled) {
		box-shadow: rgb(255, 255, 255) 0px 0px 20px -5px;
	}
</style>
