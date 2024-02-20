import type Airspace from './AeronauticalClasses/Airspace';

export enum EmergencyType {
	None = 'None',
	EngineFailure = 'Engine Failure',
	RelayEmergency = 'Relay Emergency'
}

/* Represents location, heading altitude and airSpeed of the aircraft. Term borrowed from robotics */
export type Pose = {
	lat: number;
	long: number;
	magneticHeading: number;
	trueHeading: number;
	altitude: number;
	airSpeed: number;
};

export enum FrequencyType {
	Information = 'Information',
	Tower = 'Tower',
	Ground = 'Ground',
	Radar = 'Radar',
	None = 'None'
}

export enum FlightRules {
	IFR = 'IFR', // Instrument Flight Rules
	VFR = 'VFR' // Visual Flight Rules
}

export type FrequencyChangePoint = {
	oldAirspace: Airspace | undefined;
	newAirspace: Airspace | undefined;
	coordinates: [number, number];
};
