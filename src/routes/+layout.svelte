<script lang="ts">
	import '../app.css';

	import TopAppBar from '$lib/components/TopAppBar.svelte';
	import NavigationDrawer from '$lib/components/NavigationDrawer.svelte';
	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import AppDialog from '$lib/components/AppDialog.svelte';
	import { toaster } from '$lib/components/singletons/toaster';
	import { drawer } from '$lib/components/singletons/drawer.svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Navigation from '$lib/components/NAVSidebar.svelte';
	import ScenarioPlanSidebar from '$lib/components/ScenarioPlanSidebar.svelte';
	import SvelteSeo from 'svelte-seo';
	import favicon from '$lib/assets/favicon.ico';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const layoutShell = $derived.by(() => {
		const path = page.url.pathname;

		if (path === '/') {
			return {
				showTopAppBar: true,
				showNavigation: false,
				showRoutePlanSidebar: false,
				classesAppBar: 'w-auto',
				classesSidebar: 'w-0',
				burgerButton: 'lg:hidden'
			};
		}
		if (path.includes('/simulator') || path.includes('/results')) {
			return {
				showTopAppBar: true,
				showNavigation: true,
				showRoutePlanSidebar: false,
				classesAppBar: 'w-auto',
				classesSidebar: 'w-0',
				burgerButton: 'lg'
			};
		}
		if (path.includes('/scenario-planner')) {
			return {
				showTopAppBar: false,
				showNavigation: false,
				showRoutePlanSidebar: true,
				classesAppBar: 'w-auto',
				classesSidebar: 'w-0 lg:w-80',
				burgerButton: 'lg:hidden'
			};
		}
		return {
			showTopAppBar: true,
			showNavigation: true,
			showRoutePlanSidebar: false,
			classesAppBar: 'w-auto',
			classesSidebar: 'w-0 lg:w-64',
			burgerButton: 'lg:hidden'
		};
	});

	const showTopAppBar = $derived(layoutShell.showTopAppBar);
	const showNavigation = $derived(layoutShell.showNavigation);
	const showRoutePlanSidebar = $derived(layoutShell.showRoutePlanSidebar);
	const classesAppBar = $derived(layoutShell.classesAppBar);
	const classesSidebar = $derived(layoutShell.classesSidebar);
	const burgerButton = $derived(layoutShell.burgerButton);
	const drawerWidth = $derived(showRoutePlanSidebar ? 'w-80' : 'w-64');
	const drawerTitle = $derived(showNavigation && !showRoutePlanSidebar ? 'Navigation' : undefined);

	function toastPreset(type: string | undefined): string {
		switch (type) {
			case 'warning':
				return 'preset-filled-warning-500';
			case 'success':
				return 'preset-filled-success-500';
			case 'error':
				return 'preset-filled-error-500';
			default:
				return 'preset-filled';
		}
	}

	afterNavigate(() => {
		drawer.close();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<SvelteSeo
	title="RT Trainer | FRTOL Practice"
	description="Gain confidence in your RT skills with our FRTOL practice tool. Practice your RT skills with our randomly generated scenarios and get instant feedback on your performance. Speak or type your radio calls. Share routes with friends and instructors. Use the simulated cockpit controls."
	keywords="frtol, rt, radio, trainer, practice, atc, air traffic control, pilot, aviation, flight, simulator, training, route, generation, cap413, radio telephony, radiotelephony, pilots license, exam, frtol exam, test, frtol test"
	notranslate={true}
	applicationName="RT Trainer"
/>

{#if showNavigation || showRoutePlanSidebar}
	<NavigationDrawer width={drawerWidth} title={drawerTitle}>
		{#if showRoutePlanSidebar}
			<ScenarioPlanSidebar />
		{:else if showNavigation}
			<Navigation />
		{/if}
	</NavigationDrawer>
{/if}

<AppDialog />

<Toast.Group {toaster}>
	{#snippet children(toast)}
		<Toast {toast} class="w-full max-w-md card p-4 shadow-xl {toastPreset(toast.type)}">
			<Toast.Message>
				{#if toast.title}
					<Toast.Title>{toast.title}</Toast.Title>
				{/if}
				{#if toast.description}
					<Toast.Description class="whitespace-pre-line">{toast.description}</Toast.Description>
				{/if}
			</Toast.Message>
			<Toast.CloseTrigger />
		</Toast>
	{/snippet}
</Toast.Group>

<!-- Previously was the App Shell, now just a div -->

<div
	class="appbar bg-surface-500/5 {classesAppBar} {showRoutePlanSidebar
		? 'appbar--viewport-locked'
		: ''}"
>
	<header>
		<!-- App Bar -->
		{#if showTopAppBar}
			<TopAppBar {burgerButton} enabled={true} />
		{:else if showNavigation || showRoutePlanSidebar}
			<TopAppBar {burgerButton} enabled={false} />
		{/if}
	</header>
	<aside class={classesSidebar}>
		<!-- Navigation -->
		{#if showNavigation}
			<Navigation />
		{:else if showRoutePlanSidebar}
			<ScenarioPlanSidebar />
		{/if}
	</aside>
	<main class="min-h-0 {showRoutePlanSidebar ? 'h-full overflow-hidden' : 'flex-1'}">
		<!-- Page Route Content -->
		{@render children?.()}
	</main>
	<footer>
		{#if page.url.pathname === '/'}
			<div class="flex grow-0 flex-col place-items-center p-2">
				<p class="text-slate-600">
					Homepage image by <a
						href="https://pixabay.com/users/clker-free-vector-images-3736/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=26563"
						>Clker-Free-Vector-Images</a
					>
					from
					<a
						href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=26563"
						>Pixabay</a
					>
				</p>
			</div>
		{/if}
	</footer>
</div>

<style>
	@font-face {
		font-family: 'DSEG7ClassicMini';
		font-style: normal;
		font-weight: 100;
		src: url('/fonts/DSEG7ClassicMini-Regular.woff2') format('woff2');
		font-display: swap;
	}
</style>
