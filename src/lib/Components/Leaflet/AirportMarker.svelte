<script lang="ts">
	import { getContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import Marker from '$lib/components/leaflet/Marker.svelte';
	import AirportMarkerIcon, {
		AIRPORT_MARKER_DEFAULTS,
		airportMarkerAnchor
	} from '$lib/components/leaflet/AirportMarkerIcon.svelte';
	import { getZoomScaledAirportSize } from '$lib/components/leaflet/airportMarkerGeometry';
	import type { RunwaySymbolInput } from '$lib/components/leaflet/airportMarkerGeometry';
	import type Airport from '$lib/logic/aeronautics/Airport';
	import type Waypoint from '$lib/logic/aeronautics/Waypoint';
	import type { MapContext, MarkerLayerDetail } from '$lib/components/leaflet/types';

	interface Props {
		latLng: Leaflet.LatLngExpression;
		aeroObject?: Waypoint | Airport | undefined;
		runways?: RunwaySymbolInput[];
		baseSize?: number;
		showIcon?: boolean;
		showRouteEndpoint?: boolean;
		draggable?: boolean;
		children?: import('svelte').Snippet;
		drag?: (detail: MarkerLayerDetail) => void;
		click?: (detail: MarkerLayerDetail) => void;
		mouseover?: (detail: MarkerLayerDetail) => void;
		mouseout?: (detail: MarkerLayerDetail) => void;
		mouseup?: (detail: MarkerLayerDetail) => void;
		dragend?: (detail: MarkerLayerDetail) => void;
	}

	let {
		latLng,
		aeroObject = undefined,
		runways = [],
		baseSize = AIRPORT_MARKER_DEFAULTS.size,
		showIcon = true,
		showRouteEndpoint = false,
		draggable = false,
		children,
		drag = () => {},
		click = () => {},
		mouseover = () => {},
		mouseout = () => {},
		mouseup = () => {},
		dragend = () => {}
	}: Props = $props();

	const { mapUi }: MapContext = getContext('map');
	const iconSize = $derived(getZoomScaledAirportSize(mapUi.zoom, baseSize));
</script>

<Marker
	{latLng}
	{aeroObject}
	{draggable}
	width={iconSize}
	height={iconSize}
	iconAnchor={airportMarkerAnchor(iconSize)}
	{drag}
	{click}
	{mouseover}
	{mouseout}
	{mouseup}
	{dragend}
>
	{#if showIcon}
		<AirportMarkerIcon size={iconSize} {runways} {showRouteEndpoint} />
	{/if}

	{@render children?.()}
</Marker>
