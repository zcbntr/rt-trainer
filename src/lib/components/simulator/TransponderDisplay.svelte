<script lang="ts">
	interface Props {
		DisplayOn?: boolean;
		mode?: string;
		DigitSelected?: number;
		digitArr?: number[];
	}

	let {
		DisplayOn = false,
		mode = 'OFF',
		DigitSelected = $bindable(0),
		digitArr = [0, 0, 0, 0]
	}: Props = $props();

	const blankDigits = [0, 0, 0, 0] as const;
	let showDisplayText = $derived(DisplayOn ? 'displayon' : 'displayoff');
	let displayDigits = $derived(DisplayOn ? digitArr : blankDigits);

	$effect(() => {
		if (!DisplayOn) {
			DigitSelected = 0;
		}
	});
</script>

<div
	class="transponder-segdisplay {showDisplayText} nowrap flex flex-row place-content-between items-center card"
>
	<div class="mode-column">
		<div class="mode-icon" class:mode-hidden={!DisplayOn}>{mode}</div>
	</div>
	<div class="sevenSEG mr-5 flex flex-row">
		{#each displayDigits as digit, i (i)}
			<div id="tdigit-{i}" class={['tdigit', DisplayOn && DigitSelected === i && 'tselected']}>
				{digit}
			</div>
		{/each}
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

	.transponder-segdisplay.displayoff {
		background: color-mix(in srgb, rgb(var(--color-surface-900)) 88%, rgb(255 255 255) 12%);
	}

	.transponder-segdisplay.displayoff .mode-icon,
	.transponder-segdisplay.displayoff .tdigit {
		color: color-mix(in srgb, rgb(var(--color-surface-900)) 55%, rgb(255 255 255) 45%);
		text-shadow: none;
	}

	.transponder-segdisplay .mode-column {
		flex-shrink: 0;
		min-width: 4ch;
		margin-left: 16px;
	}

	.transponder-segdisplay .mode-icon {
		font-family: DSEG7ClassicMini;
		font-size: 20px;
		text-align: left;
		padding: 2px;
		min-width: 4ch;
	}

	.transponder-segdisplay .mode-icon.mode-hidden {
		visibility: hidden;
	}

	.transponder-segdisplay .sevenSEG {
		font-size: 50px;
		opacity: 1;
		flex-shrink: 0;
	}

	.transponder-segdisplay .tdigit {
		font-family: DSEG7ClassicMini;
		text-align: right;
		padding: 8px 0px;
		min-width: 1ch;
		font-variant-numeric: tabular-nums;
	}

	.transponder-segdisplay .tdigit.tselected {
		text-decoration-line: underline;
	}
</style>
