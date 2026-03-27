<script lang="ts">
	import L from 'leaflet';
	import { getContext, onDestroy, onMount, setContext } from 'svelte';

	interface Props {
		position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
		children?: import('svelte').Snippet<[any]>;
	}

	let { position = 'topleft', children }: Props = $props();

	/** The control instance created by this component */
	let control: Control | undefined = $state(undefined);
	let controlElement: HTMLElement = $state();

	class Control extends L.Control {
		el: HTMLElement;
		constructor(el: any, position: any) {
			super({ position });
			this.el = el;
		}
		onAdd() {
			return this.el;
		}
		onRemove() {}
	}

	const { getMap }: { getMap: () => L.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		// L.Control inherits from L.Layer
		getLayer: () => control
	});

	onMount(() => {
		if (map) {
			control = new Control(controlElement, position).addTo(map);
		}
	});

	onDestroy(() => {
		control?.remove();
		control = undefined;
	});
</script>

<div bind:this={controlElement}>
	{#if control}
		{@render children?.({ control, })}
	{/if}
</div>
