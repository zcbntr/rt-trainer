<script lang="ts">
	import { run } from 'svelte/legacy';

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
		bounds?: Leaflet.LatLngBounds | undefined;
		view?: Leaflet.LatLngExpression | undefined;
		zoom?: number | undefined;
		children?: import('svelte').Snippet;
	}

	let { bounds = undefined, view = [52.33, -1.42], zoom = undefined, children }: Props = $props();

	run(() => {
		if (map) {
			if (bounds) {
				map.fitBounds(bounds);
			} else if (view && zoom) {
				map.setView(view, zoom);
			}
		}
	});

	const dispatch = createEventDispatcher();

	onMount(async () => {
		if (!bounds && (!view || zoom === undefined)) {
			throw new Error('Must set either bounds, or both view and zoom.');
		}

		const L = await getLeaflet();

		map = L.map(mapElement)
			.on('zoom', (e) => dispatch('zoom', e))
			.on('click', (e) => dispatch('click', e))
			.on('popupopen', async (e) => {
				await tick();
				e.popup.update();
			});

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 17,
			attribution:
				'<a href="https://www.openaip.net/">OpenAIP</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		if (bounds) {
			map.fitBounds(bounds);
		} else if (view && zoom !== undefined) {
			map.setView(view, zoom);
		}

		await tick();
		map.invalidateSize();
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
