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
		RouteDistanceDisplayStore,
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
		wellesbourneMountfordLatLng
	} from '$lib/logic/utils';
	import type * as Leaflet from 'leaflet';
	import type { MarkerLayerDetail, PolygonLayerDetail } from '$lib/components/leaflet/types';
	import Polyline from '$lib/components/leaflet/Polyline.svelte';
	import { Icon } from 'svelte-icons-pack';
	import { BsAirplaneFill } from 'svelte-icons-pack/bs';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';

	let showAllAirports = $state(true);
	let showAllAirspaces = $state(true);
	let unnamedWaypointCount = $state(1);

	$effect(() => {
		if ($AllAirportsStore.length === 0) {
			fetchAirports();
		}
		if ($AllAirspacesStore.length === 0) {
			fetchAirspaces();
		}
	});

	const durationEstimate = $derived($OnRouteAirportsStore.length * 8 + $OnRouteAirspacesStore.length * 5);

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

	function onMapClick(event: Leaflet.LeafletMouseEvent) {
		if ($AwaitingServerResponseStore) return;

		addWaypoint(
			+parseFloat(event.latlng.lat.toFixed(6)),
			+parseFloat(event.latlng.lng.toFixed(6))
		);
	}

	function addWaypoint(lat: number, lng: number) {
		const waypoints = get(WaypointsStore);
		const waypoint = new Waypoint(
			'Waypoint ' + getNthPhoneticAlphabetLetter(unnamedWaypointCount++),
			[lng, lat],
			WaypointType.Fix,
			waypoints.length
		);
		WaypointsStore.set([...waypoints, waypoint]);
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

		const { lat, lng } = detail.marker.getLatLng();
		waypoint.location[0] = +parseFloat(lng.toFixed(6));
		waypoint.location[1] = +parseFloat(lat.toFixed(6));
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
			waypoint.name = nameElement.value;
			waypoint.location[0] = +parseFloat(parseFloat(lngStringElement.value).toFixed(6));
			waypoint.location[1] = +parseFloat(parseFloat(latStringElement.value).toFixed(6));
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

		const scenarioURLString =
			'/simulator?seed=' +
			get(ScenarioSeedStore) +
			'&hasEmergencies=' +
			get(HasEmergenciesStore) +
			'&waypoints=' +
			JSON.stringify(waypoints) +
			'&airports=' +
			onRouteAirports.map((airport) => airport.id).toString();

		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(scenarioURLString);
	}
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="flex min-h-0 flex-1 flex-col">
		<div class="xs:pr-3 flex min-h-0 flex-1 flex-col">
			<Map
				bounds={routeBounds}
				view={wellesbourneMountfordLatLng}
				zoom={8}
				fitPadding={40}
				resizeKey={`${$WaypointsStore.length}-${$WaypointPointsMapStore.length}`}
				click={onMapClick}
			>
				{#each $AllAirportsStore as airport (airport.id)}
					{#if showAllAirports || $WaypointsStore.some((waypoint) => waypoint.referenceObjectId === airport.id)}
						<Marker
							latLng={toLeafletLatLng(airport.coordinates)}
							width={30}
							height={30}
							aeroObject={airport}
							draggable={false}
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
							{#if !$WaypointsStore.some((waypoint) => waypoint.referenceObjectId === airport.id)}
								<Icon src={BsAirplaneFill} color="black" size="16" />
							{/if}

							<Popup><div>{airport.name}</div></Popup>
						</Marker>
					{/if}
				{/each}

				{#each $FilteredAirspacesStore as airspace (airspace.id)}
					{#if showAllAirspaces}
						<AirspacePolygon
							coordinates={airspace.coordinates[0]}
							airspaceType={airspace.type}
							aeroObject={airspace}
							click={(detail: PolygonLayerDetail) => {
								addWaypoint(
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

				{#each $WaypointsStore as waypoint (waypoint.id)}
					{#key waypoint.location}
						{#if waypoint.type == WaypointType.Airport}<Marker
								latLng={toLeafletLatLng(waypoint.location)}
								width={50}
								height={50}
								aeroObject={waypoint}
							>
								{#if waypoint.index == $WaypointsStore.length - 1}
									<div class="text-2xl">🏁</div>
								{:else}
									<div class="text-2xl">🛫</div>
								{/if}

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
							</Marker>{:else if waypoint.index == $WaypointsStore.length - 1}
							<Marker
								latLng={toLeafletLatLng(waypoint.location)}
								width={50}
								height={50}
								aeroObject={waypoint}
								dragend={onWaypointDragEnd}
								draggable={true}
							>
								<div class="text-2xl">🏁</div>

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
						{:else}<Marker
								latLng={toLeafletLatLng(waypoint.location)}
								width={50}
								height={50}
								aeroObject={waypoint}
								iconAnchor={[8, 26]}
								dragend={onWaypointDragEnd}
								draggable={true}
							>
								<div class="text-2xl">🚩</div>

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
