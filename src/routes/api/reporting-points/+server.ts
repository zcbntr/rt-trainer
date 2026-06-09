import { getAllValidReportingPointData } from '$lib/logic/OpenAIPHandler';
import { error, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const reportingPoints = await getAllValidReportingPointData();

	if (!reportingPoints) {
		error(404, 'Reporting points not found');
	}

	return new Response(JSON.stringify(reportingPoints), {
		headers: {
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
