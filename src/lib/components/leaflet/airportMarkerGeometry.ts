/** Zoom scaling for airport symbols on the map. */
export const AIRPORT_MARKER_ZOOM_SCALE = {
	referenceZoom: 9,
	minSize: 16,
	maxSize: 36,
	/** Zoom levels required to double the icon size relative to the reference zoom. */
	zoomStepsPerDouble: 3
} as const;

export type RunwaySymbolInput = {
	trueHeading: number;
	lengthValue: number;
};

export function getZoomScaledAirportSize(
	zoom: number,
	baseSize: number,
	scale = AIRPORT_MARKER_ZOOM_SCALE
): number {
	const scaled =
		baseSize *
		Math.pow(2, (zoom - scale.referenceZoom) / scale.zoomStepsPerDouble);
	return Math.min(scale.maxSize, Math.max(scale.minSize, scaled));
}

export type RunwaySymbolRect = {
	heading: number;
	halfLength: number;
	width: number;
	parallelOffset: number;
};

/** OpenAIP runway operations: 0 = active/normal; non-zero values indicate inactive or closed. */
export function isActiveRunway(operations: number): boolean {
	return operations === 0;
}

const HEADING_TOLERANCE = 5;
const LENGTH_RATIO_TOLERANCE = 0.15;
const CIRCLE_RADIUS_RATIO = 0.52;
const MIN_RUNWAY_PROTRUSION_RATIO = 0.38;
const MAX_RUNWAY_PROTRUSION_RATIO = 1;

function headingDifference(a: number, b: number): number {
	return Math.abs(((a - b + 540) % 360) - 180);
}

function areReciprocal(a: number, b: number): boolean {
	return Math.abs(headingDifference(a, b) - 180) <= HEADING_TOLERANCE;
}

function similarLength(a: number, b: number): boolean {
	if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
		return a === b;
	}
	const ratio = Math.min(a, b) / Math.max(a, b);
	return ratio >= 1 - LENGTH_RATIO_TOLERANCE;
}

function headingsAlign(a: number, b: number): boolean {
	return headingDifference(a, b) <= HEADING_TOLERANCE;
}

/** Merge reciprocal runway ends into one physical strip per orientation. */
export function consolidateRunwayStrips(runways: RunwaySymbolInput[]): RunwaySymbolInput[] {
	const validRunways = runways.filter((runway) => Number.isFinite(runway.trueHeading));
	const used = new Set<number>();
	const strips: RunwaySymbolInput[] = [];

	for (let index = 0; index < validRunways.length; index++) {
		if (used.has(index)) continue;

		const runway = validRunways[index];
		used.add(index);

		for (let otherIndex = index + 1; otherIndex < validRunways.length; otherIndex++) {
			if (used.has(otherIndex)) continue;

			const otherRunway = validRunways[otherIndex];
			if (
				areReciprocal(runway.trueHeading, otherRunway.trueHeading) &&
				similarLength(runway.lengthValue, otherRunway.lengthValue)
			) {
				used.add(otherIndex);
				break;
			}
		}

		strips.push(runway);
	}

	return strips;
}

function groupParallelStrips(strips: RunwaySymbolInput[]): RunwaySymbolInput[][] {
	const groups: RunwaySymbolInput[][] = [];

	for (const strip of strips) {
		const group = groups.find((candidate) => headingsAlign(candidate[0].trueHeading, strip.trueHeading));
		if (group) {
			group.push(strip);
		} else {
			groups.push([strip]);
		}
	}

	return groups;
}

export function getAirportCircleRadius(size: number, strokeWidth: number): number {
	const contentRadius = size / 2 - strokeWidth;
	return contentRadius * CIRCLE_RADIUS_RATIO;
}

export function getRunwaySymbolRects(
	runways: RunwaySymbolInput[],
	size: number,
	strokeWidth: number
): RunwaySymbolRect[] {
	const strips = consolidateRunwayStrips(runways);
	if (strips.length === 0) return [];

	const contentRadius = size / 2 - strokeWidth;
	const circleRadius = getAirportCircleRadius(size, strokeWidth);
	const protrusionSpan = contentRadius - circleRadius;
	const maxLength = Math.max(...strips.map((strip) => strip.lengthValue), 1);
	const runwayThickness = Math.max(1.5, size * 0.09);
	const parallelSpacing = Math.max(2, size * 0.12);
	const groups = groupParallelStrips(strips);
	const rects: RunwaySymbolRect[] = [];

	for (const group of groups) {
		const sortedGroup = [...group].sort((a, b) => b.lengthValue - a.lengthValue);

		sortedGroup.forEach((strip, index) => {
			const lengthScale = strip.lengthValue / maxLength;
			const protrusionRatio =
				MIN_RUNWAY_PROTRUSION_RATIO +
				(MAX_RUNWAY_PROTRUSION_RATIO - MIN_RUNWAY_PROTRUSION_RATIO) * lengthScale;
			const halfLength = circleRadius + protrusionSpan * protrusionRatio;

			rects.push({
				heading: strip.trueHeading,
				halfLength,
				width: runwayThickness,
				parallelOffset: (index - (sortedGroup.length - 1) / 2) * parallelSpacing
			});
		});
	}

	return rects;
}
