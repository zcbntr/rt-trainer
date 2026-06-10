import * as turf from '@turf/turf';
import type { Feature, Point, Polygon } from 'geojson';
import type Airspace from './Airspace';
import { toCoordinatePair, type LngLat } from '../utils';

const AIRSPACE_TYPE_ABBREVIATIONS: Record<number, string> = {
	0: 'OTHER',
	1: 'R',
	2: 'D',
	3: 'P',
	4: 'CTR',
	5: 'TMZ',
	6: 'RMZ',
	7: 'TMA',
	8: 'TRA',
	9: 'TSA',
	10: 'FIR',
	11: 'UIR',
	12: 'ADIZ',
	13: 'ATZ',
	14: 'MATZ',
	15: 'AWY',
	16: 'MTR',
	17: 'ALERT',
	18: 'WARN',
	19: 'PA',
	20: 'HTZ',
	21: 'GLD',
	22: 'TRP',
	23: 'TIZ',
	24: 'TIA',
	25: 'MTA',
	26: 'CTA',
	27: 'ACC',
	28: 'ASRA',
	29: 'LAOR',
	30: 'MRT',
	31: 'TFR',
	32: 'VFR',
	33: 'FIS',
	34: 'LTA',
	35: 'UTA',
	36: 'MCTR'
};

const FLIGHT_LEVEL_UNIT = 6;
const FEET_UNIT = 1;
const GROUND_REFERENCE_DATUM = 0;

function closeRing(ring: LngLat[]): LngLat[] {
	if (ring.length === 0) return ring;

	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring;

	return [...ring, first];
}

export type CircularLabelGeometry = {
	center: LngLat;
	radiusKm: number;
	midBearing: number;
};

export function getAirspaceTypeAbbreviation(type: number): string {
	return AIRSPACE_TYPE_ABBREVIATIONS[type] ?? 'AS';
}

export function formatAirspaceVerticalLimit(
	value: number,
	unit: number = FLIGHT_LEVEL_UNIT,
	referenceDatum?: number
): string {
	if (referenceDatum === GROUND_REFERENCE_DATUM && value === 0) {
		return 'SFC';
	}

	if (unit === FLIGHT_LEVEL_UNIT) {
		return `FL${value}`;
	}

	if (unit === FEET_UNIT) {
		if (value >= 1000) {
			return `FL${Math.round(value / 100)}`;
		}
		return `${value}ft`;
	}

	const feet = Math.round(value * 3.28084);
	if (feet >= 1000) {
		return `FL${Math.round(feet / 100)}`;
	}
	return `${feet}ft`;
}

export function getAirspaceMapLabel(airspace: Airspace): string {
	const typeLabel = getAirspaceTypeAbbreviation(airspace.type);
	const lowerLabel = formatAirspaceVerticalLimit(
		airspace.lowerLimit,
		airspace.lowerLimitUnit,
		airspace.lowerLimitReferenceDatum
	);
	const upperLabel = formatAirspaceVerticalLimit(
		airspace.upperLimit,
		airspace.upperLimitUnit,
		airspace.upperLimitReferenceDatum
	);

	return `${typeLabel} ${lowerLabel} - ${upperLabel}`;
}

/** Distance to offset labels inward from the border line. */
export const AIRSPACE_LABEL_INSET_KM = 0.55;

/** Labels are hidden below this map zoom level. */
export const AIRSPACE_LABEL_MIN_ZOOM = 10;

/** Minimum on-screen size before a label is shown, even when zoom is high enough. */
export const AIRSPACE_LABEL_MIN_SCREEN_PX = 100;

/** Maximum arc span when drawing curved labels on circular airspaces. */
export const AIRSPACE_LABEL_MAX_ARC_SPAN_DEG = 72;

const CIRCULAR_COMPACTNESS_THRESHOLD = 0.62;
const CIRCULAR_RADIUS_CV_THRESHOLD = 0.1;
const CIRCULAR_MIN_VERTICES = 14;
const CIRCULAR_ARC_VALIDATION_STEP_DEG = 8;
/** Simplification tolerance in degrees (~70 m in southern UK). */
const LABEL_RING_SIMPLIFY_TOLERANCE = 0.0006;
const MIN_LABEL_EDGE_KM = 0.08;

export type AirspaceLabelPlacement = {
	position: LngLat;
	bearing: number;
	/** Endpoints of the boundary edge the label is aligned to. */
	edge?: [LngLat, LngLat];
	circular?: CircularLabelGeometry;
};

type EdgeSegment = {
	start: LngLat;
	end: LngLat;
	lengthKm: number;
	bearing: number;
	midpoint: Feature<Point>;
};

export function getCircularAirspaceGeometry(ring: LngLat[]): CircularLabelGeometry {
	const closed = closeRing(ring);
	const vertices = closed.slice(0, -1);
	const centroid = turf.centroid(turf.polygon([closed]));
	const centerCoords = toCoordinatePair(centroid.geometry.coordinates);

	const distances = vertices.map((vertex) =>
		turf.distance(centerCoords, vertex, { units: 'kilometers' })
	);
	const radiusKm = distances.reduce((sum, distance) => sum + distance, 0) / distances.length;

	return {
		center: centerCoords,
		radiusKm,
		midBearing: 0
	};
}

export function insetRadiusKm(radiusKm: number): number {
	return Math.max(radiusKm - AIRSPACE_LABEL_INSET_KM, radiusKm * 0.82);
}

function polygonCompactness(ring: LngLat[]): number | undefined {
	const closed = closeRing(ring);
	const polygon = turf.polygon([closed]);
	const areaM2 = turf.area(polygon);
	if (areaM2 <= 0) return undefined;

	const perimeterM = turf.length(turf.lineString(closed), { units: 'meters' });
	return (4 * Math.PI * areaM2) / (perimeterM * perimeterM);
}

function radiusCoefficientOfVariation(ring: LngLat[]): number | undefined {
	const closed = closeRing(ring);
	const vertices = closed.slice(0, -1);
	if (vertices.length === 0) return undefined;

	const centroid = turf.centroid(turf.polygon([closed]));
	const centerCoords = toCoordinatePair(centroid.geometry.coordinates);
	const distances = vertices.map((vertex) =>
		turf.distance(centerCoords, vertex, { units: 'kilometers' })
	);
	const mean = distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
	if (mean <= 0) return undefined;

	const variance =
		distances.reduce((sum, distance) => sum + (distance - mean) ** 2, 0) / distances.length;

	return Math.sqrt(variance) / mean;
}

function isUniformlyCircular(ring: LngLat[]): boolean {
	if (ring.length < CIRCULAR_MIN_VERTICES) return false;

	const compactness = polygonCompactness(ring);
	if (compactness == null || compactness < CIRCULAR_COMPACTNESS_THRESHOLD) return false;

	const radiusCv = radiusCoefficientOfVariation(ring);
	return radiusCv != null && radiusCv <= CIRCULAR_RADIUS_CV_THRESHOLD;
}

function isPointInsideRing(point: LngLat, ring: LngLat[]): boolean {
	return turf.booleanPointInPolygon(turf.point(point), turf.polygon([closeRing(ring)]));
}

function validateCircularPlacement(ring: LngLat[], placement: AirspaceLabelPlacement): boolean {
	if (!placement.circular) return false;

	const polygon = turf.polygon([closeRing(ring)]);
	if (!turf.booleanPointInPolygon(turf.point(placement.position), polygon)) return false;
	if (!turf.booleanPointInPolygon(turf.point(placement.circular.center), polygon)) return false;

	const insetKm = insetRadiusKm(placement.circular.radiusKm);
	const halfArc = AIRSPACE_LABEL_MAX_ARC_SPAN_DEG / 2;

	for (
		let bearing = placement.circular.midBearing - halfArc;
		bearing <= placement.circular.midBearing + halfArc;
		bearing += CIRCULAR_ARC_VALIDATION_STEP_DEG
	) {
		const arcPoint = turf.destination(placement.circular.center, insetKm, bearing, {
			units: 'kilometers'
		});
		if (!turf.booleanPointInPolygon(arcPoint, polygon)) return false;
	}

	return true;
}

function simplifyRingForLabeling(ring: LngLat[]): LngLat[] {
	const closed = closeRing(ring);
	if (closed.length <= 5) return closed;

	try {
		const simplified = turf.simplify(turf.lineString(closed), {
			tolerance: LABEL_RING_SIMPLIFY_TOLERANCE,
			highQuality: true
		});
		const coordinates = simplified.geometry.coordinates as LngLat[];
		if (coordinates.length < 4) return closed;
		return closeRing(coordinates);
	} catch {
		return closed;
	}
}

function edgeSegment(start: LngLat, end: LngLat): EdgeSegment {
	return {
		start,
		end,
		lengthKm: turf.distance(start, end, { units: 'kilometers' }),
		bearing: turf.bearing(start, end),
		midpoint: turf.midpoint(start, end)
	};
}

function findBestLabelEdge(
	closed: LngLat[],
	polygon: Feature<Polygon>
): EdgeSegment | undefined {
	const centroid = turf.centroid(polygon);
	let best: EdgeSegment | undefined;
	let bestScore = -1;

	for (let index = 0; index < closed.length - 1; index++) {
		const segment = edgeSegment(closed[index], closed[index + 1]);
		if (segment.lengthKm < MIN_LABEL_EDGE_KM) continue;

		const position = offsetPointInsidePolygon(segment.midpoint, segment.bearing, polygon);
		if (!position) continue;

		const distToCenterKm = turf.distance(centroid, turf.point(position), { units: 'kilometers' });
		const score = segment.lengthKm / (1 + distToCenterKm);

		if (score > bestScore) {
			bestScore = score;
			best = segment;
		}
	}

	return best;
}

function getNearestEdge(point: LngLat, closed: LngLat[]): EdgeSegment {
	const pointFeature = turf.point(point);
	let nearest = edgeSegment(closed[0], closed[1]);
	let nearestDistanceKm = Infinity;

	for (let index = 0; index < closed.length - 1; index++) {
		const segment = edgeSegment(closed[index], closed[index + 1]);
		const line = turf.lineString([segment.start, segment.end]);
		const snapped = turf.nearestPointOnLine(line, pointFeature);
		const distanceKm = turf.distance(point, snapped.geometry.coordinates, { units: 'kilometers' });

		if (distanceKm < nearestDistanceKm) {
			nearestDistanceKm = distanceKm;
			nearest = segment;
		}
	}

	return nearest;
}

function placementFromEdge(
	segment: EdgeSegment,
	polygon: Feature<Polygon>
): AirspaceLabelPlacement | undefined {
	const position = offsetPointInsidePolygon(segment.midpoint, segment.bearing, polygon);
	if (!position) return undefined;

	return {
		position,
		bearing: segment.bearing,
		edge: [segment.start, segment.end]
	};
}

function getInteriorLabelPlacement(ring: LngLat[], closed: LngLat[]): AirspaceLabelPlacement {
	const polygon = turf.polygon([closeRing(ring)]);
	const interiorPoint = turf.pointOnFeature(polygon);
	const position = toCoordinatePair(interiorPoint.geometry.coordinates);
	const nearestEdge = getNearestEdge(position, closed);

	return {
		position,
		bearing: nearestEdge.bearing,
		edge: [nearestEdge.start, nearestEdge.end]
	};
}

function offsetPointInsidePolygon(
	midpoint: Feature<Point>,
	bearing: number,
	polygon: Feature<Polygon>
): LngLat | undefined {
	const inwardCandidates = [
		turf.destination(midpoint, AIRSPACE_LABEL_INSET_KM, bearing + 90, { units: 'kilometers' }),
		turf.destination(midpoint, AIRSPACE_LABEL_INSET_KM, bearing - 90, { units: 'kilometers' })
	];

	const inwardPoint = inwardCandidates.find((candidate) =>
		turf.booleanPointInPolygon(candidate, polygon)
	);

	return inwardPoint
		? toCoordinatePair(inwardPoint.geometry.coordinates)
		: toCoordinatePair(midpoint.geometry.coordinates);
}

/** Converts a geographic edge bearing into a readable CSS rotation angle. */
export function getReadableLabelRotation(bearing: number): number {
	let rotation = 90 - bearing;

	while (rotation > 180) rotation -= 360;
	while (rotation < -180) rotation += 360;

	if (rotation > 90) rotation -= 180;
	if (rotation < -90) rotation += 180;

	return rotation;
}

export function isAirspaceLabelVisibleAtZoom(zoom: number): boolean {
	return zoom >= AIRSPACE_LABEL_MIN_ZOOM;
}

function getStraightLabelPlacement(ring: LngLat[]): AirspaceLabelPlacement {
	const closed = closeRing(ring);
	const polygon = turf.polygon([closed]);
	const simplified = simplifyRingForLabeling(ring);
	const labelEdge = findBestLabelEdge(simplified, polygon);

	if (labelEdge) {
		const edgePlacement = placementFromEdge(labelEdge, polygon);
		if (edgePlacement && isPointInsideRing(edgePlacement.position, ring)) {
			return edgePlacement;
		}
	}

	return getInteriorLabelPlacement(ring, simplified);
}

/** Places a label inside the airspace, parallel to a straight border where possible. */
export function getAirspaceLabelPlacement(ring: LngLat[]): AirspaceLabelPlacement | undefined {
	if (ring.length < 3) return undefined;

	if (isUniformlyCircular(ring)) {
		const circularPlacement = getCircularLabelPlacement(ring);
		if (validateCircularPlacement(ring, circularPlacement)) {
			return circularPlacement;
		}
	}

	return getStraightLabelPlacement(ring);
}

function getCircularLabelPlacement(ring: LngLat[]): AirspaceLabelPlacement {
	const circular = getCircularAirspaceGeometry(ring);
	const midPoint = turf.destination(circular.center, insetRadiusKm(circular.radiusKm), circular.midBearing, {
		units: 'kilometers'
	});

	return {
		position: toCoordinatePair(midPoint.geometry.coordinates),
		bearing: 0,
		circular
	};
}
