<script lang="ts" module>
import type Runway from '$lib/logic/aeronautics/Runway';
import {
	getAirportCircleRadius,
	getRunwaySymbolRects,
	isActiveRunway,
	type RunwaySymbolInput
} from '$lib/components/leaflet/airportMarkerGeometry';

/** Adjust these values to change airport symbol appearance on the map. */
export const AIRPORT_MARKER_DEFAULTS = {
	size: 28,
	strokeWidth: 1.5,
	fill: 'white',
	stroke: 'black'
} as const;

export function airportMarkerAnchor(
	size: number = AIRPORT_MARKER_DEFAULTS.size
): [number, number] {
	return [size / 2, size / 2];
}

export function runwaysToSymbolInput(runways: Runway[] | undefined): RunwaySymbolInput[] {
	return (
		runways
			?.filter((runway) => isActiveRunway(runway.operations))
			.map((runway) => ({
				trueHeading: runway.trueHeading,
				lengthValue: runway.lengthValue
			})) ?? []
	);
}
</script>

<script lang="ts">
	interface Props {
		runways?: RunwaySymbolInput[];
		size?: number;
		strokeWidth?: number;
		fill?: string;
		stroke?: string;
	}

	let {
		runways = [],
		size = AIRPORT_MARKER_DEFAULTS.size,
		strokeWidth = AIRPORT_MARKER_DEFAULTS.strokeWidth,
		fill = AIRPORT_MARKER_DEFAULTS.fill,
		stroke = AIRPORT_MARKER_DEFAULTS.stroke
	}: Props = $props();

	const filterId = `airport-marker-outline-${crypto.randomUUID()}`;
	const center = $derived(size / 2);
	const circleRadius = $derived(getAirportCircleRadius(size, strokeWidth));
	const runwayRects = $derived(getRunwaySymbolRects(runways, size, strokeWidth));
	const outlineRadius = $derived(strokeWidth / 2);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	aria-hidden="true"
	class="pointer-events-none"
>
	<defs>
		<filter
			id={filterId}
			x="-40%"
			y="-40%"
			width="180%"
			height="180%"
			color-interpolation-filters="sRGB"
		>
			<feMorphology
				in="SourceAlpha"
				operator="dilate"
				radius={outlineRadius}
				result="expanded"
			/>
			<feFlood flood-color={stroke} result="outline-color" />
			<feComposite in="outline-color" in2="expanded" operator="in" result="outline-shape" />
			<feComposite
				in="outline-shape"
				in2="SourceAlpha"
				operator="out"
				result="outer-outline"
			/>
			<feMerge>
				<feMergeNode in="outer-outline" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>

	<g filter="url(#{filterId})">
		<circle cx={center} cy={center} r={circleRadius} {fill} />

		{#each runwayRects as runway (runway.heading + '-' + runway.parallelOffset + '-' + runway.halfLength)}
			<g transform="translate({center}, {center}) rotate({runway.heading}) translate({runway.parallelOffset}, 0)">
				<rect
					x={-runway.width / 2}
					y={-runway.halfLength}
					width={runway.width}
					height={runway.halfLength * 2}
					{fill}
				/>
			</g>
		{/each}
	</g>
</svg>
