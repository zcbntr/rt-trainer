<!-- Based off of ShipBit's youtube tutorial https://www.youtube.com/watch?v=JFctWXEzFZw -->

<script lang="ts">
	import { onMount, onDestroy, getContext } from 'svelte';
	import L from 'leaflet';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let popup: L.Popup | undefined;
	let popupElement: HTMLElement = $state();

	let open = $state(false);

	const { getLayer }: { getLayer: () => L.Layer | undefined } = getContext('layer');
	const layer = getLayer();

	onMount(() => {
		popup = L.popup().setContent(popupElement);

		if (layer) {
			layer.bindPopup(popup);
			layer.on('popupopen', () => (open = true));
			layer.on('popupclose', () => (open = false));
		}
	});

	onDestroy(() => {
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
