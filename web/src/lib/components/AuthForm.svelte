<!-- The email + password card shared by the login and register pages. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import TextField from '#lib/components/ui/TextField.svelte';
	import { describeAuthError, type Credentials } from '#lib/auth.svelte.ts';

	type Props = {
		title: string;
		subtitle: string;
		submitLabel: string;
		/** "new-password" on register lets password managers offer a strong one */
		passwordAutocomplete: 'current-password' | 'new-password';
		passwordHint?: string;
		notice?: string;
		/** Asks for the password twice – for register, where a typo would lock the person out */
		confirmPassword?: boolean;
		onsubmit: (credentials: Credentials) => Promise<void>;
		footer: Snippet;
	};

	let { title, subtitle, submitLabel, passwordAutocomplete, passwordHint, notice, confirmPassword = false, onsubmit, footer }: Props = $props();

	// Mirrors CredentialsRequest on the API, so most mistakes are caught before a request is spent
	const MIN_PASSWORD_LENGTH = 8;
	const MAX_PASSWORD_LENGTH = 128;
	const MAX_EMAIL_LENGTH = 254;

	let email = $state('');
	let password = $state('');
	let passwordConfirmation = $state('');
	// The mismatch shows only after a submit attempt, then updates live as the person fixes it
	let attemptedSubmit = $state(false);
	const passwordsMismatch = $derived(confirmPassword && passwordConfirmation !== password);
	let submitting = $state(false);
	let errorMessage = $state('');

	async function handleSubmit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();
		if (submitting) return;
		attemptedSubmit = true;
		errorMessage = '';
		if (passwordsMismatch) {
			event.currentTarget
				.querySelector<HTMLInputElement>('[name="password-confirmation"]')
				?.focus();
			return;
		}
		submitting = true;
		try {
			await onsubmit({ email: email.trim(), password });
		} catch (error) {
			errorMessage = describeAuthError(error);
		} finally {
			submitting = false;
		}
	}
</script>

<main class="flex min-h-dvh items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
		<h1 class="text-xl font-semibold tracking-tight">{title}</h1>
		<p class="mt-1 text-sm text-muted">{subtitle}</p>

		<form class="mt-6 flex flex-col gap-4" onsubmit={handleSubmit}>
			{#if notice}
				<p class="rounded-lg bg-ink/5 px-3 py-2 text-sm" role="status">{notice}</p>
			{/if}
			<TextField
				bind:value={email}
				label="Email"
				type="email"
				name="email"
				autocomplete="email"
				maxlength={MAX_EMAIL_LENGTH}
				required
			/>
			<TextField
				bind:value={password}
				label="Password"
				type="password"
				name="password"
				autocomplete={passwordAutocomplete}
				minlength={MIN_PASSWORD_LENGTH}
				maxlength={MAX_PASSWORD_LENGTH}
				hint={passwordHint}
				required
			/>
			{#if confirmPassword}
				<TextField
					bind:value={passwordConfirmation}
					label="Confirm password"
					type="password"
					name="password-confirmation"
					autocomplete="new-password"
					maxlength={MAX_PASSWORD_LENGTH}
					error={attemptedSubmit && passwordsMismatch ? 'Passwords do not match' : undefined}
					required
				/>
			{/if}

			{#if errorMessage}
				<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{errorMessage}</p>
			{/if}

			<!-- A wrapper, since the button's own scoped styles outrank Tailwind margin utilities -->
			<div class="mt-2">
				<Button type="submit" size="lg" loading={submitting} class="w-full">{submitLabel}</Button>
			</div>
		</form>

		<p class="mt-6 text-center text-sm text-muted">{@render footer()}</p>
	</div>
</main>
