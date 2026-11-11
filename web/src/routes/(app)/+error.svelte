<!-- Shown inside the sidebar shell when a page's data fails to load -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';

	const notFound = $derived(page.status === 404);
</script>

<div class="mx-auto max-w-md py-16 text-center">
	<h1 class="text-xl font-semibold tracking-tight">{notFound ? 'Link not found' : 'Something went wrong'}</h1>
	<p class="mt-2 text-muted">
		{notFound ? 'It may have been deleted, or it belongs to another account.' : (page.error?.message ?? 'Please try again.')}
	</p>
	<div class="mt-6 flex justify-center gap-2">
		<a class="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-canvas" href={resolve('/(app)/dashboard')}>
			Back to links
		</a>
		{#if !notFound}<Button onclick={() => invalidateAll()}>Try again</Button>{/if}
	</div>
</div>
