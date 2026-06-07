<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="space-y-8 text-center">
	<div class="text-9xl font-extrabold opacity-30">404</div>
	<div class="text-4xl font-bold">You found a secret place</div>
	<p>
		Unfortunately this is only a 404 page. You may have mistyped the address, or something may have
		gone wrong on the server.
	</p>
	<div>
		<a class="anchor" href={resolve('/')}>Take me back to the home page</a>
	</div>
</div>
