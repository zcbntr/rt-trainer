import { AirborneStage, LandingStage, StartAerodromeStage } from '$lib/logic/ScenarioStages';
import type RadioCall from './RadioCall';

function isStageIn(stages: Record<string, string>, stage: string): boolean {
	return Object.values(stages).includes(stage);
}

export default class Results {
	private radioCalls: RadioCall[];

	constructor(radioCalls: RadioCall[]) {
		this.radioCalls = radioCalls;
	}

	public isEmpty(): boolean {
		return this.radioCalls.length === 0;
	}

	public getRadioCalls(): RadioCall[][] {
		if (this.radioCalls.length === 0) {
			return [];
		}

		const callsByCallType: RadioCall[][] = [];
		let currentCalls: RadioCall[] = [];
		let stage: string = this.radioCalls[0].getCurrentScenarioPoint().stage;
		for (let i = 0; i < this.radioCalls.length; i++) {
			const radioCall = this.radioCalls[i];

			if (radioCall.getCurrentScenarioPoint().stage === stage) {
				currentCalls.push(radioCall);
			} else {
				callsByCallType.push(currentCalls);
				stage = radioCall.getCurrentScenarioPoint().stage;
				currentCalls = [radioCall];
			}
		}
		callsByCallType.push(currentCalls);

		return callsByCallType;
	}

	public getStartUpAndTaxiCalls(): RadioCall[][] {
		const calls = this.getRadioCalls();
		if (calls.length === 0) {
			return [];
		}
		return calls.filter((group) =>
			isStageIn(StartAerodromeStage, group[0].getCurrentScenarioPoint().stage)
		);
	}

	public getAirborneCalls(): RadioCall[][] {
		const calls = this.getRadioCalls();
		if (calls.length === 0) {
			return [];
		}
		return calls.filter((group) =>
			isStageIn(AirborneStage, group[0].getCurrentScenarioPoint().stage)
		);
	}

	public getLandingCalls(): RadioCall[][] {
		const calls = this.getRadioCalls();
		if (calls.length === 0) {
			return [];
		}
		return calls.filter((group) =>
			isStageIn(LandingStage, group[0].getCurrentScenarioPoint().stage)
		);
	}
}
