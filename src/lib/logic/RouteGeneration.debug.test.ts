import { describe, expect, it } from 'vitest';
import axios from 'axios';
import * as turf from '@turf/turf';
import { airportFromPlain, airspaceFromPlain } from './transform';
import {
	generateFRTOLRouteFromSeed,
	isOnMatzBoundary,
	isValidMatzTransit,
	measureRouteInteriorKm
} from './RouteGeneration';

const DEV_API = 'http://localhost:5173/api';

describe('RouteGeneration debug seeds', () => {
	it('ddta0jv3 penetrates the chosen MATZ', async () => {
		let airportsRaw: unknown;
		let airspacesRaw: unknown;

		try {
			[airportsRaw, airspacesRaw] = await Promise.all([
				axios.get(`${DEV_API}/airports`, { timeout: 5000 }).then((response) => response.data),
				axios.get(`${DEV_API}/airspaces`, { timeout: 5000 }).then((response) => response.data)
			]);
		} catch {
			return;
		}

		const airports = (airportsRaw as unknown[]).map(airportFromPlain);
		const airspaces = (airspacesRaw as unknown[]).map(airspaceFromPlain);
		const route = generateFRTOLRouteFromSeed('ddta0jv3', airports, airspaces, 20);

		expect(route).toBeDefined();

		const matz = route!.airspaces.find((airspace) => airspace.type === 14);
		expect(matz).toBeDefined();

		const entry = route!.waypoints.find((waypoint) => waypoint.name.includes('Entry'));
		const exit = route!.waypoints.find((waypoint) => waypoint.name.includes('Exit'));
		expect(entry).toBeDefined();
		expect(exit).toBeDefined();

		const locations = route!.waypoints.map((waypoint) => waypoint.location);
		const interiorKm = measureRouteInteriorKm(locations, matz!);
		const entryExitKm = turf.distance(entry!.location, exit!.location, { units: 'kilometers' });

		// Log diagnostics when investigating grazing MATZ contacts.
		console.log({
			start: route!.airports[0].name,
			end: route!.airports[1].name,
			matz: matz!.name,
			entryExitKm,
			interiorKm,
			waypoints: route!.waypoints.map((waypoint) => ({
				name: waypoint.name,
				location: waypoint.location
			}))
		});

		const matzLegStart = locations.indexOf(entry!.location);
		const matzLegEnd = locations.indexOf(exit!.location);
		const matzLegInterior = measureRouteInteriorKm(
			locations.slice(matzLegStart, matzLegEnd + 1),
			matz!
		);

		expect(entryExitKm).toBeGreaterThanOrEqual(2);
		expect(isOnMatzBoundary(entry!.location, matz!)).toBe(true);
		expect(isOnMatzBoundary(exit!.location, matz!)).toBe(true);
		expect(isValidMatzTransit(entry!.location, exit!.location, matz!)).toBe(true);
		expect(interiorKm).toBeGreaterThanOrEqual(2);
		expect(matzLegInterior).toBeGreaterThanOrEqual(2);
		expect(route!.waypoints.filter((waypoint) => waypoint.name.includes('MATZ'))).toHaveLength(2);
	});
});
