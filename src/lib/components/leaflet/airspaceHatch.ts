import * as turf from '@turf/turf';
import type * as Leaflet from 'leaflet';
import { toLeafletLatLng } from '$lib/logic/utils';

export const AIRSPACE_MATZ_TYPE = 14;

export const ATZ_COLOR = '#2563eb';
export const MATZ_COLOR = '#dc2626';

/** Screen-space band width when zoomed in with hatch lines. */
export const MAX_BAND_WIDTH_PIXELS = 18;
/** Screen-space band width when zoomed out (translucent fill only). */
export const MIN_BAND_WIDTH_PIXELS = 6;

/** Translucent fill, matched to the outline colour. */
export const AIRSPACE_FILL_OPACITY = 0.1;

/** Fixed screen-pixel spacing between hatch lines. */
const PATTERN_SIZE_PX = 8;

/** Zoom at and above which the full hatch band is shown. */
const HATCH_MIN_ZOOM = 10;
/** Zoom at and below which the narrow fill-only band is used. */
const FILL_BAND_MAX_ZOOM = 8;

/** When the band reaches this fraction of the airspace radius, merge to a full fill. */
const MERGE_COVERAGE_THRESHOLD = 0.6;

const BAND_WIDTH_PIXEL_FRACTIONS = [1, 0.5, 0.25] as const;

export type AirspaceFillMode = 'hatch-band' | 'fill-band' | 'full-fill';

export type AirspaceFillStyle = {
	mode: AirspaceFillMode;
	latLngs: Leaflet.LatLngExpression[] | Leaflet.LatLngExpression[][];
	fillColor: string;
	fillOpacity: number;
};

type LeafletSvgRenderer = Leaflet.SVG & {
	_container?: SVGSVGElement;
};

const rendererByMap = new WeakMap<Leaflet.Map, LeafletSvgRenderer>();
const registeredPatterns = new WeakMap<Leaflet.Map, Set<string>>();

function getRendererSvgElement(renderer: Leaflet.SVG): SVGSVGElement {
	const svg = (renderer as LeafletSvgRenderer)._container;
	if (!svg) {
		throw new Error('SVG renderer container is not initialized');
	}

	return svg;
}

export function ensureRendererInitialized(
	map: Leaflet.Map,
	renderer: Leaflet.SVG
): LeafletSvgRenderer {
	const svgRenderer = renderer as LeafletSvgRenderer;
	if (!svgRenderer._container && !map.hasLayer(renderer)) {
		renderer.addTo(map);
	}

	return svgRenderer;
}

function closeRing(ring: [number, number][]): [number, number][] {
	if (ring.length === 0) return ring;

	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring;

	return [...ring, first];
}

/** Converts a screen-pixel distance at the current map zoom into kilometres for turf buffering. */
export function bandWidthKmFromPixels(map: Leaflet.Map, bandWidthPixels: number): number {
	const center = map.getCenter();
	const centerPoint = map.latLngToLayerPoint(center);
	const edgeLatLng = map.layerPointToLatLng(
		centerPoint.add([bandWidthPixels, 0] as Leaflet.PointExpression)
	);

	return center.distanceTo(edgeLatLng) / 1000;
}

/** Approximate airspace radius in screen pixels (centroid to farthest vertex). */
export function getAirspaceRadiusPixels(ring: [number, number][], map: Leaflet.Map): number {
	const closedRing = closeRing(ring);
	const centroid = turf.centroid(turf.polygon([closedRing]));
	const centerPoint = map.latLngToLayerPoint(
		toLeafletLatLng(centroid.geometry.coordinates as [number, number])
	);

	let maxDistance = 0;
	for (const coord of closedRing) {
		const point = map.latLngToLayerPoint(toLeafletLatLng(coord));
		maxDistance = Math.max(maxDistance, centerPoint.distanceTo(point));
	}

	return maxDistance;
}

export function getEffectiveBandWidthPixels(map: Leaflet.Map): number {
	const zoom = map.getZoom();

	if (zoom >= HATCH_MIN_ZOOM) return MAX_BAND_WIDTH_PIXELS;
	if (zoom <= FILL_BAND_MAX_ZOOM) return MIN_BAND_WIDTH_PIXELS;

	const t = (zoom - FILL_BAND_MAX_ZOOM) / (HATCH_MIN_ZOOM - FILL_BAND_MAX_ZOOM);
	return MIN_BAND_WIDTH_PIXELS + t * (MAX_BAND_WIDTH_PIXELS - MIN_BAND_WIDTH_PIXELS);
}

export function getHatchBandRings(
	ring: [number, number][],
	map: Leaflet.Map,
	bandWidthPixels: number = getEffectiveBandWidthPixels(map)
): { outer: [number, number][]; hole: [number, number][] } | null {
	const closedRing = closeRing(ring);
	const outer = turf.polygon([closedRing]);

	for (const fraction of BAND_WIDTH_PIXEL_FRACTIONS) {
		const bandWidthKm = bandWidthKmFromPixels(map, bandWidthPixels * fraction);
		const inner = turf.buffer(outer, -bandWidthKm, { units: 'kilometers' });
		if (!inner) continue;

		return {
			outer: closedRing,
			hole: inner.geometry.coordinates[0] as [number, number][]
		};
	}

	return null;
}

function bandLatLngsFromRings(bands: {
	outer: [number, number][];
	hole: [number, number][];
}): Leaflet.LatLngExpression[][] {
	return [bands.outer.map(toLeafletLatLng), bands.hole.map(toLeafletLatLng).reverse()];
}

export function getAirspaceFillStyle(
	ring: [number, number][],
	map: Leaflet.Map,
	isMatz: boolean,
	patternId: string
): AirspaceFillStyle | null {
	const closedRing = closeRing(ring);
	const color = getAirspaceColor(isMatz);
	const bandWidthPixels = getEffectiveBandWidthPixels(map);
	const radiusPixels = getAirspaceRadiusPixels(ring, map);
	const shouldMergeToFullFill =
		radiusPixels > 0 && bandWidthPixels / radiusPixels >= MERGE_COVERAGE_THRESHOLD;

	if (shouldMergeToFullFill) {
		return {
			mode: 'full-fill',
			latLngs: closedRing.map(toLeafletLatLng),
			fillColor: color,
			fillOpacity: AIRSPACE_FILL_OPACITY
		};
	}

	const bands = getHatchBandRings(ring, map, bandWidthPixels);
	if (!bands) {
		return {
			mode: 'full-fill',
			latLngs: closedRing.map(toLeafletLatLng),
			fillColor: color,
			fillOpacity: AIRSPACE_FILL_OPACITY
		};
	}

	const latLngs = bandLatLngsFromRings(bands);

	if (map.getZoom() >= HATCH_MIN_ZOOM) {
		return {
			mode: 'hatch-band',
			latLngs,
			fillColor: `url(#${patternId})`,
			fillOpacity: 1
		};
	}

	return {
		mode: 'fill-band',
		latLngs,
		fillColor: color,
		fillOpacity: AIRSPACE_FILL_OPACITY
	};
}

export function getAirspaceColor(isMatz: boolean): string {
	return isMatz ? MATZ_COLOR : ATZ_COLOR;
}

export function getHatchPatternId(map: Leaflet.Map, isMatz: boolean): string {
	const colorKey = isMatz ? 'matz' : 'atz';
	return `airspace-hatch-${colorKey}-${map.getContainer().id || 'map'}`;
}

function createHatchPattern(id: string, color: string): SVGPatternElement {
	const ns = 'http://www.w3.org/2000/svg';
	const pattern = document.createElementNS(ns, 'pattern');

	pattern.setAttribute('id', id);
	pattern.setAttribute('patternUnits', 'userSpaceOnUse');
	pattern.setAttribute('width', String(PATTERN_SIZE_PX));
	pattern.setAttribute('height', String(PATTERN_SIZE_PX));
	pattern.setAttribute('patternTransform', 'rotate(45)');

	const background = document.createElementNS(ns, 'rect');
	background.setAttribute('width', String(PATTERN_SIZE_PX));
	background.setAttribute('height', String(PATTERN_SIZE_PX));
	background.setAttribute('fill', color);
	background.setAttribute('fill-opacity', String(AIRSPACE_FILL_OPACITY));

	const line = document.createElementNS(ns, 'line');
	line.setAttribute('x1', '0');
	line.setAttribute('y1', '0');
	line.setAttribute('x2', '0');
	line.setAttribute('y2', String(PATTERN_SIZE_PX));
	line.setAttribute('stroke', color);
	line.setAttribute('stroke-width', '1.5');

	pattern.appendChild(background);
	pattern.appendChild(line);
	return pattern;
}

export function ensureHatchPattern(
	map: Leaflet.Map,
	renderer: Leaflet.SVG,
	isMatz: boolean
): string {
	const patternId = getHatchPatternId(map, isMatz);
	const color = getAirspaceColor(isMatz);
	const registered = registeredPatterns.get(map) ?? new Set<string>();

	if (registered.has(patternId)) return patternId;

	const svg = getRendererSvgElement(ensureRendererInitialized(map, renderer));
	let defs = svg.querySelector('defs');
	if (!defs) {
		defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		svg.insertBefore(defs, svg.firstChild);
	}

	defs.appendChild(createHatchPattern(patternId, color));
	registered.add(patternId);
	registeredPatterns.set(map, registered);

	return patternId;
}

export function getSharedSvgRenderer(
	L: typeof import('leaflet'),
	map: Leaflet.Map
): LeafletSvgRenderer {
	const existing = rendererByMap.get(map);
	if (existing) return existing;

	const renderer = L.svg({ padding: 0.5 });
	if (!renderer) {
		throw new Error('SVG renderer is not available in this browser');
	}

	ensureRendererInitialized(map, renderer);
	rendererByMap.set(map, renderer as LeafletSvgRenderer);
	return renderer as LeafletSvgRenderer;
}

export function applyAirspaceFillStyle(polygon: Leaflet.Polygon, style: AirspaceFillStyle): void {
	polygon.setLatLngs(style.latLngs);
	polygon.setStyle({
		stroke: false,
		fill: true,
		fillColor: style.fillColor,
		fillOpacity: style.fillOpacity
	});
}
