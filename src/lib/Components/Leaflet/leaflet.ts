import { browser } from '$app/environment';

type LeafletDefault = (typeof import('leaflet'))['default'];

let leafletPromise: Promise<LeafletDefault> | undefined;

/** Loads Leaflet only in the browser (safe for SSR). */
export function getLeaflet(): Promise<LeafletDefault> {
	if (!browser) {
		return Promise.reject(new Error('Leaflet is only available in the browser'));
	}

	leafletPromise ??= import('leaflet').then((module) => {
		void import('leaflet/dist/leaflet.css');
		return module.default;
	});

	return leafletPromise;
}
