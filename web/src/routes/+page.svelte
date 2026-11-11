<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth } from '#lib/auth.svelte.ts';
</script>

<main class="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
	<h1 class="text-2xl font-semibold tracking-tight">URL Shortener</h1>
	{#if auth.session}
		<p class="text-muted">
			Signed in as <span class="font-medium text-ink">{auth.session.email}</span>.
			<a class="font-medium text-ink underline-offset-4 hover:underline" href={resolve('/(app)/dashboard')}>Open dashboard</a>
		</p>
	{:else}
		<p class="text-muted">
			<a class="font-medium text-ink underline-offset-4 hover:underline" href={resolve('/(auth)/login')}>Sign in</a> or
			<a class="font-medium text-ink underline-offset-4 hover:underline" href={resolve('/(auth)/register')}>create an account</a>
			to manage your links.
		</p>
	{/if}
	<!-- The API docs live outside the app's /app base path, so this is a plain URL -->
	<p class="text-sm text-muted">API docs: <a class="underline" href="/api/docs" rel="external">/api/docs</a></p>
</main>
