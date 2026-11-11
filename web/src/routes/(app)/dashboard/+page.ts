import { LINKS_DEPENDENCY, listLinks, pageFromSearch, throwLoadError } from '#lib/links.ts';

// ?page= drives the list, so pages are linkable and survive a refresh
export async function load({ url, depends }) {
	depends(LINKS_DEPENDENCY);
	const links = await listLinks(pageFromSearch(url.searchParams)).catch(throwLoadError);
	return { links };
}
