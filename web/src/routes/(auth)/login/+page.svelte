<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import { auth, type Credentials } from '#lib/auth.svelte.ts';

	async function login(credentials: Credentials) {
		await auth.login(credentials);
		await goto(resolve('/(app)/dashboard'));
	}
</script>

<svelte:head><title>Sign in · URL Shortener</title></svelte:head>

<AuthForm
	title="Sign in"
	subtitle="Welcome back. Manage your short links."
	submitLabel="Sign in"
	passwordAutocomplete="current-password"
	notice={page.url.searchParams.has('registered') ? 'Your account was created. Sign in to continue.' : undefined}
	onsubmit={login}
>
	{#snippet footer()}
		No account yet? <a class="font-medium text-ink underline-offset-4 hover:underline" href={resolve('/(auth)/register')}>Create one</a>
	{/snippet}
</AuthForm>
