<!-- Based off of ShipBit's youtube tutorial https://www.youtube.com/watch?v=JFctWXEzFZw -->

<script lang="ts">
	import { onMount, onDestroy, getContext, setContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import type Waypoint from '$lib/logic/aeronautics/Waypoint';
	import type Airport from '$lib/logic/aeronautics/Airport';
	import type { MarkerLayerDetail } from '$lib/components/leaflet/types';

	interface Props {
		width: number;
		height: number;
		rotation?: number;
		latLng: Leaflet.LatLngExpression;
		aeroObject?: Waypoint | Airport | undefined;
		draggable?: boolean;
		iconAnchor?: Leaflet.PointExpression;
		children?: import('svelte').Snippet;
		drag?: (detail: MarkerLayerDetail) => void;
		click?: (detail: MarkerLayerDetail) => void;
		mouseover?: (detail: MarkerLayerDetail) => void;
		mouseout?: (detail: MarkerLayerDetail) => void;
		mouseup?: (detail: MarkerLayerDetail) => void;
		dragend?: (detail: MarkerLayerDetail) => void;
	}

	let {
		width,
		height,
		rotation = 0,
		latLng,
		aeroObject = undefined,
		draggable = false,
		iconAnchor,
		children,
		drag = () => {},
		click = () => {},
		mouseover = () => {},
		mouseout = () => {},
		mouseup = () => {},
		dragend = () => {}
	}: Props = $props();

	let marker: Leaflet.Marker | undefined = $state();
	let markerElement: HTMLElement;

	const { getMap }: { getMap: () => Leaflet.Map | undefined } = getContext('map');

	setContext('layer', {
		getLayer: () => marker
	});

	$effect(() => {
		if (!marker) return;
		marker.setLatLng(latLng);
	});

	onMount(async () => {
		const map = getMap();
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
			if (!marker) return;
			drag({ event: e, aeroObject, marker });
			map?.invalidateSize();
		});
		marker.on('click', (e) => {
			if (!marker) return;
			click({ event: e, aeroObject, marker });
		});
		marker.on('mouseover', (e) => {
			if (!marker) return;
			mouseover({ event: e, aeroObject, marker });
		});
		marker.on('mouseout', (e) => {
			if (!marker) return;
			mouseout({ event: e, aeroObject, marker });
		});
		marker.on('mouseup', (e) => {
			if (!marker) return;
			mouseup({ event: e, aeroObject, marker });
		});
		marker.on('dragend', (e) => {
			if (!marker) return;
			dragend({ event: e, aeroObject, marker });
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
