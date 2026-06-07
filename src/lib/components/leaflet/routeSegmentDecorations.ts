import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import { fromLeafletLatLng, toLeafletLatLng, type LatLng } from '$lib/logic/utils';

/** Adjust these values to change how often direction carets are placed along a route leg. */
export const ROUTE_SEGMENT_ARROW_DEFAULTS = {
	spacingMeters: 20_000,
	shortSegmentThresholdMeters: 1_000,
	shortSegmentPlacementRatio: 0.6,
	firstArrowOffsetRatio: 0.5
} as const;

export type RouteSegmentArrow = {
	latLng: LatLng;
	rotation: number;
};

export function getRouteSegmentArrows(start: LatLng, end: LatLng): RouteSegmentArrow[] {
	const startLngLat = fromLeafletLatLng(start);
	const endLngLat = fromLeafletLatLng(end);
	const line = turf.lineString([startLngLat, endLngLat]);
	const lengthMeters = turf.length(line, { units: 'meters' });
	const bearing = turf.bearing(turf.point(startLngLat), turf.point(endLngLat));

	if (lengthMeters < ROUTE_SEGMENT_ARROW_DEFAULTS.shortSegmentThresholdMeters) {
		return [
			arrowAtDistance(
				line,
				lengthMeters * ROUTE_SEGMENT_ARROW_DEFAULTS.shortSegmentPlacementRatio,
				bearing
			)
		];
	}

	const spacing = Math.min(ROUTE_SEGMENT_ARROW_DEFAULTS.spacingMeters, lengthMeters / 2);
	const arrows: RouteSegmentArrow[] = [];

	for (
		let distanceMeters = spacing * ROUTE_SEGMENT_ARROW_DEFAULTS.firstArrowOffsetRatio;
		distanceMeters < lengthMeters;
		distanceMeters += spacing
	) {
		arrows.push(arrowAtDistance(line, distanceMeters, bearing));
	}

	if (arrows.length === 0) {
		arrows.push(
			arrowAtDistance(
				line,
				lengthMeters * ROUTE_SEGMENT_ARROW_DEFAULTS.shortSegmentPlacementRatio,
				bearing
			)
		);
	}

	return arrows;
}

function arrowAtDistance(
	line: Feature<LineString>,
	distanceMeters: number,
	bearing: number
): RouteSegmentArrow {
	const point = turf.along(line, distanceMeters / 1000, { units: 'kilometers' });
	return {
		latLng: toLeafletLatLng(point.geometry.coordinates as [number, number]),
		rotation: bearing
	};
}
