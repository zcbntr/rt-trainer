<script lang="ts" module>
	export const NAVAID_MARKER_DEFAULTS = {
		size: 22,
		fontSize: 7,
		vorFill: '#1d4ed8',
		ndbFill: '#15803d',
		otherFill: '#475569',
		stroke: '#ffffff'
	} as const;

	export const NAVAID_MARKER_Z_INDEX_OFFSET = 25;

	export function navaidMarkerAnchor(
		size: number = NAVAID_MARKER_DEFAULTS.size
	): [number, number] {
		return [size / 2, size / 2];
	}

	export function navaidMarkerColor(type: number): string {
		if (type === 2) return NAVAID_MARKER_DEFAULTS.ndbFill;
		if ([0, 3, 4, 5, 6, 7, 8].includes(type)) return NAVAID_MARKER_DEFAULTS.vorFill;
		return NAVAID_MARKER_DEFAULTS.otherFill;
	}
</script>

<script lang="ts">
	interface Props {
		size?: number;
		fontSize?: number;
		identifier?: string;
		type?: number;
	}

	let {
		size = NAVAID_MARKER_DEFAULTS.size,
		fontSize = NAVAID_MARKER_DEFAULTS.fontSize,
		identifier = '',
		type = 3
	}: Props = $props();

	const center = $derived(size / 2);
	const radius = $derived(size / 2 - 1);
	const fill = $derived(navaidMarkerColor(type));
	const label = $derived(identifier.slice(0, 3));
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	aria-hidden="true"
	class="pointer-events-none"
>
	<circle
		cx={center}
		cy={center}
		r={radius}
		{fill}
		stroke={NAVAID_MARKER_DEFAULTS.stroke}
		stroke-width="1"
	/>
	<text
		x={center}
		y={center + fontSize / 3}
		text-anchor="middle"
		fill="white"
		font-size={fontSize}
		font-weight="700"
		font-family="system-ui, sans-serif"
	>
		{label}
	</text>
</svg>
