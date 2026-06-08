<script lang="ts">
	import Map from '$lib/components/leaflet/Map.svelte';
	import {
		AllAirportsStore,
		AllAirspacesStore,
		AwaitingServerResponseStore,
		FilteredAirspacesStore,
		HasEmergenciesStore,
		OnRouteAirportsStore,
		OnRouteAirspacesStore,
		OnRouteAirspaceCrossingsStore,
		PlannerUnnamedWaypointCountStore,
		RouteDistanceDisplayStore,
		RouteUnsupportedRegionsWarningStore,
		ScenarioSeedStore,
		WaypointPointsMapStore,
		WaypointsStore,
		fetchAirports,
		fetchAirspaces
	} from '$lib/stores';
	import Waypoint, { WaypointType } from '$lib/logic/aeronautics/Waypoint';
	import { TrashBinOutline, PlayOutline } from 'flowbite-svelte-icons';
	import type Airport from '$lib/logic/aeronautics/Airport';
	import Marker from '$lib/components/leaflet/Marker.svelte';
	import Popup from '$lib/components/leaflet/Popup.svelte';
	import AirspacePolygon from '$lib/components/leaflet/AirspacePolygon.svelte';
	import {
		getNthPhoneticAlphabetLetter,
		lngLatBoundsToLeaflet,
		toLeafletLatLng,
		ukPlannerBounds,
		wellesbourneMountfordLatLng
	} from '$lib/logic/utils';
	import {
		isValidUkPracticeWaypoint,
		ukPracticeAreaRejectionMessage
	} from '$lib/logic/aeronautics/ukPracticeArea';
	import type * as Leaflet from 'leaflet';
	import type {
		MarkerLayerDetail,
		PolygonLayerDetail,
		PolylineLayerDetail
	} from '$lib/components/leaflet/types';
	import RouteSegment from '$lib/components/leaflet/RouteSegment.svelte';
	import FixWaypointMarkerIcon, {
		FIX_WAYPOINT_MARKER_DEFAULTS,
		fixWaypointMarkerAnchor,
		isRouteEndpoint,
		WAYPOINT_MARKER_Z_INDEX_OFFSET
	} from '$lib/components/leaflet/FixWaypointMarkerIcon.svelte';
	import AirportMarker from '$lib/components/leaflet/AirportMarker.svelte';
	import { runwaysToSymbolInput } from '$lib/components/leaflet/AirportMarkerIcon.svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { buildSimulatorSearchParams } from '$lib/logic/simulatorUrl';
	import { resolve } from '$app/paths';
	import WarningBannerStack from '$lib/components/WarningBannerStack.svelte';
	import type { WarningBannerItem } from '$lib/components/WarningBanner.types';

	let showAllAirports = $state(true);
	let showAllAirspaces = $state(true);
	let dismissedBannerIds = $state<string[]>([]);
	let suppressNextMapClick = $state(false);
	let insertDragMap: Leaflet.Map | undefined;
	let insertingWaypoint = $state<{ segmentIndex: number; lat: number; lng: number } | undefined>(
		undefined
	);

	$effect(() => {
		if ($AllAirportsStore.length === 0) {
			fetchAirports();
		}
		if ($AllAirspacesStore.length === 0) {
			fetchAirspaces();
		}
	});

	const durationEstimate = $derived(
		$OnRouteAirportsStore.length * 8 + $OnRouteAirspacesStore.length * 5
	);

	const routeBounds = $derived.by((): Leaflet.LatLngBoundsExpression | undefined => {
		const waypoints = $WaypointsStore;
		if (waypoints.length === 0) {
			return undefined;
		}

		return lngLatBoundsToLeaflet(
			waypoints.map((waypoint) => waypoint.location),
			0.08
		);
	});

	const startButtonDisabled = $derived(
		$WaypointsStore.length < 2 ||
			$OnRouteAirportsStore.length > 2 ||
			($OnRouteAirportsStore.length == 1 &&
				$WaypointsStore[0]?.type !== WaypointType.Airport &&
				$WaypointsStore[$WaypointsStore.length - 1]?.type !== WaypointType.Airport) ||
			($OnRouteAirportsStore.length == 2 &&
				$WaypointsStore[0]?.type !== WaypointType.Airport &&
				$WaypointsStore[$WaypointsStore.length - 1]?.type !== WaypointType.Airport) ||
			$AwaitingServerResponseStore
	);

	const plannerBanners = $derived.by((): WarningBannerItem[] => {
		const banners: WarningBannerItem[] = [
			{
				id: 'student-project-disclaimer',
				message:
					'RT Trainer is a student project and may have inaccuracies. Do not rely on just this tool for your practice.',
				variant: 'info'
			}
		];

		if ($RouteUnsupportedRegionsWarningStore) {
			banners.push({
				id: 'unsupported-route',
				title: 'Unsupported route areas',
				message: $RouteUnsupportedRegionsWarningStore,
				variant: 'warning',
				dismissible: true
			});
		}

		return banners;
	});

	function dismissBanner(id: string) {
		if (dismissedBannerIds.includes(id)) return;
		dismissedBannerIds = [...dismissedBannerIds, id];
	}

	function onMapClick(event: Leaflet.LeafletMouseEvent) {
		if (suppressNextMapClick) {
			suppressNextMapClick = false;
			return;
		}
		if ($AwaitingServerResponseStore) return;

		tryAddWaypoint(
			+parseFloat(event.latlng.lat.toFixed(6)),
			+parseFloat(event.latlng.lng.toFixed(6))
		);
	}

	function roundCoord(value: number) {
		return +parseFloat(value.toFixed(6));
	}

	function nextUnnamedWaypointName(): string {
		const count = get(PlannerUnnamedWaypointCountStore);
		PlannerUnnamedWaypointCountStore.set(count + 1);
		return 'Waypoint ' + getNthPhoneticAlphabetLetter(count);
	}

	function insertWaypointAt(index: number, lat: number, lng: number) {
		const waypoints = get(WaypointsStore);
		const waypoint = new Waypoint(nextUnnamedWaypointName(), [lng, lat], WaypointType.Fix, index);
		const updated = [...waypoints];
		updated.splice(index, 0, waypoint);
		updated.forEach((wp, wpIndex) => {
			wp.index = wpIndex;
		});
		WaypointsStore.set(updated);
	}

	function cleanupInsertDrag() {
		if (insertDragMap) {
			insertDragMap.dragging.enable();
			insertDragMap.off('mousemove', onInsertDragMove);
			insertDragMap.off('mouseup', onInsertDragEnd);
			insertDragMap = undefined;
		}
	}

	function finishInsertDrag(finalLat: number, finalLng: number) {
		if (!insertingWaypoint) return;

		const segmentIndex = insertingWaypoint.segmentIndex;
		const lat = roundCoord(finalLat);
		const lng = roundCoord(finalLng);

		insertingWaypoint = undefined;
		suppressNextMapClick = true;
		cleanupInsertDrag();

		if (!isValidUkPracticeWaypoint([lng, lat])) {
			alert(ukPracticeAreaRejectionMessage);
			return;
		}

		insertWaypointAt(segmentIndex + 1, lat, lng);
	}

	function onRouteSegmentInsertStart(segmentIndex: number, detail: PolylineLayerDetail) {
		if ($AwaitingServerResponseStore) return;

		detail.event.originalEvent.preventDefault();
		detail.event.originalEvent.stopPropagation();

		insertingWaypoint = {
			segmentIndex,
			lat: roundCoord(detail.event.latlng.lat),
			lng: roundCoord(detail.event.latlng.lng)
		};

		insertDragMap = detail.map;
		detail.map.dragging.disable();
		detail.map.on('mousemove', onInsertDragMove);
		detail.map.on('mouseup', onInsertDragEnd);
	}

	function onInsertDragMove(event: Leaflet.LeafletMouseEvent) {
		if (!insertingWaypoint) return;

		insertingWaypoint = {
			...insertingWaypoint,
			lat: roundCoord(event.latlng.lat),
			lng: roundCoord(event.latlng.lng)
		};
	}

	function onInsertDragEnd(event: Leaflet.LeafletMouseEvent) {
		finishInsertDrag(event.latlng.lat, event.latlng.lng);
	}

	function onInsertDragWindowMouseUp() {
		if (!insertingWaypoint) return;
		finishInsertDrag(insertingWaypoint.lat, insertingWaypoint.lng);
	}

	function tryAddWaypoint(lat: number, lng: number) {
		if (!isValidUkPracticeWaypoint([lng, lat])) return;

		addWaypoint(lat, lng);
	}

	function addWaypoint(lat: number, lng: number) {
		const waypoints = get(WaypointsStore);
		const waypoint = new Waypoint(
			nextUnnamedWaypointName(),
			[lng, lat],
			WaypointType.Fix,
			waypoints.length
		);
		WaypointsStore.set([...waypoints, waypoint]);
	}

	function getAirportForWaypoint(waypoint: Waypoint): Airport | undefined {
		if (!waypoint.referenceObjectId) return undefined;
		return get(AllAirportsStore).find((airport) => airport.id === waypoint.referenceObjectId);
	}

	function addAirportWaypoint(airport: Airport) {
		const waypoints = get(WaypointsStore);
		const waypoint = new Waypoint(
			airport.name,
			airport.coordinates,
			WaypointType.Airport,
			waypoints.length,
			airport.id
		);
		WaypointsStore.set([...waypoints, waypoint]);
	}

	function onWaypointDragEnd(detail: MarkerLayerDetail) {
		if (!detail.aeroObject || !(detail.aeroObject instanceof Waypoint)) return;

		const waypoints = get(WaypointsStore);
		const waypoint = waypoints.find((wp) => wp.id === detail.aeroObject!.id);
		if (!waypoint) return;

		const previousLocation: [number, number] = [waypoint.location[0], waypoint.location[1]];
		const { lat, lng } = detail.marker.getLatLng();
		const nextLng = +parseFloat(lng.toFixed(6));
		const nextLat = +parseFloat(lat.toFixed(6));

		if (!isValidUkPracticeWaypoint([nextLng, nextLat])) {
			detail.marker.setLatLng(toLeafletLatLng(previousLocation));
			alert(ukPracticeAreaRejectionMessage);
			return;
		}

		waypoint.location[0] = nextLng;
		waypoint.location[1] = nextLat;
		WaypointsStore.set([...waypoints]);
	}

	function deleteWaypoint(waypoint: Waypoint) {
		const filtered = get(WaypointsStore).filter((w) => w.id !== waypoint.id);
		filtered.forEach((wp, index) => {
			wp.index = index;
		});
		WaypointsStore.set(filtered);
	}

	function saveWaypointEdit(waypoint: Waypoint) {
		const nameElement = document.getElementById(
			`waypoint-${waypoint.id}-name`
		) as HTMLTextAreaElement;
		const latStringElement = document.getElementById(
			`waypoint-${waypoint.id}-lat`
		) as HTMLTextAreaElement;
		const lngStringElement = document.getElementById(
			`waypoint-${waypoint.id}-lng`
		) as HTMLTextAreaElement;
		if (
			nameElement?.value &&
			latStringElement?.value &&
			parseFloat(latStringElement.value) &&
			lngStringElement?.value &&
			parseFloat(lngStringElement.value)
		) {
			const nextLng = +parseFloat(parseFloat(lngStringElement.value).toFixed(6));
			const nextLat = +parseFloat(parseFloat(latStringElement.value).toFixed(6));

			if (!isValidUkPracticeWaypoint([nextLng, nextLat])) {
				alert(ukPracticeAreaRejectionMessage);
				return;
			}

			waypoint.name = nameElement.value;
			waypoint.location[0] = nextLng;
			waypoint.location[1] = nextLat;
			WaypointsStore.set([...get(WaypointsStore)]);
		}
	}

	function onPracticeClick() {
		const waypoints = get(WaypointsStore);
		const onRouteAirports = get(OnRouteAirportsStore);

		if (waypoints.length < 2) {
			alert('Please add at least 2 waypoints to create a scenario.');
			return;
		}

		if (onRouteAirports.length > 2) {
			alert(
				'Please add no more than 2 airports to create a scenario. More airports are not yet supported.'
			);
			return;
		}

		if (onRouteAirports.length > 0) {
			if (
				waypoints[0].type !== WaypointType.Airport &&
				waypoints[waypoints.length - 1].type !== WaypointType.Airport
			) {
				alert(
					'Please ensure airports are at the start or end of the route. Airports at other points of the route are not yet supported.'
				);
				return;
			}
		}

		goto(
			resolve(
				`/simulator?${buildSimulatorSearchParams({
					seed: get(ScenarioSeedStore),
					hasEmergencies: get(HasEmergenciesStore),
					waypoints,
					airportIds: onRouteAirports.map((airport) => airport.id)
				}).toString()}`
			)
		);
	}
</script>

<svelte:window onmouseup={onInsertDragWindowMouseUp} />

<div class="flex min-h-0 flex-1 flex-col">
	<div class="flex min-h-0 flex-1 flex-col">
		<WarningBannerStack
			banners={plannerBanners}
			dismissedIds={dismissedBannerIds}
			ondismiss={dismissBanner}
		/>
		<div class="xs:pr-3 flex min-h-0 flex-1 flex-col">
			<Map
				bounds={routeBounds}
				view={wellesbourneMountfordLatLng}
				zoom={8}
				fitPadding={40}
				maxBounds={ukPlannerBounds}
				resizeKey={`${$WaypointsStore.length}-${$WaypointPointsMapStore.length}`}
				click={onMapClick}
			>
				{#each $AllAirportsStore as airport (airport.id)}
					{#if showAllAirports || $WaypointsStore.some((waypoint) => waypoint.referenceObjectId === airport.id)}
						<AirportMarker
							latLng={toLeafletLatLng(airport.coordinates)}
							aeroObject={airport}
							runways={runwaysToSymbolInput(airport.runways)}
							showIcon={!$WaypointsStore.some(
								(waypoint) => waypoint.referenceObjectId === airport.id
							)}
							click={(detail: MarkerLayerDetail) => {
								if (detail.aeroObject) addAirportWaypoint(detail.aeroObject as Airport);
							}}
							mouseover={(detail: MarkerLayerDetail) => {
								detail.marker.openPopup();
							}}
							mouseout={(detail: MarkerLayerDetail) => {
								detail.marker.closePopup();
							}}
						>
							<Popup><div>{airport.name}</div></Popup>
						</AirportMarker>
					{/if}
				{/each}

				{#each $FilteredAirspacesStore as airspace (airspace.id)}
					{#if showAllAirspaces}
						<AirspacePolygon
							coordinates={airspace.coordinates[0]}
							airspaceType={airspace.type}
							aeroObject={airspace}
							click={(detail: PolygonLayerDetail) => {
								tryAddWaypoint(
									+parseFloat(detail.event.latlng.lat.toFixed(6)),
									+parseFloat(detail.event.latlng.lng.toFixed(6))
								);
							}}
							mouseover={(detail: PolygonLayerDetail) => {
								detail.polygon.openPopup();
							}}
							mouseout={(detail: PolygonLayerDetail) => {
								detail.polygon.closePopup();
							}}
						>
							<Popup>
								<div>{airspace.getDisplayName()}</div>
							</Popup>
						</AirspacePolygon>
					{/if}
				{/each}

				{#each $WaypointsStore as waypoint, index (waypoint.id)}
					{#key waypoint.location}
						{#if waypoint.type == WaypointType.Airport}<AirportMarker
								latLng={toLeafletLatLng(waypoint.location)}
								aeroObject={waypoint}
								baseSize={36}
								runways={runwaysToSymbolInput(getAirportForWaypoint(waypoint)?.runways)}
								showRouteEndpoint={isRouteEndpoint(index, $WaypointsStore.length)}
							>
								<Popup
									><div class="flex flex-col gap-2">
										<div class="flex flex-col gap-2">
											<div id="waypoint-{waypoint.id}-name">{waypoint.name}</div>
											<div id="waypoint-{waypoint.id}-lat">{waypoint.location[1]}</div>
											<div id="waypoint-{waypoint.id}-lng">{waypoint.location[0]}</div>
										</div>

										<button class="btn preset-filled" onclick={() => deleteWaypoint(waypoint)}
											><div class="grid w-full grid-cols-4 gap-2">
												<div class="col-span-1 col-start-1"><TrashBinOutline /></div>
												<div class="col-span-3 col-start-2">Delete</div>
											</div></button
										>
									</div></Popup
								>
							</AirportMarker>{:else}<Marker
								latLng={toLeafletLatLng(waypoint.location)}
								width={FIX_WAYPOINT_MARKER_DEFAULTS.size}
								height={FIX_WAYPOINT_MARKER_DEFAULTS.size}
								aeroObject={waypoint}
								iconAnchor={fixWaypointMarkerAnchor()}
								zIndexOffset={WAYPOINT_MARKER_Z_INDEX_OFFSET}
								dragend={onWaypointDragEnd}
								draggable={true}
							>
								<FixWaypointMarkerIcon
									showRouteEndpoint={isRouteEndpoint(index, $WaypointsStore.length)}
								/>

								<Popup
									><div class="flex flex-col gap-2">
										<textarea id="waypoint-{waypoint.id}-name" class="textarea" rows="1"
											>{waypoint.name}</textarea
										><textarea id="waypoint-{waypoint.id}-lat" class="textarea" rows="1"
											>{waypoint.location[1]}</textarea
										><textarea id="waypoint-{waypoint.id}-lng" class="textarea" rows="1"
											>{waypoint.location[0]}</textarea
										>
										<button class="varient-filled btn" onclick={() => saveWaypointEdit(waypoint)}
											>Save</button
										>
										<button class="btn preset-filled" onclick={() => deleteWaypoint(waypoint)}
											><div class="grid w-full grid-cols-4 gap-2">
												<div class="col-span-1 col-start-1"><TrashBinOutline /></div>
												<div class="col-span-3 col-start-2">Delete</div>
											</div></button
										>
									</div></Popup
								>
							</Marker>
						{/if}
					{/key}
				{/each}

				{#each $WaypointPointsMapStore as waypointPoint, index (waypointPoint.toString() + index.toString())}
					{#if index > 0}
						{#key [$WaypointPointsMapStore[index - 1], $WaypointPointsMapStore[index]]}
							<RouteSegment
								latLngArray={[
									$WaypointPointsMapStore[index - 1] as [number, number],
									$WaypointPointsMapStore[index] as [number, number]
								]}
								segmentIndex={index - 1}
								insertable={true}
								insertDragStart={onRouteSegmentInsertStart}
							/>
						{/key}
					{/if}
				{/each}

				{#if insertingWaypoint}
					<Marker
						latLng={[insertingWaypoint.lat, insertingWaypoint.lng]}
						width={FIX_WAYPOINT_MARKER_DEFAULTS.size}
						height={FIX_WAYPOINT_MARKER_DEFAULTS.size}
						iconAnchor={fixWaypointMarkerAnchor()}
						zIndexOffset={WAYPOINT_MARKER_Z_INDEX_OFFSET}
					>
						<FixWaypointMarkerIcon />
					</Marker>
				{/if}
			</Map>
		</div>
		<div class="flex h-20 w-full flex-row">
			<div class="flex flex-row place-content-center p-4">
				<div class="flex flex-col place-content-center">
					<div class="text-sm">Est. Distance</div>
					<div class="text-xl">
						{$RouteDistanceDisplayStore}
					</div>
				</div>
			</div>
			<div class="vr h-full border border-surface-200 dark:border-surface-700"></div>
			<div class="flex flex-row place-content-center p-4">
				<div class="flex flex-col place-content-center">
					<div class="text-sm">Unique Airspaces</div>
					<div class="text-xl">
						{$OnRouteAirspacesStore.length}
					</div>
				</div>
			</div>
			<div class="vr h-full border border-surface-200 dark:border-surface-700"></div>
			<div class="flex flex-row place-content-center p-4">
				<div class="flex flex-col place-content-center">
					<div class="text-sm">Airspace Crossings</div>
					<div class="text-xl">
						{$OnRouteAirspaceCrossingsStore}
					</div>
				</div>
			</div>
			<div class="vr h-full border border-surface-200 dark:border-surface-700"></div>
			<div class="flex flex-row place-content-center p-4">
				<div class="flex flex-col place-content-center">
					<div class="text-sm">Est. Scenario Duration</div>
					<div class="text-xl">
						{durationEstimate} mins
					</div>
				</div>
			</div>

			<div class="flex grow flex-row place-content-end gap-3 p-2">
				<div class="flex flex-col place-content-center">
					<button
						class="btn h-10 preset-filled text-sm"
						disabled={startButtonDisabled}
						onclick={onPracticeClick}><span><PlayOutline /></span><span>Start</span></button
					>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.textarea) {
		resize: none;
	}
</style>
