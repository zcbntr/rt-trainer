<script lang="ts" module>
/** Adjust these values to change fix waypoint appearance on the map and in the sidebar. */
export const FIX_WAYPOINT_MARKER_DEFAULTS = {
	size: 16,
	strokeWidth: 1.5,
	fill: 'white',
	stroke: 'black'
} as const;

export const ROUTE_ENDPOINT_DOT_DEFAULTS = {
	fill: '#22c55e'
} as const;

export function routeEndpointDotRadius(size: number): number {
	return Math.max(2, size * 0.11);
}

export function isRouteEndpoint(index: number, waypointCount: number): boolean {
	return waypointCount > 0 && (index === 0 || index === waypointCount - 1);
}

export function fixWaypointMarkerAnchor(
	size: number = FIX_WAYPOINT_MARKER_DEFAULTS.size
): [number, number] {
	return [size / 2, size / 2];
}
</script>

<script lang="ts">
	interface Props {
		size?: number;
		strokeWidth?: number;
		fill?: string;
		stroke?: string;
		showRouteEndpoint?: boolean;
	}

	let {
		size = FIX_WAYPOINT_MARKER_DEFAULTS.size,
		strokeWidth = FIX_WAYPOINT_MARKER_DEFAULTS.strokeWidth,
		fill = FIX_WAYPOINT_MARKER_DEFAULTS.fill,
		stroke = FIX_WAYPOINT_MARKER_DEFAULTS.stroke,
		showRouteEndpoint = false
	}: Props = $props();

	const radius = $derived(size / 2 - strokeWidth);
	const center = $derived(size / 2);
	const routeEndpointRadius = $derived(routeEndpointDotRadius(size));
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	aria-hidden="true"
	class="pointer-events-none"
>
	<circle cx={center} cy={center} r={radius} {fill} {stroke} stroke-width={strokeWidth} />
	{#if showRouteEndpoint}
		<circle
			cx={center}
			cy={center}
			r={routeEndpointRadius}
			fill={ROUTE_ENDPOINT_DOT_DEFAULTS.fill}
		/>
	{/if}
</svg>
