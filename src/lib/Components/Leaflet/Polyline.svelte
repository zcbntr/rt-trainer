<script lang="ts">
	import { onMount, onDestroy, getContext, setContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import type { PolylineLayerDetail } from '$lib/components/leaflet/types';

	interface Props {
		latLngArray: Leaflet.LatLngExpression[];
		colour?: string;
		fillOpacity?: number;
		weight?: number;
		opacity?: number;
		interactive?: boolean;
		className?: string;
		children?: import('svelte').Snippet;
		mousedown?: (detail: PolylineLayerDetail) => void;
	}

	let {
		latLngArray,
		colour = '#FF69B4',
		fillOpacity = 1,
		weight = 3,
		opacity = 1,
		interactive = true,
		className = '',
		children,
		mousedown = () => {}
	}: Props = $props();

	let polyline: Leaflet.Polyline | undefined = $state();
	let polylineElement: HTMLElement;
	let mapInstance: Leaflet.Map | undefined;

	const { getMap }: { getMap: () => Leaflet.Map | undefined } = getContext('map');

	setContext('layer', {
		getLayer: () => polyline
	});

	$effect(() => {
		if (!polyline) return;
		polyline.setLatLngs(latLngArray);
	});

	$effect(() => {
		if (!polyline) return;
		polyline.setStyle({ color: colour, fillOpacity, weight, opacity });
	});

	onMount(async () => {
		const map = getMap();
		if (!map) return;

		mapInstance = map;

		const L = await getLeaflet();

		polyline = L.polyline(latLngArray, {
			color: colour,
			fillOpacity,
			weight,
			opacity,
			interactive,
			className
		}).addTo(map);

		polyline.on('mousedown', (event: Leaflet.LeafletMouseEvent) => {
			if (!polyline || !mapInstance) return;
			mousedown({ event, polyline, map: mapInstance });
		});
	});

	onDestroy(() => {
		polyline?.remove();
		polyline = undefined;
		mapInstance = undefined;
	});
</script>

<div bind:this={polylineElement}>
	{#if polyline}
		{@render children?.()}
	{/if}
</div>
