const TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry<T> = {
	data: T;
	fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const entry = cache.get(key) as CacheEntry<T> | undefined;
	if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
		console.log(`Using cached OpenAIP data for "${key}"`);
		return entry.data;
	}

	let pending = inflight.get(key) as Promise<T> | undefined;
	if (!pending) {
		pending = fetcher().then((data) => {
			cache.set(key, { data, fetchedAt: Date.now() });
			inflight.delete(key);
			return data;
		});
		inflight.set(key, pending);
	}

	return pending;
}
