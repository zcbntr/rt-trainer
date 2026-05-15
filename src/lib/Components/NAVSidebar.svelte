<script lang="ts">
		const drawerStore = getDrawerStore();

	function drawerClose(): void {
		drawerStore.close();
	}
</script>

<nav class="list-nav p-4">
	<ul>
		<li><a href="/" onclick={drawerClose}>Home</a></li>
		<li><a href="/simulator" onclick={drawerClose}>Quick Scenario</a></li>
		<li><a href="/scenario-planner" onclick={drawerClose}>Scenario Planner</a></li>
		<li><a href="/about" onclick={drawerClose}>About</a></li>
	</ul>
</nav>
