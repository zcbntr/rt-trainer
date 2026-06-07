<script lang="ts">
	import { resolve } from '$app/paths';
	import { drawer } from '$lib/components/singletons/drawer.svelte';

	function drawerClose(): void {
		drawer.close();
	}
</script>

<nav class="list-nav p-4">
	<ul>
		<li><a href={resolve('/')} onclick={drawerClose}>Home</a></li>
		<li><a href={resolve('/simulator')} onclick={drawerClose}>Quick Scenario</a></li>
		<li><a href={resolve('/scenario-planner')} onclick={drawerClose}>Scenario Planner</a></li>
		<li><a href={resolve('/about')} onclick={drawerClose}>About</a></li>
	</ul>
</nav>
