<script lang="ts">
	import { page } from '$app/state';
	import type { WaypointURLObject } from '$lib/logic/ScenarioTypes';
	import Waypoint from '$lib/logic/aeronautics/Waypoint';
	import { dialog } from '$lib/components/singletons/dialog.svelte';
	import { toaster } from '$lib/components/singletons/toaster';
	import QuickLoadScenarioDataModal from '$lib/components/dialogs/QuickLoadScenarioDataModal.svelte';
	import { generatePracticeRoute } from '$lib/logic/RouteGeneration';
	import { generateScenario } from '$lib/logic/ScenarioGenerator';
	import { loadRouteData } from '$lib/logic/scenarioRoute';
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
		SpeechNoiseStore,
		AllAirportsStore,
		AllAirspacesStore,
		OnRouteAirportsStore,
		StartPointIndexStore,
		ensureAeronauticalData,
		getAirspacesAlongRoute,
		maxFlightLevelStore
	} from '$lib/stores';
	import {
		findRouteSegmentIndex,
		isCallsignStandardRegistration,
		replaceWithPhoneticAlphabet,
		toLeafletLatLng,
		wellesbourneMountfordLatLng
	} from '$lib/logic/utils';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import RadioCall from '$lib/logic/RadioCall';
	import RouteSegment from '$lib/components/leaflet/RouteSegment.svelte';
	import FixWaypointMarkerIcon, {
		FIX_WAYPOINT_MARKER_DEFAULTS,
		fixWaypointMarkerAnchor,
		isRouteEndpoint,
		WAYPOINT_MARKER_Z_INDEX_OFFSET
	} from '$lib/components/leaflet/FixWaypointMarkerIcon.svelte';
	import AircraftMarkerIcon, {
		AIRCRAFT_MARKER_DEFAULTS,
		AIRCRAFT_MARKER_Z_INDEX_OFFSET,
		aircraftMarkerAnchor
	} from '$lib/components/leaflet/AircraftMarkerIcon.svelte';
	import AirportMarker from '$lib/components/leaflet/AirportMarker.svelte';
	import { runwaysToSymbolInput } from '$lib/components/leaflet/AirportMarkerIcon.svelte';
	import type Airport from '$lib/logic/aeronautics/Airport';
	import AirspacePolygon from '$lib/components/leaflet/AirspacePolygon.svelte';
	import Popup from '$lib/components/leaflet/Popup.svelte';
	import Marker from '$lib/components/leaflet/Marker.svelte';
	import { WaypointType } from '$lib/logic/aeronautics/Waypoint';
	import type { MarkerLayerDetail, PolygonLayerDetail } from '$lib/components/leaflet/types';
	import Parser, { type ParseResult } from '$lib/logic/Parser';
	import Radio from '$lib/components/simulator/Radio.svelte';
	import Transponder from '$lib/components/simulator/Transponder.svelte';
	import MessageOutput from '$lib/components/simulator/MessageOutput.svelte';
	import MessageInput from '$lib/components/simulator/MessageInput.svelte';
	import Altimeter from '$lib/components/simulator/Altimeter.svelte';
	import Map from '$lib/components/leaflet/Map.svelte';
	import { Steps } from '@skeletonlabs/skeleton-svelte';
	import { resolve } from '$app/paths';

	// Scenario settings
	let seed: string = '';
	let hasEmergencies: boolean = false;
	let callsign: string = 'G-OFLY';
	let prefix: string = '';
	let aircraftType: string = 'Cessna 172';

	// Flag to check if critical data is missing and the user must be prompted to enter it
	let criticalDataMissing: boolean = $state(false);

	// Check whether the seed is specified - if not then warn user
	const seedString: string | null = page.url.searchParams.get('seed');
	if (seedString != null && seedString != '') {
		seed = seedString;
	} else {
		criticalDataMissing = true;
	}

	const hasEmergenciesString: string | null = page.url.searchParams.get('hasEmergencies');
	if (hasEmergenciesString != null) {
		hasEmergencies = hasEmergenciesString === 'true';
	}

	// Get waypoints from the URL's JSON.stringify form
	const waypointsString: string | null = page.url.searchParams.get('waypoints');
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
	const airportsString: string | null = page.url.searchParams.get('airports');
	if (airportsString == null) {
		criticalDataMissing = true;
	}

	// Check whether the callsign is specified
	const callsignString: string | null = page.url.searchParams.get('callsign');
	if (callsignString != null && callsignString != '') {
		callsign = callsignString;
	}

	// Check whether the prefix is specified
	const prefixString: string | null = page.url.searchParams.get('prefix');
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
	const aircraftTypeString: string | null = page.url.searchParams.get('aircraftType');
	if (aircraftTypeString != null && aircraftTypeString != '') {
		aircraftType = aircraftTypeString;
	}

	// Check whether start point index has been set
	let startPointIndex: number = 0;
	const startPointIndexString: string | null = page.url.searchParams.get('startPoint');
	if (startPointIndexString != null) {
		startPointIndex = parseInt(startPointIndexString);
		if (startPointIndex < 0) {
			startPointIndex = 0;
		}
	}

	// Check whether end point index has been set
	let endPointIndex: number = -1;
	const endPointIndexString: string | null = page.url.searchParams.get('endPoint');
	if (endPointIndexString != null) {
		endPointIndex = parseInt(endPointIndexString);
		if (endPointIndex < 0 || endPointIndex >= startPointIndex) {
			endPointIndex = -1;
		}
	}

	let tutorial: boolean = false;
	const tutorialString: string | null = page.url.searchParams.get('tutorial');
	if (tutorialString != null) {
		tutorial = tutorialString === 'true';
	}

	type QuickLoadScenarioData = {
		routeSeed: string;
		scenarioSeed: string;
		hasEmergencies: boolean;
	};

	$effect(() => {
		if (!criticalDataMissing) return;

		const timeout = setTimeout(() => {
			dialog.trigger({
				type: 'component',
				component: QuickLoadScenarioDataModal,
				response: (r) => {
					if (r && typeof r === 'object' && 'scenarioSeed' in r && 'routeSeed' in r) {
						void loadScenarioFromSeeds(r as QuickLoadScenarioData);
					}
				}
			});
		}, 1000);

		return () => clearTimeout(timeout);
	});

	function getAirportForWaypoint(waypoint: Waypoint): Airport | undefined {
		if (!waypoint.referenceObjectId) return undefined;
		return get(AllAirportsStore).find((airport) => airport.id === waypoint.referenceObjectId);
	}

	async function loadScenarioFromSeeds(data: QuickLoadScenarioData): Promise<void> {
		try {
			await ensureAeronauticalData();

			const result = generatePracticeRoute(
				data.routeSeed,
				data.scenarioSeed,
				get(AllAirportsStore),
				get(AllAirspacesStore),
				get(maxFlightLevelStore),
				data.hasEmergencies
			);

			if (!result) {
				dialog.trigger({
					type: 'alert',
					title: 'Route generation failed',
					body: 'No feasible route was found for that seed. Please try another route seed.'
				});
				return;
			}

			loadRouteData(result.routeData);
			seed = data.scenarioSeed;
			hasEmergencies = data.hasEmergencies;
			criticalDataMissing = false;
			loadScenario();
		} catch (e) {
			console.error(e);
			dialog.trigger({
				type: 'alert',
				title: 'Could not load scenario',
				body: e instanceof Error ? e.message : 'An unexpected error occurred.'
			});
		}
	}

	function loadScenario(): boolean {
		try {
			const airspaces = getAirspacesAlongRoute();
			const scenario = generateScenario(
				seed,
				get(WaypointsStore),
				get(OnRouteAirportsStore),
				airspaces,
				hasEmergencies
			);
			ScenarioStore.set(scenario);

			if (endPointIndex == -1) {
				EndPointIndexStore.set(scenario.scenarioPoints.length - 1);
			} else {
				EndPointIndexStore.set(endPointIndex);
			}
			return true;
		} catch (e) {
			console.error(e);
			dialog.trigger({
				type: 'alert',
				title: 'Could not load scenario',
				body: e instanceof Error ? e.message : 'Scenario generation failed.'
			});
			return false;
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
	let tutorialStep4Valid: boolean = $state(false);

	let tutorialComplete: boolean = $state(false);
	let tutorialCurrentStep: number = $state(0);

	const tutorialStepCount = 4;
	const tutorialStepTitles = [
		'Get Started!',
		'Turning on your Radio Stack',
		'Setting Your Radio Frequency',
		'Make your first Radio Call'
	];

	// Server state
	let serverNotResponding = $state(false);
	let nullRoute = $state(false);

	const aircraftPosition = $derived.by((): [number, number] => {
		const pos = $CurrentScenarioPointStore?.pose.position;
		if (!pos) return wellesbourneMountfordLatLng;
		return toLeafletLatLng(pos);
	});

	const mapView = $derived.by((): [number, number] => {
		const pos = $ScenarioStore?.getCurrentPoint()?.pose.position;
		if (!pos) return wellesbourneMountfordLatLng;
		return toLeafletLatLng(pos);
	});

	const displayHeading = $derived($CurrentScenarioPointStore?.pose.trueHeading ?? 0);

	const currentRouteSegmentIndex = $derived.by(() => {
		const position = $CurrentScenarioPointStore?.pose.position;
		if (!position || $WaypointsStore.length < 2) return -1;

		return findRouteSegmentIndex(
			$WaypointsStore.map((waypoint) => waypoint.location),
			position
		);
	});

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
			console.log(
				'Transponder frequency incorrect',
				transponderState.frequency,
				scenario?.getCurrentPoint().updateData.currentTransponderFrequency
			);
			dialog.trigger({
				type: 'alert',
				title: 'Error',
				body: 'Transponder frequency incorrect'
			});
			return false;
		} else if (altimeterState.pressure != scenario?.getCurrentPoint().updateData.currentPressure) {
			// ATC should respond with say again/negative to correct the pressure
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

		tutorialStep4Valid = true;
		if (get(TutorialStore)) {
			cancelTutorial();
		}
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
						goto(resolve('/simulator/results'));
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

	function isTutorialStepValid(index: number): boolean {
		if (index === 1) return tutorialStep2Valid;
		if (index === 2) return tutorialStep3Valid;
		if (index === 3) return tutorialStep4Valid;
		return true;
	}

	function onTutorialStepChange(details: { step: number }): void {
		tutorialCurrentStep = details.step;
	}

	function onTutorialComplete(): void {
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

		await ensureAeronauticalData();
	});
	$effect(() => {
		if (
			criticalDataMissing ||
			$ScenarioStore !== undefined ||
			$AllAirportsStore.length === 0 ||
			$AllAirspacesStore.length === 0 ||
			$WaypointsStore.length === 0 ||
			$OnRouteAirspacesStore.length === 0
		) {
			return;
		}
		loadScenario();
	});

	$effect(() => {
		if (serverNotResponding) {
			dialog.trigger({
				type: 'alert',
				title: 'Server did not respond',
				body: 'This may be due to a bad request or the feature you are trying to use not being implemented yet. This software is still early in development, expect errors like this one.'
			});
		}
	});

	$effect(() => {
		if (nullRoute) {
			dialog.trigger({
				type: 'alert',
				title: 'No Route Generated',
				body: 'After 1000 iterations no feasible route was generated for this seed. Please try another one. The route generation is not finalised and will frequently encounter issues like this one. '
			});
		}
	});

	$effect(() => {
		if ($SpeechOutputEnabledStore && $MostRecentlyReceivedMessageStore) {
			TTSWithNoise($SpeechNoiseStore);
		}
	});
	let tutorialStep2Valid = $derived(
		$TransponderStateStore?.dialMode == 'SBY' && $RadioStateStore?.dialMode == 'SBY'
	);
	let tutorialStep3Valid = $derived(
		$RadioStateStore?.activeFrequency ==
			$ScenarioStore?.getCurrentPoint().updateData.currentTargetFrequency
	);
</script>

<div class="flex" style="justify-content: center;">
	<div class="w-full max-w-5xl p-5">
		<div class="flex flex-row flex-wrap place-content-center gap-5">
			{#if $TutorialStore && !tutorialComplete}
				<div class="w-xl card rounded-lg bg-primary-900 p-3 text-white">
					<Steps
						class="w-full"
						count={tutorialStepCount}
						linear
						isStepValid={isTutorialStepValid}
						onStepChange={onTutorialStepChange}
						onStepComplete={onTutorialComplete}
					>
						<Steps.List class="mb-4">
							{#each tutorialStepTitles as title, index (index)}
								<Steps.Item {index}>
									<Steps.Trigger>
										<Steps.Indicator>{index + 1}</Steps.Indicator>
										<span class="hidden sm:inline">{title}</span>
									</Steps.Trigger>
									{#if index < tutorialStepTitles.length - 1}
										<Steps.Separator />
									{/if}
								</Steps.Item>
							{/each}
						</Steps.List>

						<Steps.Content index={0}>
							<h3 class="mb-2 h3">{tutorialStepTitles[0]}</h3>
							Welcome to RT Trainer. This tutorial will explain how to use the simulator.
							<br />Click
							<span class="underline">next</span>
							to continue.
						</Steps.Content>
						<Steps.Content index={1}>
							<h3 class="mb-2 h3">{tutorialStepTitles[1]}</h3>
							<ul class="ml-5 list-disc">
								<li>Turn on your radio by clicking on the dial or standby (SBY) label.</li>
								<li>Set your transponder to standby in the same way.</li>
							</ul>
						</Steps.Content>
						<Steps.Content index={2}>
							<h3 class="mb-2 h3">{tutorialStepTitles[2]}</h3>
							Set your radio frequency to the current target frequency shown in the message output box.
						</Steps.Content>
						<Steps.Content index={3}>
							<h3 class="mb-2 h3">{tutorialStepTitles[3]}</h3>
							Now you are ready to make your first radio call.
							<ul class="ml-5 list-disc">
								<li>Type your message in the input box.</li>
								<li>Or enable speech input and say your message out loud.</li>
								<li>
									Your callsign is `{$AircraftDetailsStore.prefix}
									{$AircraftDetailsStore.callsign}`.
								</li>
							</ul>
						</Steps.Content>

						<div class="mt-4 flex items-center justify-between gap-2">
							<Steps.PrevTrigger class="btn preset-tonal">Back</Steps.PrevTrigger>
							<div class="flex gap-2">
								{#if tutorialCurrentStep === 0}
									<button
										class="btn border border-warning-500 preset-tonal-warning"
										onclick={cancelTutorial}
									>
										Skip Tutorial
									</button>
								{/if}
								<Steps.NextTrigger class="btn preset-tonal">
									{tutorialCurrentStep === tutorialStepCount - 1 ? 'Complete' : 'Next'}
								</Steps.NextTrigger>
							</div>
						</div>
					</Steps>
				</div>
			{/if}

			<div class="flex flex-col place-content-evenly gap-5 sm:grid sm:grid-cols-2">
				<MessageOutput />

				<MessageInput {speechRecognitionSupported} submit={handleSubmit} />
			</div>

			<Radio />

			<Transponder />

			<div class="flex h-[452px] w-[420px] grow flex-row card rounded-md bg-neutral-600 p-2">
				<div class="h-full w-full">
					<Map view={mapView} zoom={9}>
						{#if $WaypointPointsMapStore.length > 0}
							{#each $WaypointsStore as waypoint, index (waypoint.index)}
								{#if waypoint.type == WaypointType.Airport}
									<AirportMarker
										latLng={toLeafletLatLng(waypoint.location)}
										aeroObject={waypoint}
										baseSize={36}
										runways={runwaysToSymbolInput(getAirportForWaypoint(waypoint)?.runways)}
										showRouteEndpoint={isRouteEndpoint(index, $WaypointsStore.length)}
										mouseover={(detail: MarkerLayerDetail) => {
											detail.marker.openPopup();
										}}
										mouseout={(detail: MarkerLayerDetail) => {
											detail.marker.closePopup();
										}}
									>
										<Popup
											><div class="flex flex-col gap-2">
												<div>{waypoint.name}</div>
											</div></Popup
										></AirportMarker
									>
								{:else}
									<Marker
										latLng={toLeafletLatLng(waypoint.location)}
										width={FIX_WAYPOINT_MARKER_DEFAULTS.size}
										height={FIX_WAYPOINT_MARKER_DEFAULTS.size}
										aeroObject={waypoint}
										iconAnchor={fixWaypointMarkerAnchor()}
										zIndexOffset={WAYPOINT_MARKER_Z_INDEX_OFFSET}
										mouseover={(detail: MarkerLayerDetail) => {
											detail.marker.openPopup();
										}}
										mouseout={(detail: MarkerLayerDetail) => {
											detail.marker.closePopup();
										}}
									>
										<FixWaypointMarkerIcon
											showRouteEndpoint={isRouteEndpoint(index, $WaypointsStore.length)}
										/>

										<Popup
											><div class="flex flex-col gap-2">
												<div>{waypoint.name}</div>
											</div></Popup
										></Marker
									>
								{/if}
							{/each}
						{/if}

						{#each Array.from($WaypointPointsMapStore.keys()) as index (index)}
							{#if index > 0}
								{#key [$WaypointPointsMapStore[index - 1], $WaypointPointsMapStore[index]]}
									<RouteSegment
										latLngArray={[
											$WaypointPointsMapStore[index - 1] as [number, number],
											$WaypointPointsMapStore[index] as [number, number]
										]}
										highlighted={index - 1 === currentRouteSegmentIndex}
									/>
								{/key}
							{/if}
						{/each}

						{#each $OnRouteAirspacesStore as airspace (airspace.id)}
							<AirspacePolygon
								coordinates={airspace.coordinates[0]}
								airspaceType={airspace.type}
								mouseover={(detail: PolygonLayerDetail) => {
									detail.polygon.openPopup();
								}}
								mouseout={(detail: PolygonLayerDetail) => {
									detail.polygon.closePopup();
								}}
							/>
						{/each}

						<Marker
							latLng={aircraftPosition}
							width={AIRCRAFT_MARKER_DEFAULTS.size}
							height={AIRCRAFT_MARKER_DEFAULTS.size}
							iconAnchor={aircraftMarkerAnchor()}
							rotation={displayHeading}
							zIndexOffset={AIRCRAFT_MARKER_Z_INDEX_OFFSET}
						>
							<AircraftMarkerIcon />

							<Popup
								><div class="flex flex-col gap-2">
									<div>
										<div>{$CurrentScenarioPointStore?.pose.position[1].toFixed(6)}</div>
										<div>{$CurrentScenarioPointStore?.pose.position[0].toFixed(6)}</div>
									</div>
								</div></Popup
							>
						</Marker>
					</Map>
				</div>
			</div>

			<Altimeter />

			<div class="flex w-full flex-row flex-wrap gap-5 p-2 text-neutral-300">
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
