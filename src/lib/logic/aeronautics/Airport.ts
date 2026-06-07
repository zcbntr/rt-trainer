import { Frequency } from '../Frequency';
import Runway from './Runway';
import { METORData, METORDataSample } from './METORData';
import type { AirportReportingPointDBData } from '../OpenAIPHandler';
import * as turf from '@turf/turf';
import {
	getRandomFrequency,
	getSeededTimeInMinutes,
	simpleHash,
	toCoordinatePair,
	type LngLat
} from '../utils';

/* Airport data. */
export default class Airport {
	id: string;
	name: string;
	icaoCode: string;
	iataCode: string;
	altIdentifier: string;
	type: number;
	country: string;
	coordinates: LngLat;
	reportingPoints: AirportReportingPointDBData[];
	elevation: number;
	trafficType: number[];
	ppr: boolean;
	private: boolean;
	skydiveActivity: boolean;
	winchOnly: boolean;

	runways: Runway[];

	frequencies: Frequency[];

	metorData: METORData;

	constructor(
		id: string,
		name: string,
		icaoCode: string,
		iataCode: string,
		altIdentifier: string,
		type: number,
		country: string,
		coordinates: LngLat,
		airportReportingPoints: AirportReportingPointDBData[],
		elevation: number,
		trafficType: number[],
		ppr: boolean,
		privateAerodrome: boolean,
		skydiveActivity: boolean,
		winchOnly: boolean,
		runways: Runway[],
		frequencies: Frequency[]
	) {
		this.id = id;
		this.name = name;
		this.icaoCode = icaoCode;
		this.iataCode = iataCode;
		this.altIdentifier = altIdentifier;
		this.type = type;
		this.country = country;
		this.coordinates = coordinates;
		this.reportingPoints = airportReportingPoints;
		this.elevation = elevation;
		this.trafficType = trafficType;
		this.ppr = ppr;
		this.private = privateAerodrome;
		this.skydiveActivity = skydiveActivity;
		this.winchOnly = winchOnly;
		this.runways = runways ?? [];
		this.frequencies = frequencies ?? [];
		// All airports should have coordinates and elevation but for some reason one is always undefined so this gets around it
		if (coordinates != undefined && elevation != undefined) {
			this.metorData = this.generateMETORData(coordinates[1], elevation);
		} else {
			this.metorData = new METORData(180, 10, 8, 1013.25, 0.1, 15, 5, 12, 3);
		}
	}

	public getName(): string {
		return this.name;
	}

	public getShortName(): string {
		return this.name.split(' ')[0];
	}

	public getICAO(): string {
		return this.icaoCode;
	}

	public getElevation(): number {
		return this.elevation;
	}

	public getMETORData(): METORData {
		return this.metorData;
	}

	public getMETORSample(seed: number): METORDataSample {
		return this.metorData.getSample(seed);
	}

	public hasTakeoffRunway(): boolean {
		return this.getUsableTakeoffRunways().length > 0;
	}

	public hasLandingRunway(): boolean {
		return this.getUsableLandingRunways().length > 0;
	}

	private getUsableTakeoffRunways(): Runway[] {
		return this.runways.filter((runway) => !runway.landingOnly);
	}

	private getUsableLandingRunways(): Runway[] {
		return this.runways.filter((runway) => !runway.takeOffOnly);
	}

	public getTakeoffRunway(seed: number): Runway {
		const runways = this.getUsableTakeoffRunways();
		if (runways.length === 0) {
			throw new Error(`No takeoff runway available for ${this.name}`);
		}

		return runways[Math.abs(seed) % runways.length];
	}

	// Needs to be implemented for each aerodrome depending on when pilots move to next frequency from takeoff
	public getTakeoffTransitionAltitude(): number {
		throw new Error('Not implemented');
	}

	public getLandingRunway(seed: number): Runway {
		const runways = this.getUsableLandingRunways();
		if (runways.length === 0) {
			throw new Error(`No landing runway available for ${this.name}`);
		}

		return runways[Math.abs(seed) % runways.length];
	}

	/**
	 * Gets a point some distance in kilometers along the takeoff runway vector
	 * @param seed - Seed of the scenario - determines which runway to use
	 * @param distance - Distance in kilometers
	 * @returns Position of the point
	 */
	public getPointAlongTakeoffRunwayVector(seed: number, distance: number): LngLat {
		const runway = this.getTakeoffRunway(seed);
		return toCoordinatePair(
			turf.destination(this.coordinates, distance, runway.trueHeading, { units: 'kilometers' })
				.geometry.coordinates
		);
	}

	/**
	 * Gets a point some distance in kilometers along the landing runway vector
	 * @param seed - Seed of the scenario - determines which runway to use
	 * @param distance - Distance in kilometers
	 * @returns Position of the point
	 */
	public getPointAlongLandingRunwayVector(seed: number, distance: number): LngLat {
		const runway = this.getLandingRunway(seed);
		return toCoordinatePair(
			turf.destination(this.coordinates, distance, runway.trueHeading, { units: 'kilometers' })
				.geometry.coordinates
		);
	}

	/**
	 * Gets the start time of the scenario in minutes from midnight, given a seed, assuming it is the takeoff airport of the scenario
	 * Range from: 660 (11am) - 900 (3pm)
	 * @param seed - Seed of the scenario
	 * @returns Time in minutes from midnight
	 */
	public getStartTime(seed: number): number {
		// (In minutes)
		// 1pm + (0-4hours) - 2 hours -> 11am - 3pm
		return getSeededTimeInMinutes(seed, 660, 900);
	}

	public getTakeoffTime(seed: number): number {
		return this.getStartTime(seed) + 10;
	}

	public isControlled(): boolean {
		return this.type == 3 || this.type == 9;
	}

	public getParkedFrequency(): Frequency | undefined {
		let groundOrInformationFrequency = this.getGroundFrequency();
		if (groundOrInformationFrequency == undefined) {
			groundOrInformationFrequency = this.getTowerFrequency();
		}
		if (groundOrInformationFrequency == undefined) {
			groundOrInformationFrequency = this.getInformationFrequency();
		}
		if (groundOrInformationFrequency == undefined) {
			groundOrInformationFrequency = this.getAGFrequency();
		}
		if (groundOrInformationFrequency == undefined) {
			groundOrInformationFrequency = new Frequency(
				getRandomFrequency(simpleHash(this.id), this.id),
				9,
				'Ground',
				9,
				true
			);
		}
		return groundOrInformationFrequency;
	}

	public getGroundFrequency(): Frequency | undefined {
		return this.frequencies?.find((frequency) => frequency.type == 9);
	}

	public getInformationFrequency(): Frequency | undefined {
		return this.frequencies?.find((frequency) => frequency.type == 15 || frequency.type == 10);
	}

	public getAGFrequency(): Frequency | undefined {
		return this.frequencies?.find((frequency) => frequency.type == 17);
	}

	public getTowerFrequency(): Frequency | undefined {
		return this.frequencies?.find((frequency) => frequency.type == 14);
	}

	public getApproachFrequency(): Frequency | undefined {
		return this.frequencies?.find((frequency) => frequency.type == 0);
	}

	public getATISLetter(seed: number): string {
		return String.fromCharCode(65 + (seed % 26));
	}

	protected generateMETORData(lat: number, elevation: number): METORData {
		const avgWindDirection = 180;
		const meanWindSpeed = 15;
		const stdWindSpeed = 8;
		const meanPressure = 1013.25 * Math.pow(1 - (6.5 * elevation) / 288150, 5.255); // Formula from https://rechneronline.de/physics/air-pressure-altitude.php
		const stdPressure = 0.5;

		/* Based on a simple model of temperature used by David Waltham in his blog to 
		illustrate the effects of global warming in a simple model.

		T = To – a.sin^2λ
		Where To = average equatorial temp, a = constant, λ = latitude 

		More info:
		https://davidwaltham.com/global-warming-model/
		*/
		const meanTemperature = 30 - 30 * Math.pow(Math.sin((lat * Math.PI) / 180), 2);

		const stdTemperature = 5;
		const meanDewpoint = meanTemperature - 3;
		const stdDewpoint = 1;

		return new METORData(
			avgWindDirection,
			meanWindSpeed,
			stdWindSpeed,
			meanPressure,
			stdPressure,
			meanTemperature,
			stdTemperature,
			meanDewpoint,
			stdDewpoint
		);
	}
}
