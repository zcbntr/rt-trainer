import { browser } from '$app/environment';

type LeafletModule = typeof import('leaflet');

let leafletPromise: Promise<LeafletModule> | undefined;

/** Loads Leaflet only in the browser (safe for SSR). */
export function getLeaflet(): Promise<LeafletModule> {
	if (!browser) {
		return Promise.reject(new Error('Leaflet is only available in the browser'));
	}

	leafletPromise ??= import('leaflet').then((module) => {
		const L = module.default ?? module;
		return L as LeafletModule;
	});

	return leafletPromise;
}
