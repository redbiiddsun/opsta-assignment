<!-- "Showing 21–40 of 95" with Previous / Next links that keep the page in the URL, so back and refresh just work. -->
<script lang="ts">
	import { page as currentPage } from '$app/state';

	type Props = { page: number; limit: number; total: number; noun: string };

	let { page, limit, total, noun }: Props = $props();

	const pageCount = $derived(Math.max(1, Math.ceil(total / limit)));
	// Clamped so a hand-edited ?page past the end still reads sensibly instead of "Showing 1961–40 of 40"
	const first = $derived(Math.min((page - 1) * limit + 1, total));
	const last = $derived(Math.min(page * limit, total));

	function hrefFor(target: number) {
		const url = new URL(currentPage.url.href);
		if (target === 1) url.searchParams.delete('page');
		else url.searchParams.set('page', String(target));
		return `${url.pathname}${url.search}`;
	}

	const linkClass = 'rounded-lg border border-line bg-surface px-3 py-1.5 font-medium hover:bg-canvas';
	const disabledClass = 'rounded-lg border border-line px-3 py-1.5 text-muted/60';
</script>

{#if pageCount > 1}
	<nav class="flex items-center justify-between gap-4 text-sm" aria-label="Pages">
		<p class="text-muted">Showing {first}–{last} of {total} {noun}</p>
		<div class="flex gap-2">
			{#if page > pageCount}
				<a class={linkClass} href={hrefFor(pageCount)} data-sveltekit-noscroll>Previous</a>
			{:else if page > 1}
				<a class={linkClass} href={hrefFor(page - 1)} data-sveltekit-noscroll>Previous</a>
			{:else}
				<span class={disabledClass} aria-disabled="true">Previous</span>
			{/if}
			{#if page < pageCount}
				<a class={linkClass} href={hrefFor(page + 1)} data-sveltekit-noscroll>Next</a>
			{:else}
				<span class={disabledClass} aria-disabled="true">Next</span>
			{/if}
		</div>
	</nav>
{/if}
