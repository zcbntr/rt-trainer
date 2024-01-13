

import smallAerodromes from '../../data/small_aerodromes.json';
import largeAerodromes from '../../data/large_aerodromes.json';
import { haversineDistance, seededNormalDistribution } from './utils';
import { FrequencyType, type Aerodrome, type RadioFrequency, type METORDataSample, type METORData } from './SimulatorTypes';
import type { Seed } from './ServerClientTypes';
import type { RoutePoint } from './RouteStates';

const MAX_AERODROME_DISTANCE = 100000; // 100km

// enum Season {
// 	Spring,
// 	Summer,
// 	Autumn,
// 	Winter
// }

function getSmallAerodromesFromJSON(): Aerodrome[] {
	const aerodromes: Aerodrome[] = [];

	smallAerodromes.forEach((aerodrome) => {
		const radioFrequencies: RadioFrequency[] = [];
		aerodrome.comFrequencies.forEach((comFrequency) => {
			let frequencyType: FrequencyType;
			switch (comFrequency.frequencyType) {
				case 'AFIS':
					frequencyType = FrequencyType.AFIS;
					break;
				case 'GND':
					frequencyType = FrequencyType.GND;
					break;
				case 'TWR':
					frequencyType = FrequencyType.TWR;
					break;
				default:
					frequencyType = FrequencyType.TWR;
					break;
			}

			radioFrequencies.push({
				frequencyType: frequencyType,
				frequency: comFrequency.frequency,
				callsign: comFrequency.callsign
			});
		});

		aerodromes.push({
			name: aerodrome.name,
			icao: aerodrome.icao,
			comFrequencies: radioFrequencies,
			runways: aerodrome.runways,
			location: aerodrome.location,
			altitude: aerodrome.altitude,
			startPoint: aerodrome.startPoint,
			metorData: aerodrome.metorData
		});
	});

	return aerodromes;
}

function getLargeAerodromesFromJSON(): Aerodrome[] {
	const aerodromes: Aerodrome[] = [];

	largeAerodromes.forEach((aerodrome) => {
		const radioFrequencies: RadioFrequency[] = [];
		aerodrome.comFrequencies.forEach((comFrequency) => {
			let frequencyType: FrequencyType;
			switch (comFrequency.frequencyType) {
				case 'AFIS':
					frequencyType = FrequencyType.AFIS;
					break;
				case 'GND':
					frequencyType = FrequencyType.GND;
					break;
				case 'TWR':
					frequencyType = FrequencyType.TWR;
					break;
				default:
					frequencyType = FrequencyType.TWR;
					break;
			}

			radioFrequencies.push({
				frequencyType: frequencyType,
				frequency: comFrequency.frequency,
				callsign: comFrequency.callsign
			});
		});

		aerodromes.push({
			name: aerodrome.name,
			icao: aerodrome.icao,
			comFrequencies: radioFrequencies,
			runways: aerodrome.runways,
			location: aerodrome.location,
			altitude: aerodrome.altitude,
			startPoint: aerodrome.startPoint,
			metorData: aerodrome.metorData
		});
	});

	return aerodromes;
}

/* Route generated for a scenario. */
export default class Route {
	protected points: RoutePoint[] = [];

	/* Get a start aerodrome. */
	public static getStartAerodrome(seed: Seed): Aerodrome {
		if (seed.scenarioSeed % 2 === 0) {
			return getLargeAerodromesFromJSON()[seed.scenarioSeed % largeAerodromes.length];
		}
		return getSmallAerodromesFromJSON()[seed.scenarioSeed % smallAerodromes.length];
	}

	/* Get an end aerodrome that is within the maximum distance from the start aerodrome. */
	public static getEndAerodrome(seed: Seed): Aerodrome {
		const startAerodrome: Aerodrome = Route.getStartAerodrome(seed);
		const possibleEndAerodromes: Aerodrome[] = [];

		if (seed.scenarioSeed % 2 === 0) {
			possibleEndAerodromes.push(...getSmallAerodromesFromJSON());
		} else {
			possibleEndAerodromes.push(...getLargeAerodromesFromJSON());
		}

		let endAerodrome: Aerodrome = possibleEndAerodromes[seed.scenarioSeed % largeAerodromes.length];
		let endAerodromeFound: boolean = false;

		// If the end aerodrome is too far from the start aerodrome, find a new one
		for (let i = 0; i < 1000; i++) {
			const distance = haversineDistance(startAerodrome.location, endAerodrome.location);

			if (distance <= MAX_AERODROME_DISTANCE) {
				endAerodromeFound = true;
				break;
			}

			endAerodrome = possibleEndAerodromes[(seed.scenarioSeed + i) % largeAerodromes.length];
		}

		if (!endAerodromeFound) {
			throw new Error(
				'Could not find an end aerodrome within the maximum distance: ' +
					MAX_AERODROME_DISTANCE +
					'm'
			);
		}

		return endAerodrome;
	}

	public static getMETORSample(
		seed: Seed,
		metorData: METORData
	): METORDataSample {
		// let season: Season = Season.Spring;
		let meanTemperature: number = 0.0;

		switch (seed.weatherSeed % 4) {
			case 0:
				// season = Season.Spring;
				meanTemperature = metorData.meanTemperature * 1.3;
				break;
			case 1:
				// season = Season.Summer;
				meanTemperature = metorData.meanTemperature * 1.7;
				break;
			case 2:
				// season = Season.Autumn;
				meanTemperature = metorData.meanTemperature * 1.1;
				break;
			case 3:
				// season = Season.Winter;
				meanTemperature = metorData.meanTemperature * 0.4;
				break;
		}

		// Simulate temperature, wind direction, wind speed and pressure with a normal distribution
		const wind_direction =
			seededNormalDistribution(seed.weatherSeed.toString(), metorData.avgWindDirection, 10.0) % 360.0;

		const temperature = seededNormalDistribution(seed.weatherSeed.toString(), meanTemperature, metorData.stdTemperature);

		const wind_speed = seededNormalDistribution(
			seed.weatherSeed.toString(),
			metorData.meanWindSpeed,
			metorData.stdWindSpeed
		);

		const pressure = seededNormalDistribution(
			seed.weatherSeed.toString(),
			metorData.meanPressure,
			metorData.stdTemperature
		);

		return {
			windDirection: wind_direction,
			windSpeed: wind_speed,
			pressure: pressure,
			temperature: temperature,
			dewpoint: temperature * 0.95 - 1.2 // Basic dewpoint aproximation - not based on any actual formula
		};
	}

	/* Generate the route based off of the seed. */
	public generateRoute(seed: number): RoutePoint[] {
		const startAerodromeRoutePoints: RoutePoint[] = getStartAerodromeStates(seed);

		for (let i = 0; i < startAerodromeRoutePoints.length; i++)
			this.points.push(startAerodromeRoutePoints[i]);

		this.points.push(...getEnrouteWaypoints(seed));

		const endAerodromeStates: RoutePoint[] = getEndAerodromeStates(seed);

		for (let i = 0; i < endAerodromeStates.length; i++)
			this.points.push(endAerodromeStates[i]);

		console.log('Route points:');
		for (let i = 0; i < this.points.length; i++) {
			console.log(this.points[i]);
		}

		return this.points;
	}

	public getPoints(): RoutePoint[] {
		return this.points;
	}

	public getStartPoint(): RoutePoint {
		return this.points[0];
	}

	public getEndPoint(): RoutePoint {
		return this.points[this.points.length - 1];
	}
}
