import type { LngLat } from '../utils';

export default class ReportingPoint {
	id: string;
	name: string;
	compulsory: boolean;
	coordinates: LngLat;
	country: string;
	elevation?: number;

	constructor(
		id: string,
		name: string,
		compulsory: boolean,
		coordinates: LngLat,
		country: string,
		elevation?: number
	) {
		this.id = id;
		this.name = name;
		this.compulsory = compulsory;
		this.coordinates = coordinates;
		this.country = country;
		this.elevation = elevation;
	}
}
