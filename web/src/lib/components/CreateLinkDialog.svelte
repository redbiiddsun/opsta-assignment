<!--
  "New link": paste a URL and go. A custom name and an expiry date wait behind "More options", so the common case
  stays one field. On success the dialog turns into the result, with the short link ready to copy.
-->
<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { createLinkDialog } from '#lib/create-link-dialog.svelte.ts';
	import { fromDateTimeLocal, toDateTimeLocal } from '#lib/format.ts';
	import {
		ALIAS_PATTERN,
		LINKS_DEPENDENCY,
		MAX_ALIAS_LENGTH,
		MAX_DESTINATION_URL_LENGTH,
		MIN_ALIAS_LENGTH,
		createLink,
		describeLinkError,
		normalizeDestination,
		type Link
	} from '#lib/links.ts';

	let destination = $state('');
	let alias = $state('');
	let expiresAt = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');
	let created: Link | null = $state(null);

	function resetForm() {
		destination = '';
		alias = '';
		expiresAt = '';
		errorMessage = '';
		created = null;
	}

	// Each opening starts clean
	$effect(() => {
		if (createLinkDialog.open) resetForm();
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;
		submitting = true;
		errorMessage = '';
		try {
			created = await createLink({
				destinationUrl: normalizeDestination(destination),
				alias: alias.trim() || undefined,
				expiresAt: expiresAt ? fromDateTimeLocal(expiresAt) : undefined
			});
			await invalidate(LINKS_DEPENDENCY);
		} catch (error) {
			errorMessage = describeLinkError(error);
		} finally {
			submitting = false;
		}
	}

	async function viewCreated() {
		if (!created) return;
		const id = created.id;
		createLinkDialog.open = false;
		await goto(resolve('/(app)/links/[id]', { id }));
	}
</script>

<Modal
	bind:open={createLinkDialog.open}
	title={created ? 'Your short link is ready' : 'Create a short link'}
	description={created ? 'Copy it and share it anywhere.' : 'Paste a long URL and get a short one to share.'}
>
	{#if created}
		<div class="flex items-center gap-2 rounded-xl border border-line bg-canvas p-3">
			<a
				class="min-w-0 flex-1 truncate font-medium text-ink hover:underline"
				href={created.shortUrl}
				target="_blank"
				rel="noreferrer">{created.shortUrl}</a
			>
			<CopyButton text={created.shortUrl} label="Copy short link" showText variant="secondary" />
		</div>
		<p class="mt-2 truncate text-sm text-muted" title={created.destinationUrl}>Goes to {created.destinationUrl}</p>
		<div class="mt-6 flex flex-wrap justify-end gap-2">
			<Button variant="ghost" onclick={resetForm}>Create another</Button>
			<Button variant="secondary" onclick={viewCreated}>View details</Button>
			<Button onclick={() => (createLinkDialog.open = false)}>Done</Button>
		</div>
	{:else}
		<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
			<TextField
				bind:value={destination}
				label="Long URL"
				placeholder="https://example.com/a/very/long/page"
				inputmode="url"
				autocomplete="url"
				maxlength={MAX_DESTINATION_URL_LENGTH}
				required
				autofocus
			/>

			<details class="group rounded-xl border border-line px-4 py-3 open:pb-4">
				<summary class="cursor-pointer text-sm font-medium text-ink select-none marker:text-muted">
					More options <span class="font-normal text-muted">· custom name, expiry date</span>
				</summary>
				<div class="mt-4 flex flex-col gap-4">
					<TextField
						bind:value={alias}
						label="Custom name"
						optional
						placeholder="summer-sale"
						hint={`Letters, numbers, - and _ · ${MIN_ALIAS_LENGTH} to ${MAX_ALIAS_LENGTH} characters`}
						pattern={ALIAS_PATTERN}
						maxlength={MAX_ALIAS_LENGTH}
						autocomplete="off"
						spellcheck="false"
					/>
					<TextField
						bind:value={expiresAt}
						label="Stops working on"
						optional
						type="datetime-local"
						min={toDateTimeLocal(new Date().toISOString())}
						hint="Leave empty to keep the link working until you turn it off"
					/>
				</div>
			</details>

			{#if errorMessage}
				<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{errorMessage}</p>
			{/if}

			<div class="mt-1 flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (createLinkDialog.open = false)}>Cancel</Button>
				<Button type="submit" loading={submitting}>Create link</Button>
			</div>
		</form>
	{/if}
</Modal>
