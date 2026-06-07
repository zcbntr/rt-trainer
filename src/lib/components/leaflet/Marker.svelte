<!-- Based off of ShipBit's youtube tutorial https://www.youtube.com/watch?v=JFctWXEzFZw -->

<script lang="ts">
	import { onMount, onDestroy, getContext, setContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import type Waypoint from '$lib/logic/aeronautics/Waypoint';
	import type Airport from '$lib/logic/aeronautics/Airport';
	import type {
		MapContext,
		MarkerLayerDetail,
		RotatableLeafletMarker
	} from '$lib/components/leaflet/types';

	interface Props {
		width: number;
		height: number;
		rotation?: number;
		latLng: Leaflet.LatLngExpression;
		aeroObject?: Waypoint | Airport | undefined;
		draggable?: boolean;
		iconAnchor?: Leaflet.PointExpression;
		zIndexOffset?: number;
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
		zIndexOffset = 0,
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
	let leafletApi: typeof Leaflet | undefined;

	const { getMap }: MapContext = getContext('map');

	setContext('layer', {
		getLayer: () => marker
	});

	function getIconAnchor(): Leaflet.PointExpression {
		return iconAnchor ?? [width / 2 - 8, height / 2 - 8];
	}

	function createDivIcon(L: typeof Leaflet): Leaflet.DivIcon {
		return L.divIcon({
			html: markerElement,
			className: 'map-marker',
			iconSize: [width, height],
			iconAnchor: getIconAnchor()
		});
	}

	$effect(() => {
		if (!marker) return;
		marker.setLatLng(latLng);
	});

	$effect(() => {
		if (!marker || !leafletApi) return;
		marker.setIcon(createDivIcon(leafletApi));
	});

	$effect(() => {
		if (!marker) return;
		marker.setZIndexOffset(zIndexOffset);
	});

	$effect(() => {
		if (!marker) return;
		// leaflet-rotatedmarker treats 0 as falsy and skips applying rotation
		const angle = rotation === 0 ? 360 : rotation;
		(marker as RotatableLeafletMarker).setRotationAngle(angle);
	});

	onMount(async () => {
		const map = getMap();
		if (!map) return;

		const L = await getLeaflet();
		leafletApi = L;
		await import('leaflet-rotatedmarker');

		const createdMarker = L.marker(latLng, {
			icon: createDivIcon(L),
			rotationAngle: rotation,
			rotationOrigin: 'center center',
			title: aeroObject?.name,
			zIndexOffset
		} as Leaflet.MarkerOptions & { rotationAngle?: number; rotationOrigin?: string }).addTo(map);

		marker = createdMarker;

		if (draggable) createdMarker.dragging?.enable();
		createdMarker.on('drag', (e) => {
			if (!marker) return;
			drag({ event: e, aeroObject, marker });
			map.invalidateSize();
		});
		createdMarker.on('click', (e) => {
			if (!marker) return;
			click({ event: e, aeroObject, marker });
		});
		createdMarker.on('mouseover', (e) => {
			if (!marker) return;
			mouseover({ event: e, aeroObject, marker });
		});
		createdMarker.on('mouseout', (e) => {
			if (!marker) return;
			mouseout({ event: e, aeroObject, marker });
		});
		createdMarker.on('mouseup', (e) => {
			if (!marker) return;
			mouseup({ event: e, aeroObject, marker });
		});
		createdMarker.on('dragend', (e) => {
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
