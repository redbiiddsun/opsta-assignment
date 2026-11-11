import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { auth } from '#lib/auth.svelte.ts';

// Signed-in people have nothing to do on the sign-in and register pages
export function load() {
	if (auth.session) redirect(307, resolve('/(app)/dashboard'));
}
