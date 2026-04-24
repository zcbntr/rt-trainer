<script lang="ts">
	import { run } from 'svelte/legacy';

	import { onMount } from 'svelte';

	interface Props {
		DisplayOn?: boolean;
		mode?: string;
		DigitSelected?: number;
		digitArr?: any;
	}

	let {
		DisplayOn = false,
		mode = 'OFF',
		DigitSelected = $bindable(0),
		digitArr = [0, 0, 0, 0]
	}: Props = $props();

	let mounted: boolean = $state(false);

	let showDisplayText = $derived(DisplayOn ? 'displayon' : 'displayoff');
	run(() => {
		if (!DisplayOn) {
			DigitSelected = 0;
		}
	});
	run(() => {
		if (mounted) {
			let oldSelectedDigit = document.querySelector('.tselected');
			if (oldSelectedDigit != null) {
				oldSelectedDigit.classList.remove('tselected');
			}
			let NewSelectedDigit = document.getElementById('tdigit-' + DigitSelected) as HTMLDivElement;
			if (NewSelectedDigit != null) {
				NewSelectedDigit.classList.add('tselected');
			}
		}
	});

	onMount(() => {
		mounted = true;
	});
</script>

<div
	class="transponder-segdisplay {showDisplayText} card flex flex-row nowrap items-center place-content-between"
>
	<div>
		<div class="mode-icon">{mode}</div>
	</div>
	<div class="sevenSEG flex flex-row mr-5">
		<div id="tdigit-0" class="tdigit tselected">{digitArr[0]}</div>
		<div id="tdigit-1" class="tdigit">{digitArr[1]}</div>
		<div id="tdigit-2" class="tdigit">{digitArr[2]}</div>
		<div id="tdigit-3" class="tdigit">{digitArr[3]}</div>
	</div>
</div>

<style>
	.transponder-segdisplay {
		border-style: solid;
		border-color: white;
		border-width: 1px;
		width: 100%;
		height: 90px;
		transition: all 0.4 ease-in-out 0s;
		background: rgba(var(--color-surface-900) / 1);
	}

	:global(.displayon) {
		color: #f74;
		text-shadow:
			0 0 7px #f07c0765,
			0 0 10px #f07c0765,
			0 0 21px #f07c0765,
			0 0 32px #f74;
	}

	:global(.displayoff) {
		color: rgba(var(--color-surface-900) / 1);
	}

	.transponder-segdisplay .mode-icon {
		font-family: DSEG7ClassicMini;
		font-size: 20px;
		text-align: left;
		padding: 2px;
		margin-left: 16px;
	}

	.transponder-segdisplay .sevenSEG {
		font-size: 50px;
		opacity: 1;
	}

	.transponder-segdisplay .tdigit {
		font-family: DSEG7ClassicMini;
		text-align: right;
		padding: 8px 0px;
	}

	.transponder-segdisplay .tdigit.tselected {
		text-decoration-line: underline;
	}
</style>
