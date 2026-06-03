<script lang="ts">
	/* Structure inspired by ShipBit's youtube tutorial https://www.youtube.com/watch?v=JFctWXEzFZw

	The coordinates used in the rest of the application are in the format [long, lat],
	here they must be converted to [lat, long] for Leaflet to understand them correctly.
	*/
	import { createEventDispatcher, onDestroy, onMount, setContext, tick } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';

	let map: Leaflet.Map | undefined = $state();
	let mapElement: HTMLDivElement;

	interface Props {
		bounds?: Leaflet.LatLngBoundsExpression | undefined;
		view?: Leaflet.LatLngExpression | undefined;
		zoom?: number | undefined;
		fitPadding?: number | [number, number];
		/** Change when map overlays change so the map can recalculate its size. */
		resizeKey?: unknown;
		children?: import('svelte').Snippet;
	}

	let {
		bounds = undefined,
		view = [52.33, -1.42],
		zoom = 8,
		fitPadding = 32,
		resizeKey = undefined,
		children
	}: Props = $props();

	const dispatch = createEventDispatcher();

	function fitPaddingOption(): [number, number] {
		return typeof fitPadding === 'number' ? [fitPadding, fitPadding] : fitPadding;
	}

	function hasBounds(): boolean {
		return bounds != null;
	}

	function hasViewZoom(): boolean {
		return view != null && zoom != null;
	}

	function applyView() {
		if (!map) return;

		try {
			if (hasBounds()) {
				map.fitBounds(bounds!, { padding: fitPaddingOption(), maxZoom: 12 });
			} else if (hasViewZoom()) {
				map.setView(view!, zoom!);
			}
		} catch {
			// fitBounds can throw if the container has no size yet; ResizeObserver will retry
		}
	}

	function refreshMap() {
		if (!map || mapElement.clientWidth === 0 || mapElement.clientHeight === 0) return;
		map.invalidateSize({ pan: false });
		applyView();
	}

	$effect(() => {
		void bounds;
		void view;
		void zoom;
		void fitPadding;
		void resizeKey;
		if (!map) return;

		tick().then(() => refreshMap());
	});

	let resizeObserver: ResizeObserver | undefined;

	onMount(() => {
		resizeObserver = new ResizeObserver(() => refreshMap());
		resizeObserver.observe(mapElement);

		void (async () => {
			await tick();

			if (!hasBounds() && !hasViewZoom()) {
				throw new Error('Must set either bounds, or both view and zoom.');
			}

			const L = await getLeaflet();

			const center = hasViewZoom() ? view! : ([54, -4] as Leaflet.LatLngExpression);
			const initialZoom = hasViewZoom() ? zoom! : 6;

			map = L.map(mapElement, { center, zoom: initialZoom })
				.on('zoom', (e) => dispatch('zoom', e))
				.on('click', (e) => dispatch('click', e))
				.on('popupopen', async (e) => {
					await tick();
					e.popup?.update();
				});

			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 17,
				attribution:
					'<a href="https://www.openaip.net/">OpenAIP</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);

			map.whenReady(() => refreshMap());
			await tick();
			refreshMap();
		})();

		return () => resizeObserver?.disconnect();
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
	});

	setContext('map', {
		getMap: () => map
	});
</script>

<div class="h-full min-h-0 w-full flex-1" bind:this={mapElement}>
	{#if map}
		{@render children?.()}
	{/if}
</div>
