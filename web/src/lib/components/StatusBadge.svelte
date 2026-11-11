<!-- Whether the short link works right now, in words and color – color alone would leave some people guessing. -->
<script lang="ts">
	import type { LinkStatus } from '#lib/links.ts';

	let { status }: { status: LinkStatus } = $props();

	const STATUS_STYLES: Record<LinkStatus, { label: string; tone: string; dot: string }> = {
		active: { label: 'Active', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
		inactive: { label: 'Off', tone: 'bg-ink/5 text-muted', dot: 'bg-muted' },
		expired: { label: 'Expired', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' }
	};

	const style = $derived(STATUS_STYLES[status]);
</script>

<span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap {style.tone}">
	<span class="size-1.5 rounded-full {style.dot}" aria-hidden="true"></span>
	{style.label}
</span>
