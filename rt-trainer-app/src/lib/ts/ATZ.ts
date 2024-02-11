import type { OperatingHours } from './Airport';
import RouteElement from './RouteElement';
import { lineIntersectsPolygon, anyPointsWithinPolygon } from './utils';

export type ATZData = {
	_id: string;
	name: string;
	dataIngestion: boolean;
	type: number;
	icaoClass: number;
	activity: number;
	onDemand: boolean;
	onRequest: boolean;
	byNotam: boolean;
	specialAgreement: boolean;
	requestCompliance: boolean;
	geometry: {
		type: 'Polygon';
		coordinates: [[number, number][]];
	};
	country: string;
	upperLimit: {
		value: number;
		unit: number;
		referenceDatum: number;
	};
	lowerLimit: {
		value: number;
		unit: number;
		referenceDatum: number;
	};
	upperLimitMax: {
		value: number;
		unit: number;
		referenceDatum: number;
	};
	lowerLimitMin: {
		value: number;
		unit: number;
		referenceDatum: number;
	};
	frequencies: [
		{
			_id: string;
			value: string;
			unit: number;
			name: string;
			primary: boolean;
			remarks: string;
		}
	];
	hoursOfOperation: {
		operatingHours: OperatingHours[];
		remarks: string;
	};
	activeFrom: string;
	activeUntil: string;
	remarks: string;
	createdBy: string;
	updatedBy: string;
	createdAt: string;
	updatedAt: string;
};

export default class ATZ extends RouteElement {
	public height: string;
	public type: number;

	constructor(name: string, coords: [number, number][], type: number, height?: string) {
		super(name, coords);
		this.type = type;
		if (height) {
			this.height = height;
		} else {
			this.height = 'GND';
		}
	}

	public getName(): string {
		if (this.type === 14) {
			return this.name + ' MATZ';
		}
		return this.name + ' ATZ';
	}

	public getHeight(): string {
		return this.height;
	}

	public getCoords(): [number, number][] {
		return this.coords;
	}

	public getClosestPointOnEdge(coords: [number, number]): [number, number] {
		return findClosestPoint(coords, this.coords);
	}

	public lineIntersectsATZ(start: [number, number], end: [number, number]): boolean {
		return lineIntersectsPolygon(start, end, this.coords);
	}

	public isIncludedInRoute(route: [number, number][]): boolean {
		return anyPointsWithinPolygon(this.coords, route);
	}
}

function findClosestPoint(
	targetPoint: [number, number],
	pointsList: [number, number][]
): [number, number] | null {
	if (pointsList.length === 0) {
		return null; // No points in the list
	}

	let closestPoint = pointsList[0];
	let minDistance = calculateDistance(targetPoint, closestPoint);

	for (let i = 1; i < pointsList.length; i++) {
		const currentPoint = pointsList[i];
		const distance = calculateDistance(targetPoint, currentPoint);

		if (distance < minDistance) {
			minDistance = distance;
			closestPoint = currentPoint;
		}
	}

	return closestPoint;
}

function calculateDistance(point1: [number, number], point2: [number, number]): number {
	const [x1, y1] = point1;
	const [x2, y2] = point2;
	return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
