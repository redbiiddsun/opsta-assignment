<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import { auth, type Credentials } from '#lib/auth.svelte.ts';

	async function register(credentials: Credentials) {
		await auth.register(credentials);
		// The account exists now, so a failed sign-in must not surface on this form – retrying would only hit 409
		try {
			await auth.login(credentials);
		} catch {
			await goto(`${resolve('/(auth)/login')}?registered=1`);
			return;
		}
		await goto(resolve('/(app)/dashboard'));
	}
</script>

<svelte:head><title>Create account · URL Shortener</title></svelte:head>

<AuthForm
	title="Create an account"
	subtitle="Shorten links and see who clicks them."
	submitLabel="Create account"
	passwordAutocomplete="new-password"
	passwordHint="At least 8 characters"
	confirmPassword
	onsubmit={register}
>
	{#snippet footer()}
		Already have an account? <a class="font-medium text-ink underline-offset-4 hover:underline" href={resolve('/(auth)/login')}>Sign in</a>
	{/snippet}
</AuthForm>
