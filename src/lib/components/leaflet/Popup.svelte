<!-- Based off of ShipBit's youtube tutorial https://www.youtube.com/watch?v=JFctWXEzFZw -->

<script lang="ts">
	import { onMount, onDestroy, getContext } from 'svelte';
	import type * as Leaflet from 'leaflet';
	import { getLeaflet } from './leaflet';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let popup: Leaflet.Popup | undefined;
	let popupElement: HTMLElement;
	let open = $state(false);

	const { getLayer }: { getLayer: () => Leaflet.Layer | undefined } = getContext('layer');

	onMount(async () => {
		const layer = getLayer();
		if (!layer) return;

		const L = await getLeaflet();

		const createdPopup = L.popup().setContent(popupElement);
		popup = createdPopup;
		layer.bindPopup(createdPopup);
		layer.on('popupopen', () => (open = true));
		layer.on('popupclose', () => (open = false));
	});

	onDestroy(() => {
		const layer = getLayer();
		layer?.unbindPopup();
		popup?.remove();
		popup = undefined;
	});
</script>

<div class="w-40" bind:this={popupElement}>
	{#if open}
		{@render children?.()}
	{/if}
</div>
