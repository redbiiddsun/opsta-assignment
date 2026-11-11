import { error } from '@sveltejs/kit';
import { ApiError, HttpStatus } from '#lib/api.ts';
import { auth } from '#lib/auth.svelte.ts';

/** Mirrors LinkResponse on the API; dates arrive as ISO strings */
export type Link = {
	id: string;
	shortCode: string;
	shortUrl: string;
	destinationUrl: string;
	isActive: boolean;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type Page<T> = {
	items: T[];
	page: number;
	limit: number;
	total: number;
};

export type Click = {
	clickedAt: string;
	referrerOrigin: string | null;
	userAgent: string | null;
};

export type LinkAnalytics = {
	totalClicks: number;
	lastClickedAt: string | null;
	clicks: Page<Click>;
};

export type CreateLinkInput = {
	destinationUrl: string;
	alias?: string;
	expiresAt?: string;
};

export type UpdateLinkInput = {
	destinationUrl?: string;
	isActive?: boolean;
	expiresAt?: string | null;
};

/** Invalidation key for every load that reads links, so one mutation refreshes them all */
export const LINKS_DEPENDENCY = 'app:links';

export const LINKS_PAGE_SIZE = 20;
export const CLICKS_PAGE_SIZE = 20;

// Mirrors the API's rules (create-link.request.ts, short-code.vo.ts) so mistakes show before a request is spent
export const MAX_DESTINATION_URL_LENGTH = 2048;
export const MIN_ALIAS_LENGTH = 3;
export const MAX_ALIAS_LENGTH = 32;
export const ALIAS_PATTERN = `[A-Za-z0-9_\\-]{${MIN_ALIAS_LENGTH},${MAX_ALIAS_LENGTH}}`;

const pageQuery = (page: number, limit: number) => `?page=${page}&limit=${limit}`;

export const listLinks = (page: number) =>
	auth.request<Page<Link>>('GET', `/links${pageQuery(page, LINKS_PAGE_SIZE)}`);

export const getLink = (id: string) =>
	auth.request<Link>('GET', `/links/${encodeURIComponent(id)}`);

export const getLinkAnalytics = (id: string, page: number) =>
	auth.request<LinkAnalytics>(
		'GET',
		`/links/${encodeURIComponent(id)}/analytics${pageQuery(page, CLICKS_PAGE_SIZE)}`
	);

export const createLink = (input: CreateLinkInput) => auth.request<Link>('POST', '/links', input);

export const updateLink = (id: string, input: UpdateLinkInput) =>
	auth.request<Link>('PATCH', `/links/${encodeURIComponent(id)}`, input);

export const deleteLink = (id: string) =>
	auth.request<void>('DELETE', `/links/${encodeURIComponent(id)}`);

export type LinkStatus = 'active' | 'inactive' | 'expired';

/** What a visitor gets today: an expired link is dead even while switched on, so expiry wins */
export function linkStatus(
	link: Pick<Link, 'isActive' | 'expiresAt'>,
	now = Date.now()
): LinkStatus {
	if (link.expiresAt && Date.parse(link.expiresAt) <= now) return 'expired';
	return link.isActive ? 'active' : 'inactive';
}

/** A positive page number from ?page=, so a hand-edited URL can't send page=0 or page=abc to the API */
export function pageFromSearch(searchParams: URLSearchParams): number {
	const page = Number(searchParams.get('page'));
	return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Turns a failed link request into a sentence a person can act on */
export function describeLinkError(error: unknown): string {
	if (!(error instanceof ApiError))
		return 'Could not reach the server. Check your connection and try again.';
	switch (error.status) {
		case HttpStatus.Conflict:
			return 'That custom name is already taken. Try another one.';
		case HttpStatus.NotFound:
			return 'This link no longer exists.';
		case HttpStatus.TooManyRequests:
			return 'You are creating links very quickly. Wait a minute and try again.';
		default:
			return error.message;
	}
}

// "https://…", or a scheme such as "mailto:" – but not "example.com:8080", where a digit follows the colon
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(\/\/|[^\d])/i;

/**
 * "example.com" → "https://example.com": people rarely type the protocol, and the API requires one.
 * Other schemes are left alone, so the API can reject them (javascript:, mailto:) with its own message.
 */
export function normalizeDestination(input: string): string {
	const trimmed = input.trim();
	return HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * For load functions: rethrows a failed request as a SvelteKit error, so the error page shows a readable message
 * (a plain thrown Error only shows "Internal Error"). A malformed id (400) is just a link that doesn't exist.
 */
export function throwLoadError(cause: unknown): never {
	if (
		cause instanceof ApiError &&
		(cause.status === HttpStatus.NotFound || cause.status === HttpStatus.BadRequest)
	) {
		error(HttpStatus.NotFound, 'Link not found');
	}
	error(
		cause instanceof ApiError ? cause.status : HttpStatus.ServiceUnavailable,
		describeLinkError(cause)
	);
}
