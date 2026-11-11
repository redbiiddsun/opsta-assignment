import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// The API owns GET /:shortCode at the root, so the web app lives under /app.
const BASE_PATH = '/app';
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:3000';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA: nginx serves the files; fallback lets client routes load on refresh.
			adapter: adapter({ fallback: 'index.html' }),
			paths: { base: BASE_PATH }
		})
	],
	server: {
		// Same origin in dev as in Docker (nginx), so the API needs no CORS.
		proxy: { '/api': API_ORIGIN }
	}
});
