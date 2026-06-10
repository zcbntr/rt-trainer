<script lang="ts">
	import { Portal, Tooltip } from '@skeletonlabs/skeleton-svelte';
	import type { Snippet } from 'svelte';

	type Placement =
		| 'top'
		| 'bottom'
		| 'left'
		| 'right'
		| 'top-start'
		| 'top-end'
		| 'bottom-start'
		| 'bottom-end';

	interface Props {
		/** Visible trigger text, or accessible name when using a custom trigger snippet. */
		label: string;
		placement?: Placement;
		triggerClass?: string;
		trigger?: Snippet;
		children?: Snippet;
	}

	let { label, placement = 'bottom', triggerClass = '', trigger, children }: Props = $props();

	const arrowClasses =
		'[--arrow-size:--spacing(2)] [--arrow-background:var(--color-secondary-500)]';
	// z-index must be on Content: zag copies it to the positioner via --z-index.
	const contentClasses =
		'relative z-[1100] card max-w-xs p-4 preset-filled-secondary-500 shadow-xl';
	const triggerClasses =
		'inline cursor-help border-0 bg-transparent p-0 font-inherit text-inherit shadow-none hover:bg-transparent';
</script>

<Tooltip positioning={{ placement, strategy: 'fixed' }}>
	<Tooltip.Trigger
		class="{triggerClasses} {triggerClass}"
		aria-label={trigger ? label : undefined}
	>
		{#if trigger}
			{@render trigger()}
		{:else}
			{label}
		{/if}
	</Tooltip.Trigger>
	<Portal>
		<Tooltip.Positioner>
			<Tooltip.Content class={contentClasses}>
				{@render children?.()}
				<Tooltip.Arrow class={arrowClasses}>
					<Tooltip.ArrowTip />
				</Tooltip.Arrow>
			</Tooltip.Content>
		</Tooltip.Positioner>
	</Portal>
</Tooltip>
