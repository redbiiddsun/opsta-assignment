<!--
  Notification Stack – ported from affectUI (MIT, https://www.affectui.com/components/notification-stack).
  Notices stacked behind each other: only the front card can be read, the others peek out below it. Dismissing the
  front card slides it away and the next one moves up.
-->
<script lang="ts" module>
	export type NoticePattern = 'orbit' | 'grid' | 'rays';

	export type Notice = {
		id: string;
		/** Small label in the pill, e.g. "Notice" */
		badge?: string;
		title: string;
		text: string;
		action?: { label: string; href?: string; onclick?: () => void; external?: boolean };
		/** Line art in the top-right corner */
		pattern?: NoticePattern;
	};
</script>

<script lang="ts">
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	type Props = {
		notices: Notice[];
		/** Called after a notice was dismissed */
		ondismiss?: (notice: Notice) => void;
		class?: string;
	};

	let { notices, ondismiss, class: className }: Props = $props();

	const PEEK = 12; // how far each card behind peeks out below the one in front, in px
	const MAX_BEHIND = 2;
	const MAX_RENDERED_DEPTH = 3;
	const DEPTH_SCALE = 0.05;
	const LEAVE_MS = 320;

	// Dismissed notices stay gone even if the parent still passes them
	const removed = new SvelteSet<string>();
	const leaving = new SvelteSet<string>();
	const heights = new SvelteMap<string, number>();

	const items = $derived(notices.filter((notice) => !removed.has(notice.id)));
	const visible = $derived(items.filter((notice) => !leaving.has(notice.id)));
	const behind = $derived(Math.min(visible.length - 1, MAX_BEHIND));
	// The front card's height sets the height of the stack
	const front = $derived(visible[0] ? (heights.get(visible[0].id) ?? 0) : 0);

	/** Tracks a card's full height, also when a card behind is cut to the front card's height */
	function trackHeight(id: string) {
		return (card: HTMLElement) => {
			const measure = () => heights.set(id, card.scrollHeight + card.offsetHeight - card.clientHeight);
			measure();
			const observer = new ResizeObserver(measure);
			observer.observe(card);
			return () => {
				observer.disconnect();
				heights.delete(id);
			};
		};
	}

	function dismiss(notice: Notice) {
		leaving.add(notice.id);
		ondismiss?.(notice);
		setTimeout(() => {
			removed.add(notice.id);
			leaving.delete(notice.id);
		}, LEAVE_MS);
	}

	function layout(notice: Notice) {
		const index = visible.findIndex((item) => item.id === notice.id);
		const gone = index === -1;
		const depth = Math.max(0, index);
		const isBehind = !gone && depth > 0;
		const shownDepth = Math.min(depth, MAX_BEHIND);
		// Cards behind line up on the front card's bottom edge, a little lower and smaller each;
		// a card taller than the front one is cut to its height, so it never peeks out above
		const y = gone || depth === 0 ? 0 : front - Math.min(heights.get(notice.id) ?? front, front) + shownDepth * PEEK;
		const scale = gone ? 1 : 1 - shownDepth * DEPTH_SCALE;
		return {
			gone,
			depth,
			isBehind,
			hidden: !gone && depth > MAX_RENDERED_DEPTH,
			zIndex: gone ? 10 : 10 - depth,
			transform: gone ? undefined : `translateY(${y}px) scale(${scale})`,
			opacity: depth > MAX_BEHIND ? '0' : undefined,
			maxHeight: isBehind && front ? `${front}px` : undefined
		};
	}

	const RAY_COUNT = 8;
	const RAY_LENGTH = 230;
	const rays = Array.from({ length: RAY_COUNT }, (_, index) => {
		const angle = (index * Math.PI) / 16;
		return `M210 6 L${210 - Math.cos(angle) * RAY_LENGTH} ${6 + Math.sin(angle) * RAY_LENGTH}`;
	});
</script>

<section class={['ui-ns', className]} aria-label="Notifications" style:height="{visible.length ? front + behind * PEEK : 0}px">
	{#each items as notice (notice.id)}
		{@const card = layout(notice)}
		<!-- Only the cards that can show are rendered – a long list stays light -->
		{#if !card.hidden}
			<article
				{@attach trackHeight(notice.id)}
				class="ui-ns__card"
				data-depth={card.gone ? undefined : card.depth}
				data-leaving={card.gone || undefined}
				aria-labelledby="{notice.id}-title"
				aria-hidden={card.isBehind || undefined}
				inert={card.isBehind || card.gone}
				style:z-index={card.zIndex}
				style:transform={card.transform}
				style:opacity={card.opacity}
				style:max-height={card.maxHeight}
			>
				<svg class="ui-ns__pattern" viewBox="0 0 220 160" fill="none" aria-hidden="true">
					{#if (notice.pattern ?? 'orbit') === 'orbit'}
						<circle cx="190" cy="10" r="46" />
						<circle cx="190" cy="10" r="86" />
						<circle cx="190" cy="10" r="128" />
						<path d="M60 160 220 0M0 58h220M150 0v160" />
						<circle cx="150" cy="58" r="3.5" class="ui-ns__dot" />
					{:else if notice.pattern === 'grid'}
						{#each [30, 60, 90, 120, 150, 180, 210] as x (x)}<path d="M{x} 0v160" />{/each}
						{#each [20, 50, 80, 110, 140] as y (y)}<path d="M0 {y}h220" />{/each}
						<rect x="150" y="50" width="30" height="30" class="ui-ns__fill" />
						<circle cx="180" cy="50" r="3.5" class="ui-ns__dot" />
					{:else}
						{#each rays as ray (ray)}<path d={ray} />{/each}
						<path d="M120 6a90 90 0 0 0 90 90" />
						<circle cx="146" cy="70" r="3.5" class="ui-ns__dot" />
					{/if}
				</svg>
				<div class="ui-ns__body">
					<div class="ui-ns__top">
						{#if notice.badge}
							<span class="ui-ns__badge" dir="auto" title={notice.badge}>{notice.badge}</span>
						{:else}
							<span></span>
						{/if}
						<button
							type="button"
							class="ui-ns__close"
							aria-label="Dismiss {notice.title}"
							onclick={(event) => {
								event.stopPropagation();
								dismiss(notice);
							}}
						>
							<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
								<path d="m4 4 8 8M12 4l-8 8" />
							</svg>
						</button>
					</div>
					<h3 id="{notice.id}-title" class="ui-ns__title" dir="auto">{notice.title}</h3>
					<p class="ui-ns__text" dir="auto">{notice.text}</p>
					{#if notice.action?.href}
						<a
							class="ui-ns__btn"
							dir="auto"
							href={notice.action.href}
							onclick={notice.action.onclick}
							target={notice.action.external ? '_blank' : undefined}
							rel={notice.action.external ? 'noreferrer' : undefined}
						>
							{notice.action.label}
							{#if notice.action.external}
								<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M5 11 11 5M6 5h5v5" />
								</svg>
							{/if}
						</a>
					{:else if notice.action}
						<button type="button" class="ui-ns__btn" dir="auto" onclick={notice.action.onclick}>{notice.action.label}</button>
					{/if}
				</div>
			</article>
		{/if}
	{/each}
</section>

<style>
	.ui-ns {
	  --ui-ns-card: var(--aui-surface, #ffffff);
	  --ui-ns-line: var(--aui-border, #e5e5e5);
	  --ui-ns-ink: var(--aui-ink, #171717);
	  --ui-ns-muted: var(--aui-muted, #737373);
	  --ui-ns-art: #e3e3e3;
	  --ui-ns-accent: var(--aui-blue, #4fb0fe);
	  --ui-ns-focus: var(--aui-focus, rgba(0, 96, 226, 0.7));
	  --ui-ns-ease: var(--aui-ease, cubic-bezier(0.22, 1, 0.36, 1));
	  position: relative;
	  box-sizing: border-box;
	  width: 100%;
	  max-width: 380px;
	  font-family: var(--aui-font, "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
	  color: var(--ui-ns-ink);
	  -webkit-font-smoothing: antialiased;
	  transition: height 460ms var(--ui-ns-ease);
	}
	.ui-ns *, .ui-ns *::before, .ui-ns *::after { box-sizing: border-box; }

	.ui-ns__card {
	  position: absolute;
	  top: 0;
	  left: 0;
	  right: 0;
	  overflow: hidden;
	  background: var(--ui-ns-card);
	  border: 1px solid var(--ui-ns-line);
	  border-radius: calc(var(--aui-radius-lg, 16px) + 4px);
	  box-shadow:
	    0 1px 2px rgba(0, 0, 0, 0.03),
	    0 8px 24px rgba(0, 0, 0, 0.035);
	  transform-origin: 50% 100%;
	  transition:
	    transform 460ms var(--ui-ns-ease),
	    opacity 300ms ease,
	    box-shadow 300ms ease;
	}
	/* Cards behind show only their edge */
	.ui-ns__card > * { transition: opacity 260ms ease; }
	.ui-ns__card:not([data-depth="0"]) > * { opacity: 0; }
	.ui-ns__card[data-leaving] {
	  opacity: 0;
	  transform: translateX(40px) scale(0.98) !important;
	  transition: transform 320ms var(--ui-ns-ease), opacity 240ms ease;
	}

	.ui-ns__pattern {
	  position: absolute;
	  top: 0;
	  right: 0;
	  width: 220px;
	  height: 160px;
	  stroke: var(--ui-ns-art);
	  stroke-width: 1;
	  pointer-events: none;
	  /* Only the top-right corner, fading out towards the text */
	  -webkit-mask-image: radial-gradient(120% 110% at 100% 0%, #000 20%, transparent 70%);
	  mask-image: radial-gradient(120% 110% at 100% 0%, #000 20%, transparent 70%);
	}
	.ui-ns__dot { fill: #d4d4d4; stroke: none; }
	.ui-ns__fill { fill: #f5f5f5; }

	.ui-ns__body {
	  position: relative;
	  padding: 18px 20px 20px;
	}
	.ui-ns__top {
	  display: flex;
	  align-items: center;
	  justify-content: space-between;
	  gap: 8px;
	  min-height: 26px;
	  margin-bottom: 14px;
	}
	.ui-ns__badge {
	  padding: 2px 9px;
	  border-radius: 999px;
	  background: #fff;
	  box-shadow: inset 0 0 0 1px var(--ui-ns-line);
	  font-size: 11px;
	  font-weight: 500;
	  line-height: 18px;
	  letter-spacing: 0.06em;
	  text-transform: uppercase;
	  color: var(--aui-muted, #525252);
	  min-width: 0;
	  overflow: hidden;
	  white-space: nowrap;
	  text-overflow: ellipsis;
	}
	.ui-ns__close {
	  display: grid;
	  flex: none;
	  place-items: center;
	  width: 28px;
	  height: 28px;
	  margin: -2px -6px 0 0;
	  padding: 0;
	  border: 0;
	  border-radius: calc(var(--aui-radius-sm, 7px) + 1px);
	  background: transparent;
	  color: var(--ui-ns-muted);
	  cursor: pointer;
	  transition: background-color 140ms ease, color 140ms ease;
	}
	.ui-ns__close:hover { background: var(--aui-subtle, rgba(0, 0, 0, 0.05)); color: var(--ui-ns-ink); }
	.ui-ns__title {
	  margin: 0;
	  font-size: 16px;
	  font-weight: 500;
	  line-height: 22px;
	  letter-spacing: -0.01em;
	  text-align: start;
	  overflow-wrap: anywhere;
	}
	.ui-ns__text {
	  margin: 6px 0 0;
	  max-width: 34ch;
	  font-size: 14px;
	  line-height: 21px;
	  color: var(--ui-ns-muted);
	  text-align: start;
	  overflow-wrap: anywhere;
	  white-space: pre-line;
	}
	.ui-ns__btn {
	  display: inline-flex;
	  align-items: center;
	  gap: 8px;
	  /* Grows with a long label instead of leaving the card */
	  min-height: 32px;
	  max-width: 100%;
	  margin-top: 16px;
	  padding: 6px 12px;
	  border: 0;
	  border-radius: calc(var(--aui-radius, 10px) - 1px);
	  background: var(--aui-surface, #fff);
	  box-shadow: 0 0 0 1px var(--ui-ns-line), 0 1px 2px rgba(0, 0, 0, 0.04);
	  font: inherit;
	  font-size: 13px;
	  font-weight: 500;
	  color: var(--ui-ns-ink);
	  text-align: start;
	  overflow-wrap: anywhere;
	  text-decoration: none;
	  cursor: pointer;
	  transition: background-color 160ms ease, transform 160ms ease;
	}
	.ui-ns__btn:hover { background: #f7f7f7; }
	.ui-ns__btn:active { transform: scale(0.98); }
	.ui-ns__btn svg { flex: none; color: var(--ui-ns-muted); }
	.ui-ns button:focus-visible,
	.ui-ns a:focus-visible { outline: 2px solid var(--ui-ns-focus); outline-offset: 2px; }

	@media (prefers-reduced-motion: reduce) {
	  .ui-ns, .ui-ns__card, .ui-ns__card > * { transition: none; }
	}

	/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
	:global(:where(.dark, [data-theme="dark"])) .ui-ns {
	  --ui-ns-card: var(--aui-surface, #232326);
	  --ui-ns-line: var(--aui-border, rgba(255, 255, 255, 0.1));
	  --ui-ns-ink: var(--aui-ink, #ededed);
	  --ui-ns-muted: var(--aui-muted, #8f8f8f);
	  --ui-ns-art: rgba(255, 255, 255, 0.08);
	  --ui-ns-focus: var(--aui-focus, rgba(77, 141, 255, 0.8));
	}
	:global(:where(.dark, [data-theme="dark"])) .ui-ns__card {
	  box-shadow:
	    var(--aui-shadow-card, 0 1px 2px rgba(0, 0, 0, 0.4),
	    0 8px 24px rgba(0, 0, 0, 0.35));
	}
	:global(:where(.dark, [data-theme="dark"])) .ui-ns__dot { fill: rgba(255, 255, 255, 0.22); }
	:global(:where(.dark, [data-theme="dark"])) .ui-ns__fill { fill: rgba(255, 255, 255, 0.04); }
	:global(:where(.dark, [data-theme="dark"])) .ui-ns__badge { background: #2a2a2d; color: var(--aui-muted, #c4c4c4); }
	:global(:where(.dark, [data-theme="dark"])) .ui-ns__close:hover { background: var(--aui-subtle, rgba(255, 255, 255, 0.06)); }
	:global(:where(.dark, [data-theme="dark"])) .ui-ns__btn {
	  background: var(--aui-surface, #2a2a2d);
	  box-shadow: 0 0 0 1px var(--ui-ns-line), 0 1px 2px rgba(0, 0, 0, 0.4);
	}
	:global(:where(.dark, [data-theme="dark"])) .ui-ns__btn:hover { background: #313135; }
</style>
