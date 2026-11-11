# web

SvelteKit single-page app for the URL Shortener, built with
`@sveltejs/adapter-static` and served under the base path `/app`.

## Develop

```sh
npm ci
npm run dev
```

The dev server proxies `/api` to `API_ORIGIN` (default `http://localhost:3000`),
so start the API first.

## Build and check

```sh
npm run build   # static output in build/
npm run check   # svelte-check type check
```

For the Docker image and the nginx setup (SPA on `/app`, everything else
proxied to the API), see the [root README](../README.md).
