import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { auth } from '#lib/auth.svelte.ts';

// Every page in (app) needs a session. ssr is off, so this runs in the browser where the stored session lives;
// the API still checks the token on every request – this guard only keeps people off pages they can't use.
export function load() {
	if (!auth.session) redirect(307, resolve('/(auth)/login'));
}
