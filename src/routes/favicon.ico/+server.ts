import type { RequestHandler } from '@sveltejs/kit';
import favicon from '$lib/assets/favicon.ico';

export const GET: RequestHandler = async ({ fetch }) => {
	const response = await fetch(favicon);

	if (!response.ok) {
		return new Response('Not found', { status: 404 });
	}

	return new Response(await response.arrayBuffer(), {
		headers: {
			'Content-Type': 'image/x-icon',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
