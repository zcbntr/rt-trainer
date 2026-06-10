<script lang="ts">
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { drawer } from '$lib/components/singletons/drawer.svelte';

	interface Props {
		width?: string;
		title?: string;
		children?: import('svelte').Snippet;
	}

	let { width = 'w-64', title, children }: Props = $props();

	const animBackdrop =
		'transition transition-discrete opacity-0 starting:data-[state=open]:opacity-0 data-[state=open]:opacity-100';
	const animPanel =
		'transition transition-discrete opacity-0 -translate-x-full starting:data-[state=open]:opacity-0 starting:data-[state=open]:-translate-x-full data-[state=open]:opacity-100 data-[state=open]:translate-x-0';

	function onOpenChange(details: { open: boolean }): void {
		drawer.open = details.open;
	}
</script>

<Dialog open={drawer.open} {onOpenChange}>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[1100] bg-surface-50-950/50 {animBackdrop}" />
		<Dialog.Positioner class="fixed inset-0 z-[1100] flex justify-start">
			<Dialog.Content
				class="h-screen space-y-4 card bg-surface-100-900 p-0 shadow-xl {width} {animPanel}"
			>
				{#if title}
					<header class="flex items-center justify-between p-4 pb-0">
						<Dialog.Title class="text-2xl font-bold">{title}</Dialog.Title>
						<Dialog.CloseTrigger class="btn-icon preset-tonal" aria-label="Close navigation">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-5"
								aria-hidden="true"
							>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</Dialog.CloseTrigger>
					</header>
				{/if}
				{@render children?.()}
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
