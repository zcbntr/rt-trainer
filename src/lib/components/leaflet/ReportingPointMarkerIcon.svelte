<script lang="ts" module>
	export const REPORTING_POINT_MARKER_DEFAULTS = {
		size: 10,
		strokeWidth: 1.5,
		compulsoryFill: '#dc2626',
		compulsoryStroke: '#991b1b',
		optionalFill: '#fff7ed',
		optionalStroke: '#ea580c'
	} as const;

	export const REPORTING_POINT_MARKER_Z_INDEX_OFFSET = 20;

	export function reportingPointMarkerAnchor(
		size: number = REPORTING_POINT_MARKER_DEFAULTS.size
	): [number, number] {
		return [size / 2, size / 2];
	}
</script>

<script lang="ts">
	interface Props {
		size?: number;
		strokeWidth?: number;
		compulsory?: boolean;
	}

	let {
		size = REPORTING_POINT_MARKER_DEFAULTS.size,
		strokeWidth = REPORTING_POINT_MARKER_DEFAULTS.strokeWidth,
		compulsory = false
	}: Props = $props();

	const fill = $derived(
		compulsory
			? REPORTING_POINT_MARKER_DEFAULTS.compulsoryFill
			: REPORTING_POINT_MARKER_DEFAULTS.optionalFill
	);
	const stroke = $derived(
		compulsory
			? REPORTING_POINT_MARKER_DEFAULTS.compulsoryStroke
			: REPORTING_POINT_MARKER_DEFAULTS.optionalStroke
	);
	const half = $derived(size / 2);
	const points = $derived(
		`${half},${strokeWidth / 2} ${size - strokeWidth / 2},${half} ${half},${size - strokeWidth / 2} ${strokeWidth / 2},${half}`
	);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	aria-hidden="true"
	class="pointer-events-none"
>
	<polygon {points} {fill} {stroke} stroke-width={strokeWidth} />
</svg>
