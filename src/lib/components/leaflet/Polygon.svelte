<script lang="ts">
	import { onMount, onDestroy, getContext, setContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import type Airspace from '$lib/logic/aeronautics/Airspace';
	import type { PolygonLayerDetail } from '$lib/components/leaflet/types';

	interface Props {
		latLngArray: Leaflet.LatLngExpression[];
		aeroObject?: Airspace | undefined;
		color?: string;
		fillColor?: string | undefined;
		fillOpacity?: number;
		weight?: number;
		children?: import('svelte').Snippet;
		click?: (detail: PolygonLayerDetail) => void;
		mouseover?: (detail: PolygonLayerDetail) => void;
		mouseout?: (detail: PolygonLayerDetail) => void;
	}

	let {
		latLngArray,
		aeroObject = undefined,
		color = 'blue',
		fillColor = undefined,
		fillOpacity = 0.2,
		weight = 1,
		children,
		click = () => {},
		mouseover = () => {},
		mouseout = () => {}
	}: Props = $props();

	let polygon: Leaflet.Polygon | undefined = $state();
	let polygonElement: HTMLElement;

	const { getMap }: { getMap: () => Leaflet.Map | undefined } = getContext('map');

	setContext('layer', {
		getLayer: () => polygon
	});

	$effect(() => {
		if (!polygon) return;
		polygon.setLatLngs(latLngArray);
	});

	onMount(async () => {
		const map = getMap();
		if (!map) return;

		const L = await getLeaflet();

		const createdPolygon = L.polygon(latLngArray, {
			color,
			fillColor: fillColor !== undefined ? fillColor : color,
			fillOpacity,
			weight
		}).addTo(map);

		createdPolygon.on('click', (e) => {
			click({ event: e, waypoint: aeroObject, polygon: createdPolygon });
		});
		createdPolygon.on('mouseover', (e) => {
			mouseover({ event: e, waypoint: aeroObject, polygon: createdPolygon });
		});
		createdPolygon.on('mouseout', (e) => {
			mouseout({ event: e, waypoint: aeroObject, polygon: createdPolygon });
		});

		polygon = createdPolygon;
	});

	onDestroy(() => {
		polygon?.remove();
		polygon = undefined;
	});
</script>

<div bind:this={polygonElement}>
	{#if polygon}
		{@render children?.()}
	{/if}
</div>
