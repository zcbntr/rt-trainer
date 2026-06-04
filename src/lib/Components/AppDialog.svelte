<script lang="ts">
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
	import { dialog } from '$lib/components/singletons/dialog.svelte';

	const animation =
		'transition transition-discrete opacity-0 translate-y-[100px] starting:data-[state=open]:opacity-0 starting:data-[state=open]:translate-y-[100px] data-[state=open]:opacity-100 data-[state=open]:translate-y-0';

	const options = $derived(dialog.options);
	const isAlert = $derived(options?.type === 'alert');
	const isConfirm = $derived(options?.type === 'confirm');
	const componentOptions = $derived(options?.type === 'component' ? options : null);
	const textOptions = $derived(
		options?.type === 'alert' || options?.type === 'confirm' ? options : null
	);
</script>

<Dialog
	open={dialog.open}
	onOpenChange={dialog.onOpenChange}
	role={isAlert ? 'alertdialog' : 'dialog'}
>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[60] bg-surface-50-950/50" />
		<Dialog.Positioner class="fixed inset-0 z-[60] flex items-center justify-center p-4">
			{#if componentOptions}
				{@const Component = componentOptions.component}
				<Dialog.Content
					class="card max-h-[90svh] w-full max-w-xl overflow-auto bg-surface-100-900 p-0 shadow-xl {animation}"
				>
					<Component {...componentOptions.props ?? {}} />
				</Dialog.Content>
			{:else if textOptions}
				<Dialog.Content
					class="card w-full max-w-md space-y-4 bg-surface-100-900 p-4 shadow-xl {animation}"
				>
					<header>
						<Dialog.Title class="text-lg font-bold">{textOptions.title}</Dialog.Title>
					</header>
					<Dialog.Description class="text-surface-600-400">
						{textOptions.body}
					</Dialog.Description>
					<footer class="flex justify-end gap-2">
						{#if isConfirm}
							<button type="button" class="btn preset-tonal" onclick={() => dialog.close(false)}>
								Cancel
							</button>
							<button type="button" class="btn preset-filled" onclick={() => dialog.close(true)}>
								OK
							</button>
						{:else}
							<button type="button" class="btn preset-filled" onclick={() => dialog.close()}>
								OK
							</button>
						{/if}
					</footer>
				</Dialog.Content>
			{/if}
		</Dialog.Positioner>
	</Portal>
</Dialog>
