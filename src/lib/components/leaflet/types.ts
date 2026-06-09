import type * as Leaflet from 'leaflet';
import type Waypoint from '$lib/logic/aeronautics/Waypoint';
import type Airport from '$lib/logic/aeronautics/Airport';
import type Airspace from '$lib/logic/aeronautics/Airspace';
import type ReportingPoint from '$lib/logic/aeronautics/ReportingPoint';
import type Navaid from '$lib/logic/aeronautics/Navaid';

export type MapUiState = {
	zoom: number;
};

export type MapContext = {
	getMap: () => Leaflet.Map | undefined;
	mapUi: MapUiState;
};

export type MarkerAeroObject =
	| Waypoint
	| Airport
	| ReportingPoint
	| Navaid
	| undefined;

export type RotatableLeafletMarker = Leaflet.Marker & {
	setRotationAngle(angle: number): Leaflet.Marker;
};

export type MarkerLayerDetail = {
	event: Leaflet.LeafletEvent;
	aeroObject: MarkerAeroObject;
	marker: Leaflet.Marker;
};

export type PolygonLayerDetail = {
	event: Leaflet.LeafletMouseEvent;
	waypoint: Airspace | undefined;
	polygon: Leaflet.Polygon;
};

export type PolylineLayerDetail = {
	event: Leaflet.LeafletMouseEvent;
	polyline: Leaflet.Polyline;
	map: Leaflet.Map;
};
