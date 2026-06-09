import type { LngLat } from '../utils';

const NAVAID_TYPE_NAMES: Record<number, string> = {
	0: 'DME',
	1: 'TACAN',
	2: 'NDB',
	3: 'VOR',
	4: 'VOR-DME',
	5: 'VORTAC',
	6: 'DVOR',
	7: 'DVOR-DME',
	8: 'DVORTAC'
};

export default class Navaid {
	id: string;
	name: string;
	identifier: string;
	type: number;
	country: string;
	coordinates: LngLat;
	frequency?: string;
	frequencyUnit?: number;
	elevation?: number;

	constructor(
		id: string,
		name: string,
		identifier: string,
		type: number,
		country: string,
		coordinates: LngLat,
		frequency?: string,
		frequencyUnit?: number,
		elevation?: number
	) {
		this.id = id;
		this.name = name;
		this.identifier = identifier;
		this.type = type;
		this.country = country;
		this.coordinates = coordinates;
		this.frequency = frequency;
		this.frequencyUnit = frequencyUnit;
		this.elevation = elevation;
	}

	getTypeName(): string {
		return NAVAID_TYPE_NAMES[this.type] ?? 'Navaid';
	}

	getDisplayLabel(): string {
		return this.identifier || this.name;
	}
}
