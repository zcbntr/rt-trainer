<script lang="ts">
	import { AppBar, LightSwitch } from '@skeletonlabs/skeleton';
	import { createEventDispatcher } from 'svelte';
	import { GithubSolid } from 'flowbite-svelte-icons';
	interface Props {
		burgerButton: string;
		enabled: boolean;
	}

	let { burgerButton, enabled }: Props = $props();

	const dispatch = createEventDispatcher();

	const burgerButtonClicked = () => {
		dispatch('burgerButtonClicked');
	};
</script>

<!-- Hide app bar if not enabled -->
{#if enabled}
	<AppBar padding="py-2 px-4 sm:p-4">
		{#snippet lead()}
			<div class="flex items-center">
				<button
					id="burgerButton"
					aria-label="Toggle Navigation Drawer"
					class="{burgerButton} btn btn-sm mr-4"
					onclick={burgerButtonClicked}
					onkeypress={burgerButtonClicked}
				>
					<span>
						<svg viewBox="0 0 100 80" class="fill-token w-4 h-4">
							<rect width="100" height="20" />
							<rect y="30" width="100" height="20" />
							<rect y="60" width="100" height="20" />
						</svg>
					</span>
				</button>

				<strong
					><a href="/" class="btn text-xl sm:text-2xl uppercase" data-sveltekit-preload-data="hover"
						>RT Trainer</a
					></strong
				>
			</div>
		{/snippet}

		{#snippet trail()}
			<LightSwitch />
			<a
				class="btn btn-icon"
				href="https://github.com/zcbntr/rt-trainer"
				target="_blank"
				rel="noreferrer"
			>
				<GithubSolid size="xl" />
			</a>
		{/snippet}
	</AppBar>
{:else}
	<!-- Show burger button if the appbar is not enabled -->
	<div>
		<button class="{burgerButton} btn btn-sm mr-4" onclick={burgerButtonClicked}>
			<span>
				<svg viewBox="0 0 100 80" class="fill-token w-4 h-4">
					<rect width="100" height="20" />
					<rect y="30" width="100" height="20" />
					<rect y="60" width="100" height="20" />
				</svg>
			</span>
		</button>
	</div>
{/if}
