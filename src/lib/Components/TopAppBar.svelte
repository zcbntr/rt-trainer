<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { GithubSolid } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { drawer } from '$lib/components/singletons/drawer.svelte';

	interface Props {
		burgerButton: string;
		enabled: boolean;
	}

	let { burgerButton, enabled }: Props = $props();

	function burgerButtonClicked(): void {
		drawer.toggle();
	}
</script>

<!-- Hide app bar if not enabled -->
{#if enabled}
	<AppBar>
		<AppBar.Toolbar class="px-4 py-2 sm:p-4">
			<AppBar.Lead>
				<div class="flex items-center">
					<button
						id="burgerButton"
						aria-label="Toggle Navigation Drawer"
						class="{burgerButton} mr-4 btn btn-sm"
						onclick={burgerButtonClicked}
						onkeypress={burgerButtonClicked}
					>
						<span>
							<svg viewBox="0 0 100 80" class="fill-token h-4 w-4">
								<rect width="100" height="20" />
								<rect y="30" width="100" height="20" />
								<rect y="60" width="100" height="20" />
							</svg>
						</span>
					</button>

					<strong
						><a
							href={resolve('/')}
							class="btn text-xl uppercase sm:text-2xl"
							data-sveltekit-preload-data="hover">RT Trainer</a
						></strong
					>
				</div>
			</AppBar.Lead>
			<AppBar.Trail>
				<a
					class="btn-icon btn"
					href="https://github.com/zcbntr/rt-trainer"
					target="_blank"
					rel="noreferrer"
				>
					<GithubSolid size="xl" />
				</a>
			</AppBar.Trail>
		</AppBar.Toolbar>
	</AppBar>
{:else}
	<!-- Show burger button if the appbar is not enabled -->
	<div>
		<button
			class="{burgerButton} mr-4 btn btn-sm"
			onclick={burgerButtonClicked}
			aria-label="Toggle Navigation Drawer"
		>
			<span>
				<svg viewBox="0 0 100 80" class="fill-token h-4 w-4">
					<rect width="100" height="20" />
					<rect y="30" width="100" height="20" />
					<rect y="60" width="100" height="20" />
				</svg>
			</span>
		</button>
	</div>
{/if}
