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
		label: string;
		placement?: Placement;
		triggerClass?: string;
		children?: Snippet;
	}

	let { label, placement = 'bottom', triggerClass = '', children }: Props = $props();

	const arrowClasses =
		'[--arrow-size:--spacing(2)] [--arrow-background:var(--color-secondary-500)]';
	const contentClasses = 'card max-w-xs p-4 preset-filled-secondary-500 shadow-xl';
	const triggerClasses =
		'inline cursor-help border-0 bg-transparent p-0 font-inherit text-inherit shadow-none hover:bg-transparent';
</script>

<Tooltip positioning={{ placement }}>
	<Tooltip.Trigger class="{triggerClasses} {triggerClass}">
		{label}
	</Tooltip.Trigger>
	<Portal>
		<Tooltip.Positioner class="z-50">
			<Tooltip.Content class={contentClasses}>
				{@render children?.()}
				<Tooltip.Arrow class={arrowClasses}>
					<Tooltip.ArrowTip />
				</Tooltip.Arrow>
			</Tooltip.Content>
		</Tooltip.Positioner>
	</Portal>
</Tooltip>
