import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import {
	AIRSPACE_LABEL_MAX_ARC_SPAN_DEG,
	getAirspaceLabelPlacement,
	insetRadiusKm,
	type AirspaceLabelPlacement
} from './airspaceDisplay';
import { toCoordinatePair, type LngLat } from '../utils';

function closeRing(ring: LngLat[]): LngLat[] {
	if (ring.length === 0) return ring;
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring;
	return [...ring, first];
}

function circleRing(center: LngLat, radiusKm: number, segments = 32): LngLat[] {
	const coords: LngLat[] = [];
	for (let index = 0; index < segments; index++) {
		const bearing = (index / segments) * 360;
		const point = turf.destination(center, radiusKm, bearing, { units: 'kilometers' });
		coords.push(toCoordinatePair(point.geometry.coordinates));
	}
	return coords;
}

function unionPolygonRings(features: Feature<Polygon>[]): LngLat[] {
	const merged = turf.union(turf.featureCollection(features));
	if (!merged) throw new Error('Union failed');

	if (merged.geometry.type === 'MultiPolygon') {
		const rings = merged.geometry.coordinates.map((polygonCoords) => polygonCoords[0] as LngLat[]);
		return rings.reduce((largest, ring) =>
			turf.area(turf.polygon([closeRing(ring)])) > turf.area(turf.polygon([closeRing(largest)]))
				? ring
				: largest
		);
	}

	return merged.geometry.coordinates[0] as LngLat[];
}

function stadiumRing(center: LngLat, lengthKm: number, widthKm: number, segments = 16): LngLat[] {
	const halfLength = lengthKm / 2;
	const radius = widthKm / 2;
	const [lng, lat] = center;
	const latOffset = radius / 111;
	const lngOffset = radius / (111 * Math.cos((lat * Math.PI) / 180));
	const lengthOffset = halfLength / 111;
	const lengthLngOffset = halfLength / (111 * Math.cos((lat * Math.PI) / 180));

	const coords: LngLat[] = [];

	for (let index = 0; index <= segments; index++) {
		const angle = Math.PI / 2 + (index / segments) * Math.PI;
		coords.push([
			lng + lengthLngOffset + Math.cos(angle) * lngOffset,
			lat + Math.sin(angle) * latOffset
		]);
	}
	coords.push([lng + lengthLngOffset, lat - latOffset]);
	coords.push([lng - lengthLngOffset, lat - latOffset]);

	for (let index = 0; index <= segments; index++) {
		const angle = (3 * Math.PI) / 2 + (index / segments) * Math.PI;
		coords.push([
			lng - lengthLngOffset + Math.cos(angle) * lngOffset,
			lat + Math.sin(angle) * latOffset
		]);
	}
	coords.push([lng - lengthLngOffset, lat + latOffset]);
	coords.push([lng + lengthLngOffset, lat + latOffset]);

	return coords;
}

function assertPlacementInside(ring: LngLat[], placement: AirspaceLabelPlacement): void {
	const polygon = turf.polygon([closeRing(ring)]);
	expect(turf.booleanPointInPolygon(turf.point(placement.position), polygon)).toBe(true);

	if (!placement.circular) return;

	expect(turf.booleanPointInPolygon(turf.point(placement.circular.center), polygon)).toBe(true);

	const insetKm = insetRadiusKm(placement.circular.radiusKm);
	const halfArc = AIRSPACE_LABEL_MAX_ARC_SPAN_DEG / 2;

	for (
		let bearing = placement.circular.midBearing - halfArc;
		bearing <= placement.circular.midBearing + halfArc;
		bearing += 8
	) {
		const arcPoint = turf.destination(placement.circular.center, insetKm, bearing, {
			units: 'kilometers'
		});
		expect(turf.booleanPointInPolygon(arcPoint, polygon)).toBe(true);
	}
}

describe('getAirspaceLabelPlacement', () => {
	it('uses curved placement for a circular airspace', () => {
		const ring = circleRing([-1.42, 52.19], 4);
		const placement = getAirspaceLabelPlacement(ring);

		expect(placement).toBeDefined();
		expect(placement?.circular).toBeDefined();
		assertPlacementInside(ring, placement!);
	});

	it('keeps labels inside two overlapping circular lobes', () => {
		const left = turf.circle([-1.46, 52.19], 5, { units: 'kilometers', steps: 32 });
		const right = turf.circle([-1.38, 52.19], 5, { units: 'kilometers', steps: 32 });
		const ring = unionPolygonRings([left, right]);
		const placement = getAirspaceLabelPlacement(ring);

		expect(placement).toBeDefined();
		expect(placement?.circular).toBeUndefined();
		assertPlacementInside(ring, placement!);
	});

	it('keeps labels inside a stadium-shaped airspace', () => {
		const ring = stadiumRing([-1.42, 52.19], 10, 4, 20);
		const placement = getAirspaceLabelPlacement(ring);

		expect(placement).toBeDefined();
		expect(placement?.circular).toBeUndefined();
		assertPlacementInside(ring, placement!);
	});

	it('keeps labels inside a rectangle with semicircular end caps', () => {
		const body = turf.polygon([
			[
				[-1.55, 52.17],
				[-1.29, 52.17],
				[-1.29, 52.21],
				[-1.55, 52.21],
				[-1.55, 52.17]
			]
		]);
		const westCap = turf.circle([-1.55, 52.19], 2, { units: 'kilometers', steps: 24 });
		const eastCap = turf.circle([-1.29, 52.19], 2, { units: 'kilometers', steps: 24 });
		const ring = unionPolygonRings([body, westCap, eastCap]);
		const placement = getAirspaceLabelPlacement(ring);

		expect(placement).toBeDefined();
		expect(placement?.circular).toBeUndefined();
		assertPlacementInside(ring, placement!);
	});
});
