<script lang="ts">
	import WarningBanner from './WarningBanner.svelte';
	import type { WarningBannerItem, WarningBannerStackPosition } from './WarningBanner.types';

	interface Props {
		banners: WarningBannerItem[];
		dismissedIds?: string[];
		ondismiss?: (id: string) => void;
		/** Flat bottom edge on the last banner when stacked above another panel (e.g. a map). */
		attachedBottom?: boolean;
	}

	let { banners, dismissedIds = [], ondismiss, attachedBottom = true }: Props = $props();

	const visibleBanners = $derived(banners.filter((banner) => !dismissedIds.includes(banner.id)));

	function stackPosition(index: number, count: number): WarningBannerStackPosition {
		if (count === 1) return 'only';
		if (index === 0) return 'first';
		if (index === count - 1) return 'last';
		return 'middle';
	}
</script>

{#if visibleBanners.length > 0}
	<div class="relative z-10 flex shrink-0 flex-col">
		{#each visibleBanners as banner, index (banner.id)}
			<WarningBanner
				title={banner.title}
				message={banner.message}
				variant={banner.variant}
				dismissible={banner.dismissible}
				stackPosition={stackPosition(index, visibleBanners.length)}
				{attachedBottom}
				collapseTopBorder={index > 0}
				ondismiss={() => ondismiss?.(banner.id)}
			/>
		{/each}
	</div>
{/if}
