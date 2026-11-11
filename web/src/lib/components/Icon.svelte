<!-- Line icons in the style of AffectUI's own (1.6px strokes on a 24px grid). Decorative: label the control, not the icon. -->
<script lang="ts" module>
	const PATHS = {
		link: 'M10 14a3.5 3.5 0 0 0 5 0l4-4a3.536 3.536 0 0 0-5-5l-.5.5M14 10a3.5 3.5 0 0 0-5 0l-4 4a3.536 3.536 0 0 0 5 5l.5-.5',
		plus: 'M12 5v14M5 12h14',
		chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
		logout: 'M15 17.6V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.4M10 12h11m0 0-3-3m3 3-3 3',
		menu: 'M4 6h16M4 12h16M4 18h16',
		close: 'm6 6 12 12M18 6 6 18',
		copy: 'M9 15c0-2.828 0-4.243.879-5.121C10.757 9 12.172 9 15 9h1c2.828 0 4.243 0 5.121.879C22 10.757 22 12.172 22 15v1c0 2.828 0 4.243-.879 5.121C20.243 22 18.828 22 16 22h-1c-2.828 0-4.243 0-5.121-.879C9 20.243 9 18.828 9 16v-1ZM17 9c-.003-2.957-.047-4.489-.908-5.538a4 4 0 0 0-.554-.554C14.43 2 12.788 2 9.5 2c-3.287 0-4.931 0-6.038.908a4 4 0 0 0-.554.554C2 4.57 2 6.212 2 9.5c0 3.287 0 4.931.908 6.038a4 4 0 0 0 .554.554c1.05.86 2.58.906 5.538.908',
		check: 'M5 12.5 9.5 17 19 7',
		external: 'M14 4h6v6M20 4l-9 9M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
		trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
		back: 'M19 12H5m0 0 6-6m-6 6 6 6',
		cursor: 'M5 3l14 7-6 2-2 6-6-15Z',
		clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
		calendar: 'M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'
	} as const;

	export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
	type Props = { name: IconName; size?: number; class?: string };

	let { name, size = 18, class: className }: Props = $props();
</script>

<svg
	class={className}
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={PATHS[name]} />
</svg>
