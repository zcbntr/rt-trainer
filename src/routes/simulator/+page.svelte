<script lang="ts">
	import { run } from 'svelte/legacy';

	import { page } from '$app/stores';
	import type { WaypointURLObject } from '$lib/logic/ScenarioTypes';
	import Waypoint from '$lib/logic/aeronautics/Waypoint';
	import { dialog } from '$lib/components/singletons/dialog.svelte';
	import { toaster } from '$lib/components/singletons/toaster';
	import QuickLoadScenarioDataModal from '$lib/components/dialogs/QuickLoadScenarioDataModal.svelte';
	import { generateScenario } from '$lib/logic/ScenarioGenerator';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import {
		RadioStateStore,
		TransponderStateStore,
		UserMessageStore,
		MostRecentlyReceivedMessageStore,
		CurrentTargetStore,
		ScenarioStore,
		AircraftDetailsStore,
		SpeechOutputEnabledStore,
		ExpectedUserMessageStore,
		CurrentTargetFrequencyStore,
		RadioCallsHistoryStore,
		LiveFeedbackStore,
		CurrentScenarioPointIndexStore,
		EndPointIndexStore,
		TutorialStore,
		AltimeterStateStore,
		WaypointPointsMapStore,
		WaypointsStore,
		OnRouteAirspacesStore,
		CurrentScenarioPointStore,
		CurrentScenarioContextStore,
		SpeechNoiseStore,
		AllAirportsStore,
		AllAirspacesStore,
		OnRouteAirportsStore,
		StartPointIndexStore,
		fetchAirports,
		fetchAirspaces
	} from '$lib/stores';
	import { isCallsignStandardRegistration, replaceWithPhoneticAlphabet } from '$lib/logic/utils';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import RadioCall from '$lib/logic/RadioCall';
	import Polyline from '$lib/components/leaflet/Polyline.svelte';
	import Polygon from '$lib/components/leaflet/Polygon.svelte';
	import Popup from '$lib/components/leaflet/Popup.svelte';
	import Marker from '$lib/components/leaflet/Marker.svelte';
	import { WaypointType } from '$lib/logic/aeronautics/Waypoint';
	import type * as Leaflet from 'leaflet';
	import Parser, { type ParseResult } from '$lib/logic/Parser';
	import Radio from '$lib/components/simulator/Radio.svelte';
	import Transponder from '$lib/components/simulator/Transponder.svelte';
	import MessageOutput from '$lib/components/simulator/MessageOutput.svelte';
	import MessageInput from '$lib/components/simulator/MessageInput.svelte';
	import Altimeter from '$lib/components/simulator/Altimeter.svelte';
	import Map from '$lib/components/leaflet/Map.svelte';

	// Scenario settings
	let seed: string = '';
	let hasEmergencies: boolean = false;
	let callsign: string = 'G-OFLY';
	let prefix: string = '';
	let aircraftType: string = 'Cessna 172';

	// Flag to check if critical data is missing and the user must be prompted to enter it
	let criticalDataMissing: boolean = $state(false);

	let airportIDs: string[] = [];

	// Check whether the seed is specified - if not then warn user
	const seedString: string | null = $page.url.searchParams.get('seed');
	if (seedString != null && seedString != '') {
		seed = seedString;
	} else {
		criticalDataMissing = true;
	}

	const hasEmergenciesString: string | null = $page.url.searchParams.get('hasEmergencies');
	if (hasEmergenciesString != null) {
		hasEmergencies = hasEmergenciesString === 'true';
	}

	// Get waypoints from the URL's JSON.stringify form
	const waypointsString: string | null = $page.url.searchParams.get('waypoints');
	if (waypointsString != null) {
		const waypointsDataArray: WaypointURLObject[] = JSON.parse(waypointsString);
		WaypointsStore.set(
			waypointsDataArray.map(
				(waypoint) =>
					new Waypoint(
						waypoint.name,
						waypoint.location,
						waypoint.type,
						waypoint.index,
						waypoint.referenceObjectId
					)
			)
		);
	} else {
		criticalDataMissing = true;
	}

	// Get airports from the URL's JSON.stringify form
	const airportsString: string | null = $page.url.searchParams.get('airports');
	if (airportsString != null) {
		airportIDs = airportsString.split(',');
	} else {
		criticalDataMissing = true;
	}

	// Check whether the callsign is specified
	const callsignString: string | null = $page.url.searchParams.get('callsign');
	if (callsignString != null && callsignString != '') {
		callsign = callsignString;
	}

	// Check whether the prefix is specified
	const prefixString: string | null = $page.url.searchParams.get('prefix');
	if (prefixString != null) {
		if (
			prefixString == '' ||
			prefixString == 'STUDENT' ||
			prefixString == 'HELICOPTER' ||
			prefixString == 'POLICE' ||
			prefixString == 'SUPER' ||
			prefixString == 'FASTJET' ||
			prefixString == 'FASTPROP'
		) {
			prefix = prefixString;
		}
	}

	// Check whether the aircraft type is specified
	const aircraftTypeString: string | null = $page.url.searchParams.get('aircraftType');
	if (aircraftTypeString != null && aircraftTypeString != '') {
		aircraftType = aircraftTypeString;
	}

	// Check whether start point index has been set
	let startPointIndex: number = 0;
	const startPointIndexString: string | null = $page.url.searchParams.get('startPoint');
	if (startPointIndexString != null) {
		startPointIndex = parseInt(startPointIndexString);
		if (startPointIndex < 0) {
			startPointIndex = 0;
		}
	}

	// Check whether end point index has been set
	let endPointIndex: number = -1;
	const endPointIndexString: string | null = $page.url.searchParams.get('endPoint');
	if (endPointIndexString != null) {
		endPointIndex = parseInt(endPointIndexString);
		if (endPointIndex < 0 || endPointIndex >= startPointIndex) {
			endPointIndex = -1;
		}
	}

	let tutorial: boolean = false;
	const tutorialString: string | null = $page.url.searchParams.get('tutorial');
	if (tutorialString != null) {
		tutorial = tutorialString === 'true';
	}

	$effect(() => {
		if ($AllAirspacesStore.length === 0) fetchAirspaces();
		if ($AllAirportsStore.length === 0) fetchAirports();
	});

	if (criticalDataMissing) {
		// Set a short timeout then trigger modal to load scenario data
		setTimeout(() => {
			dialog.trigger({
				type: 'component',
				component: QuickLoadScenarioDataModal,
				response: (r) => {
					if (r && typeof r === 'object' && 'scenarioSeed' in r) {
						const data = r as { scenarioSeed: string; hasEmergencies: boolean };
						seed = data.scenarioSeed;
						hasEmergencies = data.hasEmergencies;
						loadScenario();
					}
				}
			});
		}, 1000);
	}

	function loadScenario() {
		try {
			const scenario = generateScenario(
				seed,
				get(WaypointsStore),
				get(OnRouteAirportsStore),
				get(OnRouteAirspacesStore),
				hasEmergencies
			);
			ScenarioStore.set(scenario);

			if (endPointIndex == -1) {
				EndPointIndexStore.set(scenario.scenarioPoints.length - 1);
			} else {
				EndPointIndexStore.set(endPointIndex);
			}
		} catch (e) {
			console.error(e);
		}
	}

	ScenarioStore.set(undefined);
	CurrentScenarioPointIndexStore.set(startPointIndex);
	StartPointIndexStore.set(startPointIndex);

	TutorialStore.set(tutorial);
	AircraftDetailsStore.set({
		callsign: callsign,
		prefix: prefix,
		aircraftType: aircraftType
	});

	let failedAttempts: number = 0;
	let currentRadioCall: RadioCall;

	// Page settings
	let speechRecognitionSupported: boolean = $state(false);
	let tutorialStep4: boolean = $state(false);

	let tutorialComplete: boolean = $state(false);
	let tutorialStep: number = 1;

	// Server state
	let awaitingRadioCallCheck: boolean = false;
	let serverNotResponding: boolean = false;
	let nullRoute: boolean = false;

	const aircraftPosition = $derived.by((): [number, number] => {
		const pos = $CurrentScenarioPointStore?.pose.position;
		if (!pos) return [0, 0];
		return [pos[1], pos[0]];
	});

	const displayHeading = $derived(
		$CurrentScenarioPointStore?.pose.trueHeading
			? $CurrentScenarioPointStore.pose.trueHeading - 45
			: 0
	);

	/**
	 * Reads out the current atc message using the speech synthesis API, with added static noise
	 *
	 * @remarks
	 * If the speech synthesis API is not supported in the current browser, then an error is logged to the console.
	 *
	 * @returns void
	 */
	function TTSWithNoise(noiseLevel: number): void {
		if ('speechSynthesis' in window) {
			// Get the speech synthesis API and audio context
			const synth = window.speechSynthesis;
			const audioContext = new AudioContext();

			// Create speech synthesis utterance and noise buffer
			const speech = new SpeechSynthesisUtterance(get(MostRecentlyReceivedMessageStore));
			const noiseBuffer = generateStaticNoise(45, speech.rate * 44100);
			const noiseSource = new AudioBufferSourceNode(audioContext, { buffer: noiseBuffer });
			const gainNode = new GainNode(audioContext);
			synth.speak(speech);

			// Adjust the gain based on the noise level
			gainNode.gain.value = noiseLevel;

			// Connect nodes
			noiseSource.connect(gainNode).connect(audioContext.destination);
			noiseSource.start();

			// Stop the noise after the speech has finished
			speech.onend = () => {
				noiseSource.stop();
			};
		} else {
			console.error('SpeechSynthesis API is not supported in this browser.');
		}
	}

	/**
	 * Generates static noise for the speech synthesis API in the form of an AudioBuffer
	 * @param duration - The duration of the noise in seconds
	 * @param sampleRate - The sample rate of the noise
	 *
	 * @returns AudioBuffer
	 */
	function generateStaticNoise(duration: number, sampleRate: number) {
		const bufferSize = sampleRate * duration;
		const buffer = new AudioBuffer({ length: bufferSize, numberOfChannels: 1, sampleRate });
		const data = buffer.getChannelData(0);

		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		return buffer;
	}

	/**
	 * Checks the client state (radio frequency, transponder frequency, ...) matches the server state
	 *
	 * @remarks
	 * This function checks the client state against the server state to ensure the client is in the correct state to make a radio call.
	 *
	 * @returns boolean
	 */
	function checkClientSimStateCorrect(): boolean {
		const radioState = get(RadioStateStore);
		const transponderState = get(TransponderStateStore);
		const altimeterState = get(AltimeterStateStore);
		const scenario = get(ScenarioStore);

		if (radioState.dialMode == 'OFF') {
			dialog.trigger({
				type: 'alert',
				title: 'Error',
				body: 'Radio is off'
			});
			return false;
		} else if (transponderState.dialMode == 'OFF') {
			dialog.trigger({
				type: 'alert',
				title: 'Error',
				body: 'Transponder is off'
			});
			return false;
		} else if (
			radioState.activeFrequency != scenario?.getCurrentPoint().updateData.currentTargetFrequency
		) {
			dialog.trigger({
				type: 'alert',
				title: 'Error',
				body: 'Radio frequency incorrect'
			});
			return false;
		} else if (
			transponderState.frequency !=
			scenario?.getCurrentPoint().updateData.currentTransponderFrequency
		) {
			dialog.trigger({
				type: 'alert',
				title: 'Error',
				body: 'Transponder frequency incorrect'
			});
			return false;
		} else if (altimeterState.pressure != scenario?.getCurrentPoint().updateData.currentPressure) {
			// dialog.trigger({
			// 	type: 'alert',
			// 	title: 'Error',
			// 	body: 'Altimeter pressure setting incorrect'
			// });
			// return false;
		}

		return true;
	}

	/**
	 * Handles the feedback from the parser
	 *
	 * @remarks
	 * This function handles the feedback given by and adjusts the simulator state accordingly.
	 * A modal is shown if the user has made 3 mistakes in a row, asking if they want to be given the correct call.
	 *
	 * @param parseResult - The result of parsing
	 * @returns void
	 */
	function handleFeedback(parseResult: ParseResult): boolean {
		// Update stores with the radio call and feedback
		const feedback = parseResult.feedback;

		currentRadioCall.setFeedback(feedback);
		RadioCallsHistoryStore.update((value) => {
			value.push(currentRadioCall);
			return value;
		});

		if (get(LiveFeedbackStore)) {
			toaster.dismiss();

			if (!feedback.isFlawless()) {
				toaster.warning({
					title: 'Mistakes',
					description: feedback.getMistakes().join('\n'),
					duration: 15000
				});
			}
		}

		// Get whether there are severe mistakes, and record all minor ones
		let callsignMentioned: boolean = currentRadioCall.callContainsUserCallsign();
		let minorMistakes: string[] = feedback.getMinorMistakes();
		let severeMistakes: string[] = feedback.getSevereMistakes();

		// Handle mistakes
		if (severeMistakes.length > 0) {
			failedAttempts++;

			if (failedAttempts >= 3) {
				dialog.trigger({
					type: 'confirm',
					title: 'Mistake',
					body: 'Do you want to be given the correct call?',
					response: (r) => {
						if (r) {
							ExpectedUserMessageStore.set(parseResult.expectedUserCall);
						} else {
							failedAttempts = -7;
						}
					}
				});

				return false;
			}

			// Make ATC respond with say again and do not advance the simulator
			if (callsignMentioned) {
				const aircraftDetails = get(AircraftDetailsStore);
				if (isCallsignStandardRegistration(aircraftDetails.callsign)) {
					MostRecentlyReceivedMessageStore.set(
						aircraftDetails.prefix +
							' ' +
							replaceWithPhoneticAlphabet(aircraftDetails.callsign) +
							' Say Again'
					);
				} else {
					MostRecentlyReceivedMessageStore.set(
						aircraftDetails.prefix + ' ' + aircraftDetails.callsign + ' Say Again'
					);
				}
			} else {
				MostRecentlyReceivedMessageStore.set('Station Calling, Say Again Your Callsign');
			}

			return false;
		} else if (minorMistakes.length > 0) {
			toaster.info({
				title: 'Almost',
				description: `Correct with minor mistakes:\n${minorMistakes.join('\n')}.`
			});
		} else {
			toaster.success({
				title: 'Correct',
				description: 'Your call was correct.'
			});
		}

		tutorialStep4 = true;
		// Reset failed attempts
		failedAttempts = 0;

		return true;
	}

	/**
	 * Handles the submit radio message event
	 *
	 * @remarks
	 * This function handles the submit event and checks the user's radio call.
	 * Gives feedback, adjusting the simulator state accordingly.
	 *
	 * @returns void
	 */
	function handleSubmit() {
		const userMessage = get(UserMessageStore);
		const scenario = get(ScenarioStore);
		const aircraftDetails = get(AircraftDetailsStore);
		const transponderState = get(TransponderStateStore);
		const radioState = get(RadioStateStore);

		if (
			userMessage == undefined ||
			userMessage == '' ||
			userMessage == 'Enter your radio message here.'
		) {
			return;
		}

		if (scenario == undefined) {
			console.log('Error: No route');
			dialog.trigger({
				type: 'alert',
				title: 'Scenario Error',
				body: 'No scenario is loaded. Refresh the page to try again.'
			});
			return;
		}

		// Ensure the client state is correct for this call
		// (adjustable elements e.g. transponder frequency)
		if (!checkClientSimStateCorrect()) {
			return;
		}

		console.log('User message: ' + userMessage);

		// Create radio call object
		currentRadioCall = new RadioCall(
			userMessage,
			scenario,
			aircraftDetails.prefix,
			aircraftDetails.callsign,
			scenario.getCurrentPoint().updateData.callsignModified,
			transponderState.vfrHasExecuted,
			get(CurrentTargetStore),
			get(CurrentTargetFrequencyStore),
			radioState.activeFrequency,
			transponderState.frequency,
			aircraftDetails.aircraftType
		);

		console.log(currentRadioCall);

		// Check the call is valid
		const response = Parser.parseCall(currentRadioCall);

		// Adjust the simulator state based on the feedback
		if (!handleFeedback(response)) return;

		// If the user has reached the end of the route, then show a modal asking if they want to view their feedback
		if (get(CurrentScenarioPointIndexStore) == get(EndPointIndexStore)) {
			dialog.trigger({
				type: 'confirm',
				title: 'Scenario Complete',
				body: 'Do you want view your feedback?',
				response: (r) => {
					if (r) {
						goto('/scenario/results/');
					}
				}
			});

			return;
		}

		// Update the simulator with the next scenario point
		CurrentScenarioPointIndexStore.update((value) => {
			value++;
			return value;
		});
		MostRecentlyReceivedMessageStore.set(response.responseCall);
	}

	function onStepHandler(e: {
		detail: { state: { current: number; total: number }; step: number };
	}): void {
		tutorialStep = e.detail.state.current + 1;
	}

	function onCompleteHandler(e: Event): void {
		tutorialComplete = true;
	}

	function cancelTutorial(): void {
		TutorialStore.set(false);
	}

	onMount(async () => {
		if (window.SpeechRecognition || window.webkitSpeechRecognition) {
			speechRecognitionSupported = true;
		} else {
			speechRecognitionSupported = false;
		}
	});
	run(() => {
		if (
			!criticalDataMissing &&
			$AllAirportsStore.length > 0 &&
			$AllAirspacesStore.length > 0
		) {
			loadScenario();
		}
	});
	run(() => {
		if (serverNotResponding) {
			dialog.trigger({
				type: 'alert',
				title: 'Server did not respond',
				body: 'This may be due to a bad request or the feature you are trying to use not being implemented yet. This software is still early in development, expect errors like this one.'
			});
		}
	});
	run(() => {
		if (nullRoute) {
			dialog.trigger({
				type: 'alert',
				title: 'No Route Generated',
				body: 'After 1000 iterations no feasible route was generated for this seed. Please try another one. The route generation is not finalised and will frequently encounter issues like this one. '
			});
		}
	});
	run(() => {
		if ($SpeechOutputEnabledStore && $MostRecentlyReceivedMessageStore) {
			TTSWithNoise($SpeechNoiseStore);
		}
	});
	let tutorialStep2 = $derived(
		$TransponderStateStore?.dialMode == 'SBY' && $RadioStateStore?.dialMode == 'SBY'
	);
	let tutorialStep3 = $derived(
		$RadioStateStore?.activeFrequency ==
			$ScenarioStore?.getCurrentPoint().updateData.currentTargetFrequency
	);
</script>

<div class="flex" style="justify-content: center;">
	<div class="w-full max-w-screen-lg p-5">
		<div class="flex flex-row place-content-center gap-5 flex-wrap">
			{#if $TutorialStore && !tutorialComplete}
				<div class="card bg-primary-900 text-white p-3 rounded-lg sm:w-7/12 sm:mx-10">
					<Stepper on:complete={onCompleteHandler} on:step={onStepHandler}>
						<Step>
							{#snippet header()}
								Get Started!
							{/snippet}
							Welcome to RT Trainer. This tutorial will explain how to use the simulator.
							<br />Click
							<span class="underline">next</span>
							to continue.
							{#snippet navigation()}
								<button class="btn preset-tonal-warning border border-warning-500" onclick={cancelTutorial}
									>Skip Tutorial</button
								>
							{/snippet}
						</Step>
						<Step locked={!tutorialStep2}>
							{#snippet header()}
								Turning on your Radio Stack
							{/snippet}
							<ul class="list-disc ml-5">
								<li>Turn on your radio by clicking on the dial or standby (SBY) label.</li>
								<li>Set your transponder to standby in the same way.</li>
							</ul>
						</Step>
						<Step locked={!tutorialStep3}>
							{#snippet header()}
								Setting Your Radio Frequency
							{/snippet}
							Set your radio frequency to the current target frequency shown in the message output box.
						</Step>
						<Step locked={!tutorialStep4}>
							{#snippet header()}
								Make your first Radio Call
							{/snippet}
							Now you are ready to make your first radio call.
							<ul class="list-disc ml-5">
								<li>Type your message in the input box.</li>
								<li>Or enable speech input and say your message out loud.</li>
								<li>
									Your callsign is `{$AircraftDetailsStore.prefix}
									{$AircraftDetailsStore.callsign}`. You can change this in your
									<a href="/profile">profile settings</a>.
								</li>
							</ul>
						</Step>
						<Step>
							{#snippet header()}
								Well Done!
							{/snippet}
							You have completed the basic tutorial. Familiarise yourself with the rest of the simulator
							and complete the route.
						</Step>
					</Stepper>
				</div>
			{/if}

			<div class="flex flex-col place-content-evenly sm:grid sm:grid-cols-2 gap-5">
				<MessageOutput />

				<MessageInput {speechRecognitionSupported} on:submit={handleSubmit} />
			</div>

			<Radio />

			<Transponder />

			<div class="card p-2 rounded-md w-[420px] h-[452px] bg-neutral-600 flex flex-row grow">
				<div class="w-full h-full">
					<Map view={$ScenarioStore?.getCurrentPoint().pose.position} zoom={9}>
						{#if $WaypointPointsMapStore.length > 0}
							{#each $WaypointsStore as waypoint (waypoint.index)}
								{#if waypoint.index == $WaypointsStore.length - 1 || waypoint.type == WaypointType.Airport}
									<Marker
										latLng={[waypoint.location[1], waypoint.location[0]]}
										width={50}
										height={50}
										aeroObject={waypoint}
										on:click={(e) => {
											e.preventDefault();
										}}
										on:mouseover={(e) => {
											e.detail.marker.openPopup();
										}}
										on:mouseout={(e) => {
											e.detail.marker.closePopup();
										}}
									>
										{#if waypoint.index == $WaypointsStore.length - 1}
											<div class="text-2xl">🏁</div>
										{:else if waypoint.type == WaypointType.Airport}
											<div class="text-2xl">🛫</div>
										{/if}

										<Popup
											><div class="flex flex-col gap-2">
												<div>{waypoint.name}</div>
											</div></Popup
										></Marker
									>
								{:else}
									<Marker
										latLng={[waypoint.location[1], waypoint.location[0]]}
										width={50}
										height={50}
										aeroObject={waypoint}
										iconAnchor={[8, 26]}
										on:click={(e) => {
											e.preventDefault();
										}}
										on:mouseover={(e) => {
											e.detail.marker.openPopup();
										}}
										on:mouseout={(e) => {
											e.detail.marker.closePopup();
										}}
									>
										<div class="text-2xl">🚩</div>

										<Popup
											><div class="flex flex-col gap-2">
												<div>{waypoint.name}</div>
											</div></Popup
										></Marker
									>
								{/if}
							{/each}
						{/if}

						{#each $WaypointPointsMapStore as waypointPoint, index}
							{#if index > 0}
								{#key [$WaypointPointsMapStore[index - 1], $WaypointPointsMapStore[index]]}
									<Polyline
										latLngArray={[
											$WaypointPointsMapStore[index - 1] as [number, number],
											$WaypointPointsMapStore[index] as [number, number]
										]}
										colour="#FF69B4"
										fillOpacity={1}
										weight={7}
									/>
								{/key}
							{/if}
						{/each}

						{#each $OnRouteAirspacesStore as airspace}
							{#if airspace.type == 14}
								<Polygon
									latLngArray={airspace.coordinates[0].map((point) => [point[1], point[0]])}
									color={'red'}
									fillOpacity={0.2}
									weight={1}
									on:click={(e) => {
										e.preventDefault();
									}}
									on:mouseover={(e) => {
										e.detail.polygon.openPopup();
									}}
									on:mouseout={(e) => {
										e.detail.polygon.closePopup();
									}}
								/>
							{:else}
								<Polygon
									latLngArray={airspace.coordinates[0].map((point) => [point[1], point[0]])}
									color={'blue'}
									fillOpacity={0.2}
									weight={1}
									on:click={(e) => {
										e.preventDefault();
									}}
									on:mouseover={(e) => {
										e.detail.polygon.openPopup();
									}}
									on:mouseout={(e) => {
										e.detail.polygon.closePopup();
									}}
								/>
							{/if}
						{/each}

						{#key aircraftPosition}
							<Marker latLng={aircraftPosition} width={50} height={50} rotation={displayHeading}>
								<div class="text-2xl">🛩️</div>

								<Popup
									><div class="flex flex-col gap-2">
										<div>
											<!-- Lat, Long format -->
											<div>{aircraftPosition[1].toFixed(6)}</div>
											<div>{aircraftPosition[0].toFixed(6)}</div>
										</div>
									</div></Popup
								>
							</Marker>
						{/key}
					</Map>
				</div>
			</div>

			<Altimeter />

			<div class="w-full flex flex-row flex-wrap gap-5 p-2 text-neutral-600/50">
				<div>
					Your callsign: {$AircraftDetailsStore.prefix}
					{$AircraftDetailsStore.callsign}
				</div>
				<div>
					Your aircraft type: {$AircraftDetailsStore.aircraftType}
				</div>
			</div>
		</div>
	</div>
</div>
