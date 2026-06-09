<script lang="ts">
	import { onDestroy, onMount, getContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';
	import type { MapContext } from '$lib/components/leaflet/types';
	import type Airspace from '$lib/logic/aeronautics/Airspace';
	import { drawAirspaceLabels } from './airspaceLabelCanvas';

	interface Props {
		airspaces: Airspace[];
		enabled?: boolean;
	}

	let { airspaces, enabled = true }: Props = $props();

	let canvas: HTMLCanvasElement | undefined;
	let mapInstance: Leaflet.Map | undefined;
	let leafletApi: typeof Leaflet | undefined;
	let redrawQueued = false;

	const { getMap, mapUi }: MapContext = getContext('map');

	function queueRedraw() {
		if (!mapInstance || !canvas || redrawQueued) return;

		redrawQueued = true;
		requestAnimationFrame(() => {
			redrawQueued = false;
			if (!mapInstance || !canvas) return;
			void drawAirspaceLabels(mapInstance, canvas, airspaces, enabled);
		});
	}

	function resetCanvas() {
		if (!mapInstance || !canvas || !leafletApi) return;

		const topLeft = mapInstance.containerPointToLayerPoint([0, 0]);
		leafletApi.DomUtil.setPosition(canvas, topLeft);
		queueRedraw();
	}

	$effect(() => {
		void airspaces;
		void enabled;
		void mapUi.zoom;
		resetCanvas();
	});

	onMount(async () => {
		const map = getMap();
		if (!map) return;

		mapInstance = map;
		leafletApi = await getLeaflet();

		canvas = leafletApi.DomUtil.create(
			'canvas',
			'leaflet-airspace-labels-canvas'
		) as HTMLCanvasElement;
		canvas.style.pointerEvents = 'none';

		map.getPanes().overlayPane?.appendChild(canvas);

		map.on('moveend', resetCanvas);
		map.on('zoomend', resetCanvas);
		map.on('resize', resetCanvas);
		resetCanvas();
	});

	onDestroy(() => {
		if (mapInstance) {
			mapInstance.off('moveend', resetCanvas);
			mapInstance.off('zoomend', resetCanvas);
			mapInstance.off('resize', resetCanvas);
		}

		canvas?.remove();
		canvas = undefined;
		mapInstance = undefined;
		leafletApi = undefined;
	});
</script>

<style>
	:global(.leaflet-airspace-labels-canvas) {
		pointer-events: none;
		z-index: 450;
	}
</style>
