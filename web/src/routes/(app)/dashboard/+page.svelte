<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import Button from '#lib/components/ui/Button.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import { createLinkDialog } from '#lib/create-link-dialog.svelte.ts';
	import { displayUrl, formatDate, formatDateTime } from '#lib/format.ts';
	import { LINKS_DEPENDENCY, describeLinkError, linkStatus, updateLink, type Link } from '#lib/links.ts';

	let { data } = $props();

	const links = $derived(data.links);
	const isEmpty = $derived(links.total === 0);

	// While a switch is saving it shows the new position; the list catches up once the save lands
	const pendingActive = new SvelteMap<string, boolean>();
	let toggleError = $state('');

	async function setActive(link: Link, isActive: boolean) {
		pendingActive.set(link.id, isActive);
		toggleError = '';
		try {
			await updateLink(link.id, { isActive });
			await invalidate(LINKS_DEPENDENCY);
		} catch (error) {
			toggleError = describeLinkError(error);
		} finally {
			pendingActive.delete(link.id);
		}
	}

	const HOW_IT_WORKS = [
		{ icon: 'link', title: 'Paste a long URL', text: 'Any http or https address works.' },
		{ icon: 'copy', title: 'Share the short link', text: 'Copy it into a post, an email or a chat.' },
		{ icon: 'chart', title: 'See who clicks', text: 'Every visit is counted on the link’s page.' }
	] as const;
</script>

<svelte:head><title>Links · URL Shortener</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Links</h1>
		<p class="mt-1 text-muted">
			{#if isEmpty}
				Short links you create will show up here.
			{:else}
				{links.total} {links.total === 1 ? 'link' : 'links'} · turn one off anytime to stop it redirecting.
			{/if}
		</p>
	</div>
	{#if !isEmpty}
		<Button onclick={() => (createLinkDialog.open = true)}>
			{#snippet icon()}<Icon name="plus" />{/snippet}
			New link
		</Button>
	{/if}
</div>

{#if toggleError}
	<p class="mt-6 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{toggleError}</p>
{/if}

{#if isEmpty}
	<!-- First visit: explain the whole product in three steps, with one obvious thing to do -->
	<section class="mt-8 rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
		<span class="mx-auto grid size-12 place-items-center rounded-2xl bg-ink/5"><Icon name="link" size={22} /></span>
		<h2 class="mt-4 text-lg font-semibold tracking-tight">Create your first short link</h2>
		<p class="mx-auto mt-1 max-w-sm text-sm text-muted">It takes a few seconds. Here is how it works:</p>
		<ol class="mx-auto mt-8 grid max-w-2xl gap-6 text-left sm:grid-cols-3">
			{#each HOW_IT_WORKS as step, index (step.title)}
				<li class="flex gap-3 sm:flex-col">
					<span class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-surface">{index + 1}</span>
					<div>
						<p class="font-medium">{step.title}</p>
						<p class="text-sm text-muted">{step.text}</p>
					</div>
				</li>
			{/each}
		</ol>
		<div class="mt-8 flex justify-center">
			<Button size="lg" onclick={() => (createLinkDialog.open = true)}>
				{#snippet icon()}<Icon name="plus" />{/snippet}
				Create a link
			</Button>
		</div>
	</section>
{:else if links.items.length === 0}
	<!-- A ?page past the end (hand-edited or bookmarked): nothing to list, so point back to the start -->
	<section class="mt-8 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
		<p class="font-medium">This page is empty.</p>
		<a href={resolve('/(app)/dashboard')} class="mt-2 inline-block text-sm font-medium text-ink underline-offset-4 hover:underline">Go to page 1</a>
	</section>
{:else}
	<section class="mt-8 overflow-hidden rounded-2xl border border-line bg-surface" aria-label="Your links">
		<!-- Column captions for wide screens; on phones each row explains itself -->
		<div class="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_5.5rem] gap-4 border-b border-line px-5 py-2.5 text-xs font-medium text-muted md:grid">
			<span>Short link</span>
			<span>Status</span>
			<span>Created</span>
			<span class="text-right">On / off</span>
		</div>
		<ul class="divide-y divide-line">
			{#each links.items as link (link.id)}
				{@const isActive = pendingActive.get(link.id) ?? link.isActive}
				<!-- The whole row opens the link's page; the copy button and the switch sit above that click area -->
				<li class="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-canvas md:grid-cols-[minmax(0,1fr)_7rem_7rem_5.5rem]">
					<div class="min-w-0">
						<div class="flex items-center gap-1">
							<a
								href={resolve('/(app)/links/[id]', { id: link.id })}
								class="truncate font-medium text-ink after:absolute after:inset-0 hover:underline"
								title="Open details for {link.shortUrl}"
							>
								{displayUrl(link.shortUrl)}
							</a>
							<span class="relative z-10"><CopyButton text={link.shortUrl} label="Copy {link.shortUrl}" /></span>
						</div>
						<p class="mt-0.5 truncate text-sm text-muted" title={link.destinationUrl}>
							<span aria-hidden="true">→</span>
							<span class="sr-only">Goes to</span>
							{displayUrl(link.destinationUrl)}
						</p>
					</div>
					<div class="col-start-1 row-start-2 flex items-center gap-3 md:col-start-auto md:row-start-auto">
						<StatusBadge status={linkStatus({ isActive, expiresAt: link.expiresAt })} />
						<span class="text-xs text-muted md:hidden">Created {formatDate(link.createdAt)}</span>
					</div>
					<span class="hidden text-sm text-muted md:block" title={formatDateTime(link.createdAt)}>{formatDate(link.createdAt)}</span>
					<div class="relative z-10 col-start-2 row-span-2 row-start-1 flex justify-end md:col-start-auto md:row-span-1 md:row-start-auto">
						<Switch
							bind:checked={() => isActive, (checked) => setActive(link, checked)}
							disabled={pendingActive.has(link.id)}
							aria-label="{isActive ? 'Turn off' : 'Turn on'} {link.shortUrl}"
						/>
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<div class="mt-4">
		<Pagination page={links.page} limit={links.limit} total={links.total} noun="links" />
	</div>
{/if}
