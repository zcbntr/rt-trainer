import * as turf from '@turf/turf';
import type * as Leaflet from 'leaflet';
import { getLeaflet } from './leaflet';
import type Airspace from '$lib/logic/aeronautics/Airspace';
import {
	AIRSPACE_LABEL_INSET_KM,
	AIRSPACE_LABEL_MIN_SCREEN_PX,
	getAirspaceLabelPlacement,
	getAirspaceMapLabel,
	getReadableLabelRotation,
	insetRadiusKm,
	isAirspaceLabelVisibleAtZoom,
	type AirspaceLabelPlacement
} from '$lib/logic/aeronautics/airspaceDisplay';
import { AIRSPACE_MATZ_TYPE, getAirspaceColor } from './airspaceHatch';
import { toCoordinatePair, toLeafletLatLng, type LngLat } from '$lib/logic/utils';

const LABEL_FONT = '600 10px system-ui, sans-serif';
const LABEL_CHAR_WIDTH_PX = 5.8;
const LABEL_PADDING_PX = 14;
const MAX_ARC_SPAN_DEG = 72;
const MIN_CIRCULAR_RADIUS_PX = 24;

type ScreenPoint = { x: number; y: number };

const PLACEMENT_CACHE_VERSION = 'v5';
const placementCache = new Map<string, AirspaceLabelPlacement | undefined>();

function getScreenParallelRotation(
	map: Leaflet.Map,
	edge: [LngLat, LngLat] | undefined,
	fallbackBearing: number
): number {
	if (edge) {
		const start = map.latLngToContainerPoint(toLeafletLatLng(edge[0]));
		const end = map.latLngToContainerPoint(toLeafletLatLng(edge[1]));
		let rotation = Math.atan2(end.y - start.y, end.x - start.x);

		if (rotation > Math.PI / 2) rotation -= Math.PI;
		if (rotation < -Math.PI / 2) rotation += Math.PI;

		return rotation;
	}

	return (getReadableLabelRotation(fallbackBearing) * Math.PI) / 180;
}

function getCachedPlacement(airspace: Airspace): AirspaceLabelPlacement | undefined {
	const cacheKey = `${PLACEMENT_CACHE_VERSION}:${airspace.id}`;
	if (placementCache.has(cacheKey)) {
		return placementCache.get(cacheKey);
	}

	const placement = getAirspaceLabelPlacement(airspace.coordinates[0]);
	placementCache.set(cacheKey, placement);
	return placement;
}

function normalizeSweep(startAngle: number, endAngle: number): number {
	let sweep = endAngle - startAngle;
	while (sweep <= -Math.PI) sweep += 2 * Math.PI;
	while (sweep > Math.PI) sweep -= 2 * Math.PI;
	return sweep;
}

function readableTangentRotation(angleRad: number): number {
	let rotation = angleRad + Math.PI / 2;

	while (rotation > Math.PI) rotation -= 2 * Math.PI;
	while (rotation < -Math.PI) rotation += 2 * Math.PI;

	if (rotation > Math.PI / 2) rotation -= Math.PI;
	if (rotation < -Math.PI / 2) rotation += Math.PI;

	return rotation;
}

function isLargeEnoughOnScreen(
	L: typeof Leaflet,
	map: Leaflet.Map,
	ring: [number, number][]
): boolean {
	const bounds = L.latLngBounds(ring.map(toLeafletLatLng));
	const northWest = map.latLngToContainerPoint(bounds.getNorthWest());
	const southEast = map.latLngToContainerPoint(bounds.getSouthEast());
	const width = Math.abs(southEast.x - northWest.x);
	const height = Math.abs(southEast.y - northWest.y);

	return Math.max(width, height) >= AIRSPACE_LABEL_MIN_SCREEN_PX;
}

function drawLabelBackground(
	ctx: CanvasRenderingContext2D,
	metrics: TextMetrics,
	height: number
): void {
	const left = metrics.actualBoundingBoxLeft ?? metrics.width / 2;
	const right = metrics.actualBoundingBoxRight ?? metrics.width / 2;
	const width = left + right + LABEL_PADDING_PX;

	ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
	ctx.fillRect(-width / 2, -height / 2, width, height);
}

function drawStraightLabel(
	ctx: CanvasRenderingContext2D,
	map: Leaflet.Map,
	text: string,
	color: string,
	placement: AirspaceLabelPlacement
): void {
	const point = map.latLngToContainerPoint(toLeafletLatLng(placement.position));
	const rotationRad = getScreenParallelRotation(map, placement.edge, placement.bearing);

	ctx.save();
	ctx.translate(point.x, point.y);
	ctx.rotate(rotationRad);
	ctx.font = LABEL_FONT;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const metrics = ctx.measureText(text);
	drawLabelBackground(ctx, metrics, 12);
	ctx.fillStyle = color;
	ctx.fillText(text, 0, 0);
	ctx.restore();
}

function drawCurvedLabel(
	ctx: CanvasRenderingContext2D,
	text: string,
	center: ScreenPoint,
	radiusPx: number,
	startAngle: number,
	sweep: number,
	color: string
): void {
	const chars = [...text];
	if (chars.length === 0) return;

	ctx.font = LABEL_FONT;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	for (let index = 0; index < chars.length; index++) {
		const t = (index + 0.5) / chars.length;
		const angle = startAngle + sweep * t;
		const x = center.x + radiusPx * Math.cos(angle);
		const y = center.y + radiusPx * Math.sin(angle);
		const rotation = readableTangentRotation(angle);

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rotation);
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.strokeText(chars[index], 0, 0);
		ctx.fillText(chars[index], 0, 0);
		ctx.fillStyle = color;
		ctx.fillText(chars[index], 0, 0);
		ctx.restore();
	}
}

function drawCircularLabel(
	ctx: CanvasRenderingContext2D,
	map: Leaflet.Map,
	text: string,
	color: string,
	placement: AirspaceLabelPlacement
): void {
	if (!placement.circular) return;

	const { circular } = placement;
	const insetKm = insetRadiusKm(circular.radiusKm);
	const centerPx = map.latLngToContainerPoint(toLeafletLatLng(circular.center));
	const midPx = map.latLngToContainerPoint(toLeafletLatLng(placement.position));
	const radiusPx = Math.hypot(midPx.x - centerPx.x, midPx.y - centerPx.y);

	if (radiusPx < MIN_CIRCULAR_RADIUS_PX) return;

	const arcLengthPx = text.length * LABEL_CHAR_WIDTH_PX + LABEL_PADDING_PX;
	let arcSpanDeg = Math.min((arcLengthPx / radiusPx) * (180 / Math.PI), MAX_ARC_SPAN_DEG);

	const startPoint = turf.destination(
		circular.center,
		insetKm,
		circular.midBearing - arcSpanDeg / 2,
		{ units: 'kilometers' }
	);
	const endPoint = turf.destination(
		circular.center,
		insetKm,
		circular.midBearing + arcSpanDeg / 2,
		{ units: 'kilometers' }
	);

	const startPx = map.latLngToContainerPoint(
		toLeafletLatLng(toCoordinatePair(startPoint.geometry.coordinates))
	);
	const endPx = map.latLngToContainerPoint(
		toLeafletLatLng(toCoordinatePair(endPoint.geometry.coordinates))
	);

	const startAngle = Math.atan2(startPx.y - centerPx.y, startPx.x - centerPx.x);
	const endAngle = Math.atan2(endPx.y - centerPx.y, endPx.x - centerPx.x);
	const sweep = normalizeSweep(startAngle, endAngle);

	drawCurvedLabel(ctx, text, centerPx, radiusPx, startAngle, sweep, color);
}

export async function drawAirspaceLabels(
	map: Leaflet.Map,
	canvas: HTMLCanvasElement,
	airspaces: Airspace[],
	enabled: boolean
): Promise<void> {
	const L = await getLeaflet();
	const size = map.getSize();
	const ratio = Math.min(window.devicePixelRatio ?? 1, 2);

	canvas.width = Math.round(size.x * ratio);
	canvas.height = Math.round(size.y * ratio);
	canvas.style.width = `${size.x}px`;
	canvas.style.height = `${size.y}px`;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
	ctx.clearRect(0, 0, size.x, size.y);

	if (!enabled || !isAirspaceLabelVisibleAtZoom(map.getZoom())) return;

	const mapBounds = map.getBounds();

	for (const airspace of airspaces) {
		const ring = airspace.coordinates[0];
		if (!ring || ring.length < 3) continue;

		const bounds = L.latLngBounds(ring.map(toLeafletLatLng));
		if (!mapBounds.intersects(bounds)) continue;
		if (!isLargeEnoughOnScreen(L, map, ring)) continue;

		const placement = getCachedPlacement(airspace);
		if (!placement) continue;

		const label = getAirspaceMapLabel(airspace);
		const color = getAirspaceColor(airspace.type === AIRSPACE_MATZ_TYPE);

		if (placement.circular) {
			drawCircularLabel(ctx, map, label, color, placement);
		} else {
			drawStraightLabel(ctx, map, label, color, placement);
		}
	}
}
