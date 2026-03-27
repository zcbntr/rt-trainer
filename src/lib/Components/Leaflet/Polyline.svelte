<script lang="ts">
	import { onMount, onDestroy, getContext, setContext } from 'svelte';
	import L from 'leaflet';

	interface Props {
		latLngArray: L.LatLngExpression[];
		colour?: string;
		fillOpacity?: number;
		weight?: number;
		children?: import('svelte').Snippet;
	}

	let { latLngArray, colour = '#FF69B4', fillOpacity = 1, weight = 3, children }: Props = $props();

	let polyline: L.Polyline | undefined = $state();
	let polylineElement: HTMLElement = $state();

	const { getMap }: { getMap: () => L.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		// L.Polyline inherits from L.Layer
		getLayer: () => polyline
	});

	onMount(() => {
		if (map) {
			polyline = L.polyline(latLngArray, {
				color: colour,
				fillOpacity: fillOpacity,
				weight: weight
			}).addTo(map);
		}
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
