<script lang="ts">
	import { onMount, onDestroy, getContext, setContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import {
		AIRSPACE_MATZ_TYPE,
		applyAirspaceFillStyle,
		ensureHatchPattern,
		getAirspaceColor,
		getAirspaceFillStyle,
		getSharedSvgRenderer
	} from './airspaceHatch';
	import { toLeafletLatLng } from '$lib/logic/utils';
	import type Airspace from '$lib/logic/aeronautics/Airspace';
	import type { PolygonLayerDetail } from '$lib/components/leaflet/types';

	interface Props {
		coordinates: [number, number][];
		airspaceType?: number;
		aeroObject?: Airspace | undefined;
		children?: import('svelte').Snippet;
		click?: (detail: PolygonLayerDetail) => void;
		mouseover?: (detail: PolygonLayerDetail) => void;
		mouseout?: (detail: PolygonLayerDetail) => void;
	}

	let {
		coordinates,
		airspaceType = 0,
		aeroObject = undefined,
		children,
		click = () => {},
		mouseover = () => {},
		mouseout = () => {}
	}: Props = $props();

	let outlinePolygon: Leaflet.Polygon | undefined = $state();
	let fillPolygon: Leaflet.Polygon | undefined = $state();
	let mapInstance: Leaflet.Map | undefined;
	let patternId = '';
	let polygonElement: HTMLElement;

	const isMatz = $derived(airspaceType === AIRSPACE_MATZ_TYPE);
	const color = $derived(getAirspaceColor(isMatz));
	const outlineLatLngs = $derived(coordinates.map(toLeafletLatLng));

	const { getMap }: { getMap: () => Leaflet.Map | undefined } = getContext('map');

	setContext('layer', {
		getLayer: () => outlinePolygon
	});

	function syncFillStyle() {
		if (!mapInstance || !fillPolygon || !patternId) return;

		const style = getAirspaceFillStyle(coordinates, mapInstance, isMatz, patternId);
		if (!style) return;

		applyAirspaceFillStyle(fillPolygon, style);
	}

	$effect(() => {
		if (!outlinePolygon) return;
		outlinePolygon.setLatLngs(outlineLatLngs);
	});

	$effect(() => {
		syncFillStyle();
	});

	onMount(async () => {
		const map = getMap();
		if (!map) return;

		mapInstance = map;

		const L = await getLeaflet();
		const renderer = getSharedSvgRenderer(L, map);
		patternId = ensureHatchPattern(map, renderer, isMatz);

		const initialStyle = getAirspaceFillStyle(coordinates, map, isMatz, patternId);
		if (initialStyle) {
			fillPolygon = L.polygon(initialStyle.latLngs, {
				renderer,
				stroke: false,
				fill: true,
				fillColor: initialStyle.fillColor,
				fillOpacity: initialStyle.fillOpacity,
				interactive: false
			}).addTo(map);
		}

		const outline = L.polygon(outlineLatLngs, {
			renderer,
			color,
			weight: 2,
			fill: false,
			opacity: 0.7,
			interactive: true
		}).addTo(map);
		outlinePolygon = outline;

		outline.on('click', (event: Leaflet.LeafletMouseEvent) => {
			click({ event, waypoint: aeroObject, polygon: outline });
		});
		outline.on('mouseover', (event: Leaflet.LeafletMouseEvent) => {
			mouseover({ event, waypoint: aeroObject, polygon: outline });
		});
		outline.on('mouseout', (event: Leaflet.LeafletMouseEvent) => {
			mouseout({ event, waypoint: aeroObject, polygon: outline });
		});

		map.on('zoomend', syncFillStyle);
	});

	onDestroy(() => {
		mapInstance?.off('zoomend', syncFillStyle);
		fillPolygon?.remove();
		outlinePolygon?.remove();
		fillPolygon = undefined;
		outlinePolygon = undefined;
		mapInstance = undefined;
	});
</script>

<div bind:this={polygonElement}>
	{#if outlinePolygon}
		{@render children?.()}
	{/if}
</div>
