<script lang="ts">
	/*
	 * Leaflet expects [lat, lng]. Internal app coordinates use GeoJSON order [lng, lat];
	 * convert at the boundary with toLeafletLatLng / fromLeafletLatLng from utils.
	 */
	import { onDestroy, onMount, setContext, tick } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';

	let map: Leaflet.Map | undefined = $state();
	let mapElement: HTMLDivElement;

	interface Props {
		bounds?: Leaflet.LatLngBoundsExpression | undefined;
		view?: Leaflet.LatLngExpression | undefined;
		zoom?: number | undefined;
		fitPadding?: number | [number, number];
		maxBounds?: Leaflet.LatLngBoundsExpression | undefined;
		/** Change when map overlays change so the map can recalculate its size. */
		resizeKey?: unknown;
		children?: import('svelte').Snippet;
		click?: (event: Leaflet.LeafletMouseEvent) => void;
	}

	let {
		bounds = undefined,
		view = [52.33, -1.42],
		zoom = 8,
		fitPadding = 32,
		maxBounds = undefined,
		resizeKey = undefined,
		children,
		click = () => {}
	}: Props = $props();

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

			map = L.map(mapElement, {
				center,
				zoom: initialZoom,
				maxBounds,
				maxBoundsViscosity: maxBounds ? 1 : undefined
			})
				.on('click', (e: Leaflet.LeafletMouseEvent) => click(e))
				.on('popupopen', async (e: Leaflet.PopupEvent) => {
					await tick();
					e.popup?.update();
				});

			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 17,
				attribution:
					'<a href="https://www.openaip.net/">OpenAIP</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);

			map?.whenReady(() => refreshMap());
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
