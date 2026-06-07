import { describe, expect, it } from 'vitest';
import RadioCall from './RadioCall';
import type Scenario from './Scenario';

const mockScenario = { seed: 'test' } as Scenario;

describe('RadioCall target callsign validation', () => {
	it('accepts calls starting with A/G station names when slash is normalised', () => {
		const radioCall = new RadioCall(
			'TRURO A/G, student Golf Oscar Foxtrot Lima Yankee, request radio check on One Two Niner Decimal Eight Zero Zero',
			mockScenario,
			'STUDENT',
			'G-OFLY',
			false,
			false,
			'TRURO A/G',
			'129.800',
			'129.800',
			'7000',
			'Cessna 172'
		);

		expect(radioCall.assertCallStartsWithTargetCallsign(true)).toBe(true);
		expect(radioCall.assertCallContainsCurrentRadioFrequency(true)).toBe(true);
		expect(radioCall.getFeedback().getSevereMistakes()).toEqual([]);
	});

	it('accepts radio check calls that state the current frequency phonetically', () => {
		const radioCall = new RadioCall(
			'Ground, student Golf Oscar Foxtrot Lima Yankee, request radio check on One One Eight Decimal Five Four Zero',
			mockScenario,
			'STUDENT',
			'G-OFLY',
			false,
			false,
			'Ground',
			'118.540',
			'118.540',
			'7000',
			'Cessna 172'
		);

		expect(radioCall.assertCallContainsCurrentRadioFrequency(true)).toBe(true);
		expect(radioCall.getFeedback().getSevereMistakes()).toEqual([]);
	});

	it('accepts fiver and niner as alternative frequency number words', () => {
		const radioCall = new RadioCall(
			'Ground, student Golf Oscar Foxtrot Lima Yankee, request radio check on One One Eight Decimal Fiver Four Zero',
			mockScenario,
			'STUDENT',
			'G-OFLY',
			false,
			false,
			'Ground',
			'118.540',
			'118.540',
			'7000',
			'Cessna 172'
		);

		expect(radioCall.assertCallContainsCurrentRadioFrequency(true)).toBe(true);
		expect(radioCall.getFeedback().getSevereMistakes()).toEqual([]);
	});

	it('accepts niner when the expected frequency phonetics also use niner', () => {
		const radioCall = new RadioCall(
			'Ground, student Golf Oscar Foxtrot Lima Yankee, request radio check on One Two Niner Decimal Eight Zero Zero',
			mockScenario,
			'STUDENT',
			'G-OFLY',
			false,
			false,
			'Ground',
			'129.800',
			'129.800',
			'7000',
			'Cessna 172'
		);

		expect(radioCall.assertCallContainsCurrentRadioFrequency(true)).toBe(true);
		expect(radioCall.getFeedback().getSevereMistakes()).toEqual([]);
	});
});
