<script lang="ts">
	interface Props {
		DisplayOn?: boolean;
		mode?: string;
		activeFrequency?: number;
		standbyFrequency?: number;
		tertiaryFrequency?: number;
	}

	let {
		DisplayOn = false,
		mode = $bindable('COM'),
		activeFrequency = 123.17,
		standbyFrequency = 126.41,
		tertiaryFrequency = 177.2
	}: Props = $props();

	let showDisplayText = $derived(DisplayOn ? 'displayon' : 'displayoff');
	let displayActiveFrequency = $derived(DisplayOn ? activeFrequency.toFixed(3) : '000.000');
	let displayStandbyFrequency = $derived(DisplayOn ? standbyFrequency.toFixed(3) : '000.000');
	let displayTertiaryFrequency = $derived(DisplayOn ? tertiaryFrequency.toFixed(3) : '000.000');
</script>

<div
	class="radio-segdisplay {showDisplayText} card flex flex-row items-center place-content-evenly"
>
	<div class="mode-column flex flex-col place-content-center ml-2 sm:ml-4">
		<div class="mode-icon" class:mode-hidden={!DisplayOn}>{mode}</div>
	</div>
	<div class="sevenSEG flex flex-row items-center sm:ml-8 sm:mr-10">
		<div class="alternate-frequency flex flex-row">
			<div id="alternate-rdigit-0" class="rdigit text-[23px] sm:text-md md:text-3xl/6">
				{displayActiveFrequency}
			</div>
		</div>
		<div>
			<div class="divider-pipe text-[23px] sm:text-md md:text-3xl/6 mx-2 sm:mx-8">|</div>
		</div>
		<div class="standby-column flex flex-col">
			<div class="primary-frequency flex flex-row">
				<div id="primary-rdigit-0" class="rdigit text-[23px] sm:text-md md:text-3xl/6">
					{displayStandbyFrequency}
				</div>
			</div>
			<div class="tertiary-frequency flex flex-row">
				<div id="tertiary-rdigit-0" class="rdigit text-[23px] sm:text-md md:text-3xl/6">
					{displayTertiaryFrequency}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.radio-segdisplay {
		border-style: solid;
		border-color: white;
		border-width: 1px;
		width: 100%;
		height: 90px;
		transition: all 0.4 ease-in-out 0s;
		background: rgba(var(--color-surface-900) / 1);
		overflow: hidden;
		min-width: 0;
	}

	:global(.displayon) {
		color: #f74;
		text-shadow:
			0 0 7px #f07c0765,
			0 0 10px #f07c0765,
			0 0 21px #f07c0765,
			0 0 32px #f74;
	}

	.radio-segdisplay.displayoff {
		background: color-mix(in srgb, rgb(var(--color-surface-900)) 88%, rgb(255 255 255) 12%);
	}

	.radio-segdisplay.displayoff .mode-icon,
	.radio-segdisplay.displayoff .rdigit,
	.radio-segdisplay.displayoff .divider-pipe {
		color: color-mix(in srgb, rgb(var(--color-surface-900)) 55%, rgb(255 255 255) 45%);
		text-shadow: none;
	}

	.radio-segdisplay .mode-column {
		flex-shrink: 0;
		min-width: 3ch;
	}

	.radio-segdisplay .mode-icon {
		font-family: DSEG7ClassicMini;
		font-size: 23px;
		text-align: left;
		padding: 2px;
		min-width: 3ch;
	}

	.radio-segdisplay .mode-icon.mode-hidden {
		visibility: hidden;
	}

	.radio-segdisplay .sevenSEG {
		flex: 1;
		min-width: 0;
		flex-shrink: 1;
	}

	.radio-segdisplay .standby-column {
		flex-shrink: 0;
	}

	.radio-segdisplay .primary-frequency .rdigit,
	.radio-segdisplay .tertiary-frequency .rdigit {
		padding-top: 0;
		padding-bottom: 0;
		line-height: 1.1;
	}

	.radio-segdisplay .rdigit {
		font-family: DSEG7ClassicMini;
		text-align: right;
		padding: 8px 0px;
		min-width: 7ch;
		font-variant-numeric: tabular-nums;
	}

	.radio-segdisplay .divider-pipe {
		text-align: right;
		padding: 8px 0px;
	}
</style>
