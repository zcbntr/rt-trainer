<!-- Based off of ShipBit's youtube tutorial https://www.youtube.com/watch?v=JFctWXEzFZw -->

<script lang="ts">
	import { onMount, onDestroy, getContext, setContext, createEventDispatcher } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import type Waypoint from '$lib/logic/aeronautics/Waypoint';
	import type Airport from '$lib/logic/aeronautics/Airport';

	interface Props {
		width: number;
		height: number;
		rotation?: number;
		latLng: Leaflet.LatLngExpression;
		aeroObject?: Waypoint | Airport | undefined;
		draggable?: boolean;
		iconAnchor?: Leaflet.PointExpression;
		children?: import('svelte').Snippet;
	}

	let {
		width,
		height,
		rotation = 0,
		latLng,
		aeroObject = undefined,
		draggable = false,
		iconAnchor,
		children
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let marker: Leaflet.Marker | undefined = $state();
	let markerElement: HTMLElement;

	const { getMap }: { getMap: () => Leaflet.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		getLayer: () => marker
	});

	onMount(async () => {
		if (!map) return;

		const L = await getLeaflet();
		await import('leaflet-rotatedmarker');

		const anchor = iconAnchor ?? [width / 2 - 8, height / 2 - 8];

		const icon = L.divIcon({
			html: markerElement,
			className: 'map-marker',
			iconSize: [width, height],
			iconAnchor: anchor
		});

		marker = L.marker(latLng, {
			icon,
			rotationAngle: rotation,
			rotationOrigin: 'center center',
			title: aeroObject?.name
		}).addTo(map);

		if (draggable) marker.dragging?.enable();
		marker.on('drag', (e) => {
			dispatch('drag', { event: e, aeroObject, marker });
			map?.invalidateSize();
		});
		marker.on('click', (e) => {
			dispatch('click', { event: e, aeroObject, marker });
		});
		marker.on('mouseover', (e) => {
			dispatch('mouseover', { event: e, aeroObject, marker });
		});
		marker.on('mouseout', (e) => {
			dispatch('mouseout', { event: e, aeroObject, marker });
		});
		marker.on('mouseup', (e) => {
			dispatch('mouseup', { event: e, aeroObject, marker });
		});
	});

	onDestroy(() => {
		marker?.remove();
		marker = undefined;
	});
</script>

<div bind:this={markerElement}>
	{#if marker}
		{@render children?.()}
	{/if}
</div>
