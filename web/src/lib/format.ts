const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium',
	timeStyle: 'short'
});
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const relativeFormat = new Intl.RelativeTimeFormat(undefined, {
	numeric: 'auto'
});

export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60]
];

/** "3 hours ago", "in 2 days", "now" – easier to take in than a timestamp */
export function formatRelative(iso: string, now = Date.now()): string {
	const seconds = (Date.parse(iso) - now) / 1000;
	for (const [unit, size] of UNITS) {
		if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
	}
	return relativeFormat.format(0, 'second');
}

/** example.com/very/long/path → shown without the protocol, which only adds noise in a list */
export function displayUrl(url: string): string {
	return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/*
 * ponytail: a few substring checks cover the browsers and systems most clicks come from; anything else shows as
 * "Other". Swap in a UA parser only if analytics ever needs exact versions.
 */
const BROWSERS: [string, string][] = [
	['Edg/', 'Edge'],
	['OPR/', 'Opera'],
	['Firefox/', 'Firefox'],
	['Chrome/', 'Chrome'],
	['Safari/', 'Safari']
];
const SYSTEMS: [string, string][] = [
	['iPhone', 'iPhone'],
	['iPad', 'iPad'],
	['Android', 'Android'],
	['Windows', 'Windows'],
	['Mac OS X', 'macOS'],
	['Linux', 'Linux']
];

export function describeUserAgent(userAgent: string | null): string {
	if (!userAgent) return 'Unknown device';
	if (/bot|crawler|spider|curl|wget/i.test(userAgent)) return 'Bot or script';
	const browser = BROWSERS.find(([marker]) => userAgent.includes(marker))?.[1];
	const system = SYSTEMS.find(([marker]) => userAgent.includes(marker))?.[1];
	if (browser && system) return `${browser} on ${system}`;
	return browser ?? system ?? 'Other';
}

const pad = (value: number) => String(value).padStart(2, '0');

/** ISO → the "YYYY-MM-DDTHH:mm" an <input type="datetime-local"> shows, in the person's own time zone */
export function toDateTimeLocal(iso: string): string {
	const date = new Date(iso);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The input's local wall-clock value → an ISO instant for the API */
export const fromDateTimeLocal = (value: string) => new Date(value).toISOString();
