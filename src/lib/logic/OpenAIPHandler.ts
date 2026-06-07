import axios from 'axios';
import { OPENAIPKEY } from '$env/static/private';
import { getCachedOrFetch } from '$lib/server/openAIPCache';
import type {
	AirportData,
	AirportReportingPointData,
	AirspaceData
} from './aeronautics/OpenAIPTypes';
import Airport from './aeronautics/Airport';
import Runway from './aeronautics/Runway';
import { Frequency } from './Frequency';
import Airspace from './aeronautics/Airspace';

export type AirportReportingPointDBData = {
	name: string;
	coordinates: [number, number];
	compulsory: boolean;
};

export async function getAllValidAirspaceData(): Promise<Airspace[]> {
	const airspaceData = await getAllUKAirspaceFromOpenAIP();
	const airspaces = airspaceData.map((airspaceData) => airspaceDataToAirspace(airspaceData));
	return airspaces;
}

export async function getAllValidAirportData(): Promise<Airport[]> {
	const airportData = await getAllUKAirportsFromOpenAIP();
	const airports = airportData.map((airportData) => airportDataToAirport(airportData));
	airports.filter((airport) => airport.runways && airport.runways.length > 0);
	return airports;
}

export function airportDataToAirport(airportData: AirportData): Airport {
	return new Airport(
		airportData._id,
		airportData.name,
		airportData.icaoCode,
		airportData.iataCode,
		airportData.altIdentifier,
		airportData.type,
		airportData.country,
		airportData.geometry.coordinates,
		airportData.reportingPoints,
		airportData.elevation.value,
		airportData.trafficType,
		airportData.ppr,
		airportData.private,
		airportData.skydiveActivity,
		airportData.winchOnly,
		airportData.runways?.map((runway) => {
			return new Runway(
				runway.designator,
				runway.trueHeading,
				runway.alignedTrueNorth,
				runway.operations,
				runway.mainRunway,
				runway.turnDirection,
				runway.landingOnly,
				runway.takeOffOnly,
				runway.dimension.length.value,
				runway.dimension.length.unit,
				runway.dimension.width.value,
				runway.dimension.width.unit,
				runway.declaredDistance.tora?.value ?? 0,
				runway.declaredDistance.tora?.unit ?? 0,
				runway.declaredDistance.toda?.value ?? 0,
				runway.declaredDistance.toda?.unit ?? 0,
				runway.declaredDistance.asda?.value ?? 0,
				runway.declaredDistance.asda?.unit ?? 0,
				runway.declaredDistance.lda?.value ?? 0,
				runway.declaredDistance.lda?.unit ?? 0,
				runway.thresholdLocation?.geometry.coordinates ?? [0, 0],
				runway.thresholdLocation?.elevation.value ?? 0,
				runway.thresholdLocation?.elevation.unit ?? 0,
				runway.exclusiveAircraftType,
				runway.pilotCtrlLighting,
				runway.lightingSystem,
				runway.visualApproachAids
			);
		}),
		airportData.frequencies?.map((frequency) => {
			return new Frequency(
				frequency.value,
				frequency.unit,
				frequency.name,
				frequency.type,
				frequency.primary
			);
		})
	);
}

export function airspaceDataToAirspace(airspaceData: AirspaceData): Airspace {
	return new Airspace(
		airspaceData._id,
		airspaceData.name,
		airspaceData.type,
		airspaceData.icaoClass,
		airspaceData.activity,
		airspaceData.onDemand,
		airspaceData.onRequest,
		airspaceData.byNotam,
		airspaceData.specialAgreement,
		airspaceData.requestCompliance,
		airspaceData.geometry.coordinates,
		airspaceData.country,
		airspaceData.upperLimit.value,
		airspaceData.lowerLimit.value,
		airspaceData.upperLimitMax?.value,
		airspaceData.lowerLimitMin?.value,
		airspaceData.frequencies?.map((frequency) => {
			return new Frequency(frequency.value, frequency.unit, frequency.name, 0, frequency.primary);
		})
	);
}

export async function getAllUKAirportsFromOpenAIP(): Promise<AirportData[]> {
	return getCachedOrFetch('uk-airports', fetchUKAirportsFromOpenAIP);
}

async function fetchUKAirportsFromOpenAIP(): Promise<AirportData[]> {
	try {
		const response = await axios.get(`https://api.core.openaip.net/api/airports`, {
			headers: {
				'Content-Type': 'application/json',
				'x-openaip-api-key': OPENAIPKEY
			},
			params: {
				country: 'GB',
				type: [0, 2, 3, 9],
				sortBy: 'geometry.coordinates[0]'
			}
		});

		console.log('Fetched all airports from OpenAIP');

		return response.data.items as AirportData[];
	} catch (error: unknown) {
		console.error('Error: ', error);
	}
	return [];
}

export async function getAllUKAirspaceFromOpenAIP(): Promise<AirspaceData[]> {
	return getCachedOrFetch('uk-airspaces', fetchUKAirspacesFromOpenAIP);
}

async function fetchUKAirspacesFromOpenAIP(): Promise<AirspaceData[]> {
	try {
		const response1 = await axios.get(`https://api.core.openaip.net/api/airspaces`, {
			headers: {
				'Content-Type': 'application/json',
				'x-openaip-api-key': OPENAIPKEY
			},
			params: {
				page: 1,
				country: 'GB',
				icaoClass: [1, 2, 3, 4, 5, 6, 8],
				onDemand: false,
				onRequest: false,
				byNotam: false,
				sortBy: 'geometry.coordinates[0][0][0]'
			}
		});

		if (response1.data.items.length === 0) {
			console.log('No airspaces found on page 1');
			return [];
		}

		console.log('Fetched all airspace from OpenAIP');

		return [...response1.data.items] as AirspaceData[];
	} catch (error: unknown) {
		console.error('Error: ', error);
	}
	return [];
}

export async function getAllUKAirportReportingPointsFromOpenAIP(): Promise<
	AirportReportingPointData[]
> {
	return getCachedOrFetch('uk-reporting-points', fetchUKReportingPointsFromOpenAIP);
}

async function fetchUKReportingPointsFromOpenAIP(): Promise<AirportReportingPointData[]> {
	try {
		const response = await axios.get(`https://api.core.openaip.net/api/reporting-points`, {
			headers: {
				'Content-Type': 'application/json',
				'x-openaip-api-key': OPENAIPKEY
			},
			params: {
				country: 'GB',
				sortBy: 'geometry.coordinates[0]'
			}
		});

		console.log('Fetched all airport reporting points from OpenAIP');

		return response.data.items as AirportReportingPointData[];
	} catch (error: unknown) {
		console.error('Error: ', error);
	}
	return [];
}
