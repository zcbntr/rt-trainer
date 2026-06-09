import { getAllValidNavaidData } from '$lib/logic/OpenAIPHandler';
import { error, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const navaids = await getAllValidNavaidData();

	if (!navaids) {
		error(404, 'Navaids not found');
	}

	return new Response(JSON.stringify(navaids), {
		headers: {
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
