<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/Button.svelte';
	import { auth } from '#lib/auth.svelte.ts';

	async function logout() {
		auth.logout();
		await goto(resolve('/(auth)/login'));
	}
</script>

<svelte:head><title>Dashboard · URL Shortener</title></svelte:head>

<div class="min-h-dvh">
	<header class="border-b border-line bg-surface">
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
			<span class="font-semibold tracking-tight">URL Shortener</span>
			<div class="flex items-center gap-3">
				<span class="hidden text-sm text-muted sm:inline">{auth.session?.email}</span>
				<Button variant="secondary" size="sm" onclick={logout}>Sign out</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-10">
		<h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
		<p class="mt-2 text-muted">Your links will show up here.</p>
	</main>
</div>
