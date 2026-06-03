<script lang="ts">
	import { onMount, onDestroy, getContext, setContext, createEventDispatcher } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import type Airspace from '$lib/logic/aeronautics/Airspace';

	interface Props {
		latLngArray: Leaflet.LatLngExpression[];
		aeroObject?: Airspace | undefined;
		color?: string;
		fillColor?: string | undefined;
		fillOpacity?: number;
		weight?: number;
		children?: import('svelte').Snippet;
	}

	let {
		latLngArray,
		aeroObject = undefined,
		color = 'blue',
		fillColor = undefined,
		fillOpacity = 0.2,
		weight = 1,
		children
	}: Props = $props();

	const dispatch = createEventDispatcher();

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

		polygon = L.polygon(latLngArray, {
			color,
			fillColor: fillColor !== undefined ? fillColor : color,
			fillOpacity,
			weight
		}).addTo(map);

		polygon.on('click', (e) => {
			dispatch('click', { event: e, waypoint: aeroObject, polygon });
		});
		polygon.on('mouseover', (e) => {
			dispatch('mouseover', { event: e, waypoint: aeroObject, polygon });
		});
		polygon.on('mouseout', (e) => {
			dispatch('mouseout', { event: e, waypoint: aeroObject, polygon });
		});
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
