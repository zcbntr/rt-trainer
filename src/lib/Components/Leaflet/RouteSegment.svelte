<script lang="ts" module>
	/** Adjust these values to change route line and direction caret appearance. */
	export const ROUTE_SEGMENT_DEFAULTS = {
		colour: '#FF69B4',
		weight: 7,
		centerLineColour: '#FFFFFF',
		centerLineWeight: 2,
		arrowMarkerWidth: 24,
		arrowMarkerHeight: 18,
		arrowViewBoxWidth: 24,
		arrowViewBoxHeight: 18,
		arrowStrokeWidth: 4,
		arrowPath: 'M 5 15 L 12 3 L 19 15'
	} as const;

	export function routeSegmentArrowAnchor(
		width: number = ROUTE_SEGMENT_DEFAULTS.arrowMarkerWidth,
		height: number = ROUTE_SEGMENT_DEFAULTS.arrowMarkerHeight
	): [number, number] {
		return [width / 2, height / 2];
	}
</script>

<script lang="ts">
	import Polyline from './Polyline.svelte';
	import Marker from './Marker.svelte';
	import { getRouteSegmentArrows } from './routeSegmentDecorations';
	import type * as Leaflet from 'leaflet';

	interface Props {
		latLngArray: Leaflet.LatLngExpression[];
		highlighted?: boolean;
		colour?: string;
		weight?: number;
		centerLineColour?: string;
		centerLineWeight?: number;
	}

	let {
		latLngArray,
		highlighted = false,
		colour = ROUTE_SEGMENT_DEFAULTS.colour,
		weight = ROUTE_SEGMENT_DEFAULTS.weight,
		centerLineColour = ROUTE_SEGMENT_DEFAULTS.centerLineColour,
		centerLineWeight = ROUTE_SEGMENT_DEFAULTS.centerLineWeight
	}: Props = $props();

	const arrowAnchor = routeSegmentArrowAnchor(
		ROUTE_SEGMENT_DEFAULTS.arrowMarkerWidth,
		ROUTE_SEGMENT_DEFAULTS.arrowMarkerHeight
	);

	const arrows = $derived.by(() => {
		if (latLngArray.length < 2) return [];

		const start = latLngArray[0] as [number, number];
		const end = latLngArray[1] as [number, number];
		return getRouteSegmentArrows(start, end);
	});
</script>

<Polyline {latLngArray} {colour} fillOpacity={1} {weight} />
{#if highlighted}
	<Polyline {latLngArray} colour={centerLineColour} fillOpacity={1} weight={centerLineWeight} />
{/if}
{#each arrows as arrow, index (`${arrow.latLng[0]}-${arrow.latLng[1]}-${index}`)}
	<Marker
		latLng={arrow.latLng}
		width={ROUTE_SEGMENT_DEFAULTS.arrowMarkerWidth}
		height={ROUTE_SEGMENT_DEFAULTS.arrowMarkerHeight}
		rotation={arrow.rotation}
		iconAnchor={arrowAnchor}
	>
		<svg
			viewBox="0 0 {ROUTE_SEGMENT_DEFAULTS.arrowViewBoxWidth} {ROUTE_SEGMENT_DEFAULTS.arrowViewBoxHeight}"
			width={ROUTE_SEGMENT_DEFAULTS.arrowMarkerWidth}
			height={ROUTE_SEGMENT_DEFAULTS.arrowMarkerHeight}
			aria-hidden="true"
			class="pointer-events-none overflow-visible"
		>
			<path
				d={ROUTE_SEGMENT_DEFAULTS.arrowPath}
				fill="none"
				stroke={colour}
				stroke-width={ROUTE_SEGMENT_DEFAULTS.arrowStrokeWidth}
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</Marker>
{/each}
