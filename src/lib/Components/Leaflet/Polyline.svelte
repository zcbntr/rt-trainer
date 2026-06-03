<script lang="ts">
	import { onMount, onDestroy, getContext, setContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';

	interface Props {
		latLngArray: Leaflet.LatLngExpression[];
		colour?: string;
		fillOpacity?: number;
		weight?: number;
		children?: import('svelte').Snippet;
	}

	let { latLngArray, colour = '#FF69B4', fillOpacity = 1, weight = 3, children }: Props = $props();

	let polyline: Leaflet.Polyline | undefined = $state();
	let polylineElement: HTMLElement;

	const { getMap }: { getMap: () => Leaflet.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		getLayer: () => polyline
	});

	onMount(async () => {
		if (!map) return;

		const L = await getLeaflet();

		polyline = L.polyline(latLngArray, {
			color: colour,
			fillOpacity,
			weight
		}).addTo(map);
	});

	onDestroy(() => {
		polyline?.remove();
		polyline = undefined;
	});
</script>

<div bind:this={polylineElement}>
	{#if polyline}
		{@render children?.()}
	{/if}
</div>
