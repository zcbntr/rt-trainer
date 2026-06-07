<script lang="ts">
	import { CloseOutline, ExclamationCircleOutline, InfoCircleOutline } from 'flowbite-svelte-icons';
	import type { WarningBannerStackPosition, WarningBannerVariant } from './WarningBanner.types';

	interface Props {
		title?: string;
		message?: string;
		variant?: WarningBannerVariant;
		stackPosition?: WarningBannerStackPosition;
		/** Flat bottom edge when this banner is the base of a stack above another panel. */
		attachedBottom?: boolean;
		/** Overlap the top border with the banner above in a stack. */
		collapseTopBorder?: boolean;
		dismissible?: boolean;
		visible?: boolean;
		ondismiss?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		title,
		message,
		variant = 'warning',
		stackPosition = 'only',
		attachedBottom = true,
		collapseTopBorder = false,
		dismissible = false,
		visible = true,
		ondismiss,
		children
	}: Props = $props();

	const variantClasses: Record<WarningBannerVariant, string> = {
		warning:
			'border-warning-500/40 bg-warning-500/10 text-warning-950 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-100',
		info: 'border-primary-500/40 bg-primary-500/10 text-primary-950 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-100',
		error:
			'border-error-500/40 bg-error-500/10 text-error-950 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-100'
	};

	const iconClasses: Record<WarningBannerVariant, string> = {
		warning: 'text-warning-600 dark:text-warning-300',
		info: 'text-primary-600 dark:text-primary-300',
		error: 'text-error-600 dark:text-error-300'
	};

	const radiusClasses = $derived.by(() => {
		const flatBottom = attachedBottom && (stackPosition === 'only' || stackPosition === 'last');

		switch (stackPosition) {
			case 'first':
				return 'rounded-t-container rounded-b-none';
			case 'middle':
				return 'rounded-none';
			case 'last':
				return flatBottom ? 'rounded-b-none' : 'rounded-b-container';
			default:
				return flatBottom ? 'rounded-t-container rounded-b-none' : 'rounded-container';
		}
	});

	const isCompact = $derived(!title);
</script>

{#if visible}
	<div
		class="relative z-10 flex gap-3 border border-solid px-4 {variantClasses[
			variant
		]} {radiusClasses} {collapseTopBorder ? '-mt-px' : ''} {isCompact
			? 'items-center py-2'
			: 'items-start py-3'}"
		role={variant === 'error' ? 'alert' : 'status'}
	>
		{#if variant === 'info'}
			<InfoCircleOutline
				class="size-5 shrink-0 {iconClasses[variant]} {isCompact ? '' : 'mt-0.5'}"
			/>
		{:else}
			<ExclamationCircleOutline
				class="size-5 shrink-0 {iconClasses[variant]} {isCompact ? '' : 'mt-0.5'}"
			/>
		{/if}

		<div class="min-w-0 flex-1 text-sm leading-relaxed">
			{#if title}
				<p class="font-semibold">{title}</p>
			{/if}
			{#if message}
				<p class={title ? 'mt-1' : ''}>{message}</p>
			{/if}
			{@render children?.()}
		</div>

		{#if dismissible}
			<button
				type="button"
				class="btn-icon shrink-0 opacity-70 hover:opacity-100"
				aria-label="Dismiss"
				onclick={() => ondismiss?.()}
			>
				<CloseOutline class="size-4" />
			</button>
		{/if}
	</div>
{/if}
