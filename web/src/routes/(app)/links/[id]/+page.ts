import {
	LINKS_DEPENDENCY,
	getLink,
	getLinkAnalytics,
	pageFromSearch,
	throwLoadError
} from '#lib/links.ts';

export async function load({ params, url, depends }) {
	depends(LINKS_DEPENDENCY);
	const [link, analytics] = await Promise.all([
		getLink(params.id),
		getLinkAnalytics(params.id, pageFromSearch(url.searchParams))
	]).catch(throwLoadError);
	return { link, analytics };
}
