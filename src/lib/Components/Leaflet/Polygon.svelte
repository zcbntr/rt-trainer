<script lang="ts">
	import { onMount, onDestroy, getContext, setContext, createEventDispatcher } from 'svelte';
	import L from 'leaflet';
	import type Airspace from '$lib/logic/aeronautics/Airspace';

	interface Props {
		latLngArray: L.LatLngExpression[];
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

	let polygon: L.Polygon | undefined = $state();
	let polygonElement: HTMLElement = $state();

	const { getMap }: { getMap: () => L.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		// L.Polygon inherits from L.Layer
		getLayer: () => polygon
	});

	onMount(() => {
		if (map) {
			// if fill color undefined, set it to color
			polygon = L.polygon(latLngArray, {
				color: color,
				fillColor: fillColor !== undefined ? fillColor : color,
				fillOpacity: fillOpacity,
				weight: weight
			}).addTo(map);
			polygon?.on('click', (e) => {
				dispatch('click', { event: e, waypoint: aeroObject, polygon: polygon });
			});
			polygon?.on('mouseover', (e) => {
				dispatch('mouseover', { event: e, waypoint: aeroObject, polygon: polygon });
			});
			polygon?.on('mouseout', (e) => {
				dispatch('mouseout', { event: e, waypoint: aeroObject, polygon: polygon });
			});
		}
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
