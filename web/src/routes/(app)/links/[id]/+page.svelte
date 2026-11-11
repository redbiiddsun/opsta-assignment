<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import {
		describeUserAgent,
		displayUrl,
		formatDate,
		formatDateTime,
		formatRelative,
		fromDateTimeLocal,
		toDateTimeLocal
	} from '#lib/format.ts';
	import {
		LINKS_DEPENDENCY,
		MAX_DESTINATION_URL_LENGTH,
		deleteLink,
		describeLinkError,
		linkStatus,
		normalizeDestination,
		updateLink
	} from '#lib/links.ts';

	let { data } = $props();

	const SAVED_NOTICE_MS = 2500;

	const link = $derived(data.link);
	const analytics = $derived(data.analytics);
	const status = $derived(linkStatus(link));

	// ---- Settings form: starts from the saved link and resets only when the saved link changes ----
	// Every load (paging the clicks, a link created from the sidebar) brings a new link object, so the fields key on
	// primitives: a $derived recomputes only when a dependency's value changes, which keeps unsaved edits intact
	const savedKey = $derived(`${link.id}:${link.updatedAt}`);
	const savedDestination = $derived(link.destinationUrl);
	const savedIsActive = $derived(link.isActive);
	const savedExpiry = $derived(link.expiresAt ? toDateTimeLocal(link.expiresAt) : '');

	let destination = $derived.by(() => {
		void savedKey;
		return savedDestination;
	});
	let isActive = $derived.by(() => {
		void savedKey;
		return savedIsActive;
	});
	let expiresAt = $derived.by(() => {
		void savedKey;
		return savedExpiry;
	});

	const hasChanges = $derived(
		normalizeDestination(destination) !== savedDestination || isActive !== savedIsActive || expiresAt !== savedExpiry
	);

	let saving = $state(false);
	let saveError = $state('');
	let savedNotice = $state(false);
	let savedTimer = 0;
	$effect(() => () => clearTimeout(savedTimer));

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !hasChanges) return;
		saving = true;
		saveError = '';
		try {
			// Only what changed, so an untouched field can never overwrite a newer value
			await updateLink(link.id, {
				destinationUrl: normalizeDestination(destination) !== link.destinationUrl ? normalizeDestination(destination) : undefined,
				isActive: isActive !== link.isActive ? isActive : undefined,
				expiresAt: expiresAt !== savedExpiry ? (expiresAt ? fromDateTimeLocal(expiresAt) : null) : undefined
			});
			await invalidate(LINKS_DEPENDENCY);
			savedNotice = true;
			clearTimeout(savedTimer);
			savedTimer = window.setTimeout(() => (savedNotice = false), SAVED_NOTICE_MS);
		} catch (error) {
			saveError = describeLinkError(error);
		} finally {
			saving = false;
		}
	}

	// ---- Delete ----
	let confirmDelete = $state(false);
	let deleting = $state(false);
	let deleteError = $state('');

	async function remove() {
		deleting = true;
		deleteError = '';
		try {
			await deleteLink(link.id);
			confirmDelete = false;
			await goto(resolve('/(app)/dashboard'), { invalidate: [LINKS_DEPENDENCY] });
		} catch (error) {
			deleteError = describeLinkError(error);
		} finally {
			deleting = false;
		}
	}

	type Stat = { icon: IconName; label: string; value: string; detail?: string };

	const stats: Stat[] = $derived([
		{ icon: 'cursor', label: 'Total clicks', value: analytics.totalClicks.toLocaleString() },
		analytics.lastClickedAt
			? {
					icon: 'clock',
					label: 'Last click',
					value: formatRelative(analytics.lastClickedAt),
					detail: formatDateTime(analytics.lastClickedAt)
				}
			: { icon: 'clock', label: 'Last click', value: 'No clicks yet' },
		link.expiresAt
			? {
					icon: 'calendar',
					label: status === 'expired' ? 'Expired' : 'Expires',
					value: formatRelative(link.expiresAt),
					detail: formatDateTime(link.expiresAt)
				}
			: { icon: 'calendar', label: 'Created', value: formatDate(link.createdAt), detail: formatDateTime(link.createdAt) }
	]);

	const STATUS_EXPLANATIONS = {
		active: 'Visitors are sent to the destination.',
		inactive: 'Turned off – visitors see a “not found” page.',
		expired: 'Past its expiry date – visitors see a “not found” page.'
	} as const;
</script>

<svelte:head><title>{displayUrl(link.shortUrl)} · URL Shortener</title></svelte:head>

<a href={resolve('/(app)/dashboard')} class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
	<Icon name="back" size={16} />
	All links
</a>

<!-- What this link is, and the two things people do most: copy it and try it -->
<header class="mt-4 flex flex-wrap items-start justify-between gap-4">
	<div class="min-w-0">
		<div class="flex flex-wrap items-center gap-3">
			<h1 class="truncate text-2xl font-semibold tracking-tight">{displayUrl(link.shortUrl)}</h1>
			<StatusBadge {status} />
		</div>
		<p class="mt-1 text-sm text-muted">{STATUS_EXPLANATIONS[status]}</p>
		<p class="mt-2 truncate text-sm" title={link.destinationUrl}>
			<span class="text-muted">Goes to</span>
			<a class="font-medium hover:underline" href={link.destinationUrl} target="_blank" rel="noreferrer">{displayUrl(link.destinationUrl)}</a>
		</p>
	</div>
	<div class="flex gap-2">
		<CopyButton text={link.shortUrl} label="Copy short link" showText variant="secondary" size="md" />
		<a
			class="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium hover:bg-canvas"
			href={link.shortUrl}
			target="_blank"
			rel="noreferrer"
		>
			<Icon name="external" size={16} />
			Open
		</a>
	</div>
</header>

<dl class="mt-8 grid gap-4 sm:grid-cols-3">
	{#each stats as stat (stat.label)}
		<div class="rounded-2xl border border-line bg-surface p-5">
			<dt class="flex items-center gap-2 text-sm text-muted"><Icon name={stat.icon} size={16} />{stat.label}</dt>
			<dd class="mt-2 text-2xl font-semibold tracking-tight" title={stat.detail}>{stat.value}</dd>
		</div>
	{/each}
</dl>

<div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
	<!-- Clicks -->
	<section aria-labelledby="clicks-title">
		<h2 id="clicks-title" class="text-lg font-semibold tracking-tight">Recent clicks</h2>
		{#if analytics.clicks.total === 0}
			<div class="mt-4 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
				<p class="font-medium">No clicks yet</p>
				<p class="mx-auto mt-1 max-w-xs text-sm text-muted">Share the short link – every visit will show up here.</p>
			</div>
		{:else if analytics.clicks.items.length === 0}
			<!-- A ?page past the end: point back to the first page of this link's clicks -->
			<div class="mt-4 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
				<p class="font-medium">No clicks on this page.</p>
				<a href={page.url.pathname} class="mt-2 inline-block text-sm font-medium text-ink underline-offset-4 hover:underline">Go to page 1</a>
			</div>
		{:else}
			<div class="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-line text-xs text-muted">
						<tr>
							<th scope="col" class="px-5 py-2.5 font-medium">When</th>
							<th scope="col" class="px-5 py-2.5 font-medium">Came from</th>
							<th scope="col" class="px-5 py-2.5 font-medium">Device</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each analytics.clicks.items as click, index (`${click.clickedAt}-${index}`)}
							<tr>
								<td class="px-5 py-3 whitespace-nowrap" title={formatDateTime(click.clickedAt)}>{formatRelative(click.clickedAt)}</td>
								<td class="max-w-48 truncate px-5 py-3 text-muted">
									{click.referrerOrigin ? displayUrl(click.referrerOrigin) : 'Direct or unknown'}
								</td>
								<td class="px-5 py-3 whitespace-nowrap text-muted">{describeUserAgent(click.userAgent)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="mt-4">
				<Pagination page={analytics.clicks.page} limit={analytics.clicks.limit} total={analytics.clicks.total} noun="clicks" />
			</div>
		{/if}
	</section>

	<!-- Settings + delete -->
	<aside class="flex flex-col gap-6">
		<section class="rounded-2xl border border-line bg-surface p-5" aria-labelledby="settings-title">
			<h2 id="settings-title" class="font-semibold tracking-tight">Settings</h2>
			<form class="mt-4 flex flex-col gap-4" onsubmit={save}>
				<Switch bind:checked={isActive} label="Link is on" description="When off, the short link stops redirecting." placement="end" />
				<TextField
					bind:value={destination}
					label="Destination"
					inputmode="url"
					maxlength={MAX_DESTINATION_URL_LENGTH}
					required
				/>
				<div>
					<TextField bind:value={expiresAt} label="Stops working on" optional type="datetime-local" />
					{#if expiresAt}
						<button type="button" class="mt-1.5 text-xs font-medium text-muted hover:text-ink" onclick={() => (expiresAt = '')}>
							Remove expiry date
						</button>
					{/if}
				</div>

				{#if saveError}
					<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{saveError}</p>
				{/if}

				<div class="flex items-center justify-end gap-3">
					<span class="text-sm text-muted" role="status">{savedNotice ? 'Saved' : ''}</span>
					<Button type="submit" loading={saving} disabled={!hasChanges}>Save changes</Button>
				</div>
			</form>
		</section>

		<section class="rounded-2xl border border-danger/30 bg-surface p-5" aria-labelledby="danger-title">
			<h2 id="danger-title" class="font-semibold tracking-tight">Delete link</h2>
			<p class="mt-1 text-sm text-muted">The short link stops working and its click history is removed.</p>
			<div class="mt-4">
				<Button variant="destructive" onclick={() => (confirmDelete = true)}>
					{#snippet icon()}<Icon name="trash" />{/snippet}
					Delete link
				</Button>
			</div>
		</section>
	</aside>
</div>

<Modal bind:open={confirmDelete} title="Delete this link?">
	<p class="text-sm text-muted">
		<span class="font-medium text-ink">{displayUrl(link.shortUrl)}</span> will stop working right away, and its
		{analytics.totalClicks.toLocaleString()}
		{analytics.totalClicks === 1 ? 'click' : 'clicks'} will be deleted. This can’t be undone.
	</p>
	{#if deleteError}
		<p class="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{deleteError}</p>
	{/if}
	<div class="mt-6 flex justify-end gap-2">
		<Button variant="ghost" onclick={() => (confirmDelete = false)}>Cancel</Button>
		<Button variant="destructive" loading={deleting} onclick={remove}>Delete link</Button>
	</div>
</Modal>
