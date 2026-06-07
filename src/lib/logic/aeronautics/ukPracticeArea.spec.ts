import { describe, expect, it } from 'vitest';
import {
	describeUnsupportedRouteRegions,
	getRouteUnsupportedRegions,
	isValidUkPracticeWaypoint
} from './ukPracticeArea';

describe('isValidUkPracticeWaypoint', () => {
	it('allows mainland UK locations', () => {
		expect(isValidUkPracticeWaypoint([-0.127, 51.507])).toBe(true);
		expect(isValidUkPracticeWaypoint([-3.188, 55.953])).toBe(true);
		expect(isValidUkPracticeWaypoint([-1.614, 52.192])).toBe(true);
	});

	it('allows UK sea areas inside the planner bounds', () => {
		expect(isValidUkPracticeWaypoint([-1.5, 50.9])).toBe(true);
		expect(isValidUkPracticeWaypoint([-4.0, 57.5])).toBe(true);
	});

	it('allows Northern Ireland', () => {
		expect(isValidUkPracticeWaypoint([-5.93, 54.597])).toBe(true);
	});

	it('rejects the Republic of Ireland', () => {
		expect(isValidUkPracticeWaypoint([-6.26, 53.349])).toBe(false);
		expect(isValidUkPracticeWaypoint([-9.05, 53.27])).toBe(false);
	});

	it('rejects continental Europe inside the planner bounds', () => {
		expect(isValidUkPracticeWaypoint([1.85, 50.95])).toBe(false);
	});

	it('rejects locations outside the UK planner bounds', () => {
		expect(isValidUkPracticeWaypoint([-15, 52])).toBe(false);
		expect(isValidUkPracticeWaypoint([5, 52])).toBe(false);
		expect(isValidUkPracticeWaypoint([-2, 47])).toBe(false);
	});
});

describe('getRouteUnsupportedRegions', () => {
	it('returns no regions for a short UK route', () => {
		expect(getRouteUnsupportedRegions([[-0.127, 51.507], [-3.188, 55.953]])).toEqual([]);
	});

	it('does not flag a direct route from Northern Ireland to England', () => {
		expect(getRouteUnsupportedRegions([[-5.93, 54.597], [-0.127, 51.507]])).toEqual([]);
	});

	it('detects routes crossing the Republic of Ireland', () => {
		expect(getRouteUnsupportedRegions([[-3, 52], [-8, 54]])).toContain('republic-of-ireland');
	});

	it('detects routes crossing continental Europe', () => {
		expect(getRouteUnsupportedRegions([[-0.5, 50.8], [2, 50.8]])).toContain('continental-europe');
	});
});

describe('describeUnsupportedRouteRegions', () => {
	it('formats a single region', () => {
		expect(describeUnsupportedRouteRegions(['republic-of-ireland'])).toContain(
			'Republic of Ireland'
		);
	});

	it('formats multiple regions', () => {
		const message = describeUnsupportedRouteRegions(['republic-of-ireland', 'continental-europe']);

		expect(message).toContain('Republic of Ireland');
		expect(message).toContain('continental Europe');
		expect(message).toContain(' and ');
	});
});
