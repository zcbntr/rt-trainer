import { isInAirspace, isAirspaceIncludedInRoute } from '../utils';
import type * as turf from '@turf/turf';

export default class Airspace {
	public id: string;
	public name: string;
	public type: number;
	public icaoClass: number;
	public activity: number;
	public onDemand: boolean;
	public onRequest: boolean;
	public byNotam: boolean;
	public specialAgreement: boolean;
	public requestCompliance: boolean;
	public centrePoint: turf.Position;
	public coordinates: turf.Polygon;
	public country: string;
	public upperLimit: number;
	public lowerLimit: number;
	public upperLimitMax: number;
	public lowerLimitMin: number;

	constructor(
		id: string,
		name: string,
		type: number,
		icaoClass: number,
		activity: number,
		onDemand: boolean,
		onRequest: boolean,
		byNotam: boolean,
		specialAgreement: boolean,
		requestCompliance: boolean,
		centrePoint: turf.Position,
		coordinates: turf.Polygon,
		country: string,
		upperLimit: number,
		lowerLimit: number,
		upperLimitMax: number,
		lowerLimitMin: number
	) {
		this.id = id;
		this.name = name;
		this.type = type;
		this.icaoClass = icaoClass;
		this.activity = activity;
		this.onDemand = onDemand;
		this.onRequest = onRequest;
		this.byNotam = byNotam;
		this.specialAgreement = specialAgreement;
		this.requestCompliance = requestCompliance;
		this.centrePoint = centrePoint;
		this.coordinates = coordinates;
		this.country = country;
		this.upperLimit = upperLimit;
		this.lowerLimit = lowerLimit;
		this.upperLimitMax = upperLimitMax;
		this.lowerLimitMin = lowerLimitMin;
	}

	public getDisplayName(): string {
		if (this.type === 14) {
			return this.name + ' MATZ';
		}
		return this.name + ' ATZ';
	}

	public pointInsideATZ(point: [number, number]): boolean {
		return isInAirspace(point, this);
	}

	public isIncludedInRoute(route: [number, number][]): boolean {
		return isAirspaceIncludedInRoute(route, this);
	}
}
