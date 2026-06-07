export type WarningBannerVariant = 'warning' | 'info' | 'error';

export type WarningBannerStackPosition = 'only' | 'first' | 'middle' | 'last';

export type WarningBannerItem = {
	id: string;
	/** Optional — omit for a compact single-line banner. */
	title?: string;
	message?: string;
	variant?: WarningBannerVariant;
	dismissible?: boolean;
};
