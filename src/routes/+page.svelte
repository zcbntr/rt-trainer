<script lang="ts">
	import { goto } from '$app/navigation';
	import SvgDisplay from '$lib/components/SVGDisplay.svelte';
	import { ClearSimulationStores } from '$lib/stores';
	import { resolve } from '$app/paths';
</script>

<div class="container mx-auto max-w-5xl p-5 tracking-wide">
	<div class="grid grid-cols-1 gap-5 md:grid-cols-12">
		<div class="space-y-4 p-4 md:col-span-6">
			<h1 class="text-3xl leading-10 font-bold md:text-5xl">
				RT Trainer - A <span
					class="x-1 relative inset-y-1 bg-surface-300-700 px-1 transition-transform duration-300 ease-in-out hover:scale-110 hover:rotate-3 md:px-3"
					>responsive</span
				> FRTOL practice tool
			</h1>
			<p class="max-w-xl opacity-60">
				Gain confidence in your radio telephony skills by practicing with our RT trainer directly in
				your browser.
			</p>
			<ul class="list-items">
				<li>
					<span class="btn-icon shrink-0 bg-surface-300-700 py-0">✔️</span>
					<span>
						<b>Supports voice input</b> – speak your radio calls out loud, just like in real life
					</span>
				</li>
				<li>
					<span class="btn-icon shrink-0 bg-surface-300-700">✔️</span>
					<span>
						<b>Generate practice scenarios</b> – routes are generated randomly, no more repetition
					</span>
				</li>
				<li>
					<span class="btn-icon shrink-0 bg-surface-300-700">✔️</span>
					<span>
						<b>Get instant feedback</b> – see how well you did and where you can improve
					</span>
				</li>
			</ul>
			<div class="flex flex-wrap gap-4">
				<button
					onclick={() => {
						ClearSimulationStores();
						goto(resolve('/simulator?tutorial=true'));
					}}
					class="btn w-full preset-filled-primary-500 md:w-fit md:btn-lg"
					data-sveltekit-preload-data="hover">Quick route</button
				>
				<button
					onclick={() => {
						ClearSimulationStores();
						goto(resolve('/scenario-planner'));
					}}
					class="btn w-full preset-filled-surface-500 md:w-fit md:btn-lg"
					data-sveltekit-preload-data="hover">Create a scenario</button
				>
			</div>
		</div>

		<SvgDisplay name="planeHero" width="500px" height="500px" class="my-2 p-2 sm:col-span-6" />
	</div>
</div>

<style>
	.list-items li {
		display: flex;
		gap: 16px;
		padding: 12px 0px;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
	}
</style>
