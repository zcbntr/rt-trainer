<script lang="ts" module>
/** Top-down aircraft symbol for the simulator position marker (from lib/assets/airplane.svg). */
export const AIRCRAFT_MARKER_DEFAULTS = {
	size: 36,
	fill: '#facc15',
	stroke: '#000000',
	strokeWidth: 8
} as const;

/** Leaflet stacking order — above route and waypoint markers. */
export const AIRCRAFT_MARKER_Z_INDEX_OFFSET = 500;

export function aircraftMarkerAnchor(
	size: number = AIRCRAFT_MARKER_DEFAULTS.size
): [number, number] {
	return [size / 2, size / 2];
}
</script>

<script lang="ts">
	interface Props {
		size?: number;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
	}

	let {
		size = AIRCRAFT_MARKER_DEFAULTS.size,
		fill = AIRCRAFT_MARKER_DEFAULTS.fill,
		stroke = AIRCRAFT_MARKER_DEFAULTS.stroke,
		strokeWidth = AIRCRAFT_MARKER_DEFAULTS.strokeWidth
	}: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 256 256"
	aria-hidden="true"
	class="pointer-events-none overflow-visible"
>
	<path
		{fill}
		{stroke}
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		d="M128,216,88,232V200l16-16V152L24,168V136l80-40,.11255-48a24,24,0,0,1,48,0l.11255,48,80,40v32l-80-16v32L168,200v32Z"
	/>
</svg>
