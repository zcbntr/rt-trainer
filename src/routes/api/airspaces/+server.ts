import { getAllValidAirspaceData } from '$lib/logic/OpenAIPHandler';
import { error, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const airspaces = await getAllValidAirspaceData();

	if (!airspaces) {
		error(404, 'Airspaces not found');
	}

	return new Response(JSON.stringify(airspaces), {
		headers: {
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
