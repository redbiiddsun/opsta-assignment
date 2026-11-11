<!--
  Select – ported from affectUI (MIT, https://www.affectui.com/components/select).
  A field that opens a list under it (or above, when there is no room), with a check on the chosen option, a
  highlight that glides to the active one and type-ahead. The list sits in the top layer (popover), so a card's
  overflow never cuts it.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type SelectOption = {
		value: string;
		label: string;
		/** A quiet second line under the label */
		description?: string;
		/** A 16px icon before the label, e.g. an inline SVG */
		icon?: Snippet;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	type Content = string | Snippet;

	type Props = {
		options: SelectOption[];
		value?: string | null;
		onchange?: (value: string, option: SelectOption) => void;
		/** Shown while nothing is chosen */
		placeholder?: string;
		/** Shown above the field and tied to it */
		label?: Content;
		/** A quiet line under the field – the error takes its place while there is one */
		hint?: Content;
		/** Marks the field invalid and shows this under it, in place of the hint */
		error?: Content | boolean;
		/** "Optional" next to the label */
		optional?: boolean;
		/** sm 28 · md 32 · lg 36 high */
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		/** Sends the value with a form, through a hidden input */
		name?: string;
		required?: boolean;
		id?: string;
		class?: string;
		'aria-label'?: string;
	};

	let {
		options,
		value = $bindable(null),
		onchange,
		placeholder = 'Choose…',
		label,
		hint,
		error,
		optional = false,
		size = 'md',
		disabled = false,
		name,
		required,
		id,
		class: className,
		'aria-label': ariaLabel
	}: Props = $props();

	const LIST_GAP = 4;
	const VIEWPORT_EDGE = 8;
	const LIST_MAX_HEIGHT = 288;
	const ESTIMATED_LIST_HEIGHT = 280;
	const LIST_MIN_HEIGHT = 120;
	const LIST_MIN_WIDTH = 180;
	const FLIP_THRESHOLD = 160;
	const TYPEAHEAD_RESET_MS = 700;

	type Placement = { top: number; left: number; width: number; maxHeight: number; up: boolean };

	const componentId = $props.id();
	const triggerId = $derived(id ?? `${componentId}-trigger`);
	const listId = `${componentId}-list`;
	const labelId = `${componentId}-label`;
	const messageId = `${componentId}-message`;
	const optionId = (index: number) => `${componentId}-option-${index}`;

	let open = $state(false);
	let active = $state(-1);
	let place: Placement | null = $state(null);
	let glow: { top: number; height: number } | null = $state(null);
	let trigger: HTMLButtonElement | undefined = $state();
	let list: HTMLDivElement | undefined = $state();
	const typed = { text: '', at: 0 };

	const shows = (content: Content | boolean | undefined): content is Content =>
		content != null && typeof content !== 'boolean' && content !== '';

	const chosen = $derived(options.find((option) => option.value === value) ?? null);
	const invalid = $derived(Boolean(error));
	const message = $derived(shows(error) ? error : shows(hint) ? hint : null);

	const enabled = (index: number) => index >= 0 && index < options.length && !options[index].disabled;
	const first = () => options.findIndex((option) => !option.disabled);
	const last = () => options.findLastIndex((option) => !option.disabled);
	const step = (from: number, direction: 1 | -1) => {
		for (let index = from + direction; index >= 0 && index < options.length; index += direction) {
			if (!options[index].disabled) return index;
		}
		return from;
	};

	function show(at?: number) {
		if (disabled || !options.length) return;
		const chosenAt = options.findIndex((option) => option.value === value);
		active = at ?? (enabled(chosenAt) ? chosenAt : first());
		open = true;
	}

	function hide(focusBack = true) {
		open = false;
		glow = null;
		place = null;
		if (focusBack) trigger?.focus({ preventScroll: true });
	}

	function pick(index: number) {
		if (!enabled(index)) return;
		const option = options[index];
		const changed = option.value !== value;
		value = option.value;
		if (changed) onchange?.(option.value, option);
		hide();
	}

	// Under the field, or above it when there is more room there; at least as wide as the field
	function measure() {
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const below = window.innerHeight - rect.bottom - LIST_GAP - VIEWPORT_EDGE;
		const above = rect.top - LIST_GAP - VIEWPORT_EDGE;
		const wanted = Math.min(list?.scrollHeight ?? ESTIMATED_LIST_HEIGHT, LIST_MAX_HEIGHT);
		const up = below < Math.min(wanted, FLIP_THRESHOLD) && above > below;
		const width = Math.max(rect.width, LIST_MIN_WIDTH);
		const left = Math.min(Math.max(VIEWPORT_EDGE, rect.left), window.innerWidth - width - VIEWPORT_EDGE);
		place = {
			top: up ? rect.top - LIST_GAP : rect.bottom + LIST_GAP,
			left,
			width,
			maxHeight: Math.max(LIST_MIN_HEIGHT, Math.min(LIST_MAX_HEIGHT, up ? above : below)),
			up
		};
	}

	// While open: the list goes into the top layer and follows the field on scroll and resize
	$effect(() => {
		if (!open || !list) return;
		const element = list;
		if ('showPopover' in element && !element.matches(':popover-open')) element.showPopover();
		measure();
		window.addEventListener('resize', measure);
		window.addEventListener('scroll', measure, true);
		return () => {
			window.removeEventListener('resize', measure);
			window.removeEventListener('scroll', measure, true);
			if ('hidePopover' in element && element.matches(':popover-open')) element.hidePopover();
		};
	});

	// A press anywhere else closes it, without taking the focus back
	$effect(() => {
		if (!open) return;
		const closeOnOutsidePress = (event: PointerEvent) => {
			const target = event.target as Node;
			if (trigger?.contains(target) || list?.contains(target)) return;
			hide(false);
		};
		document.addEventListener('pointerdown', closeOnOutsidePress, true);
		return () => document.removeEventListener('pointerdown', closeOnOutsidePress, true);
	});

	// The highlight glides to the active option, and the list scrolls it into view
	$effect(() => {
		void place;
		if (!open || active < 0) return;
		const row = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
		if (!row) return;
		glow = { top: row.offsetTop, height: row.offsetHeight };
		row.scrollIntoView({ block: 'nearest' });
	});

	// Typing letters jumps to the next option that starts with them, like a native select
	function typeahead(key: string) {
		const now = Date.now();
		typed.text = now - typed.at > TYPEAHEAD_RESET_MS ? key : typed.text + key;
		typed.at = now;
		const query = typed.text.toLowerCase();
		const start = open ? active : options.findIndex((option) => option.value === value);
		const offset = query.length === 1 ? 1 : 0;
		const order = [...options.keys()].map((index) => (index + start + offset + options.length) % options.length);
		const hit = order.find((index) => enabled(index) && options[index].label.toLowerCase().startsWith(query));
		if (hit === undefined) return;
		if (open) active = hit;
		else pick(hit);
	}

	const isPrintable = (event: KeyboardEvent) => event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;
		if (!open) {
			if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
				event.preventDefault();
				show();
			} else if (isPrintable(event)) typeahead(event.key);
			return;
		}
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				active = step(active, 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				active = step(active, -1);
				break;
			case 'Home':
			case 'PageUp':
				event.preventDefault();
				active = first();
				break;
			case 'End':
			case 'PageDown':
				event.preventDefault();
				active = last();
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (event.key === ' ' && Date.now() - typed.at < TYPEAHEAD_RESET_MS) typeahead(' ');
				else pick(active);
				break;
			case 'Escape':
				event.preventDefault();
				hide();
				break;
			case 'Tab':
				hide(false);
				break;
			default:
				if (isPrintable(event)) typeahead(event.key);
		}
	}

	const listStyle = $derived.by(() => {
		if (!place) return undefined;
		const vertical = place.up ? `bottom: ${window.innerHeight - place.top}px` : `top: ${place.top}px`;
		return `${vertical}; left: ${place.left}px; width: ${place.width}px; max-height: ${place.maxHeight}px`;
	});
</script>

{#snippet content(item: Content)}
	{#if typeof item === 'string'}{item}{:else}{@render item()}{/if}
{/snippet}

<div
	class={['ui-sel', className]}
	data-size={size}
	data-open={open || undefined}
	data-invalid={invalid || undefined}
	data-disabled={disabled || undefined}
>
	{#if label != null}
		<div class="ui-sel__head">
			<label class="ui-sel__label" id={labelId} for={triggerId}>{@render content(label)}</label>
			{#if optional}<span class="ui-sel__optional">Optional</span>{/if}
		</div>
	{/if}
	<button
		bind:this={trigger}
		id={triggerId}
		type="button"
		class="ui-sel__trigger"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={listId}
		aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
		aria-label={ariaLabel}
		aria-labelledby={ariaLabel ? undefined : label != null ? `${labelId} ${triggerId}` : undefined}
		aria-describedby={message ? messageId : undefined}
		aria-invalid={invalid || undefined}
		aria-required={required || undefined}
		{disabled}
		onclick={() => (open ? hide() : show())}
		onkeydown={handleKeydown}
	>
		{#if chosen?.icon}<span class="ui-sel__icon" aria-hidden="true">{@render chosen.icon()}</span>{/if}
		<span class="ui-sel__value" data-empty={chosen ? undefined : ''} title={chosen?.label}>
			{chosen ? chosen.label : placeholder}
		</span>
		<span class="ui-sel__chevron" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="m7 10 5 5 5-5" />
			</svg>
		</span>
	</button>
	{#if name}<input type="hidden" {name} value={value ?? ''} />{/if}
	{#if open}
		<div
			bind:this={list}
			id={listId}
			class="ui-sel__list"
			role="listbox"
			tabindex="-1"
			aria-labelledby={label != null ? labelId : undefined}
			aria-label={label == null ? (ariaLabel ?? placeholder) : undefined}
			popover="manual"
			data-up={place?.up || undefined}
			style={listStyle}
			onpointerleave={() => (active = -1)}
		>
			{#if glow}
				<span class="ui-sel__glow" aria-hidden="true" style:transform="translateY({glow.top}px)" style:height="{glow.height}px"></span>
			{/if}
			{#each options as option, index (option.value)}
				<div
					id={optionId(index)}
					class="ui-sel__option"
					role="option"
					tabindex="-1"
					data-index={index}
					aria-selected={option.value === value}
					aria-disabled={option.disabled || undefined}
					data-active={index === active || undefined}
					onpointermove={() => {
						if (!option.disabled && index !== active) active = index;
					}}
					onpointerdown={(event) => event.preventDefault()}
					onclick={() => pick(index)}
					onkeydown={handleKeydown}
				>
					{#if option.icon}<span class="ui-sel__icon" aria-hidden="true">{@render option.icon()}</span>{/if}
					<span class="ui-sel__text">
						<span class="ui-sel__option-label">{option.label}</span>
						{#if option.description}<span class="ui-sel__option-hint">{option.description}</span>{/if}
					</span>
					<span class="ui-sel__check" aria-hidden="true">
						{#if option.value === value}
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path class="ui-sel__tick" d="M5 12.5 9.5 17 19 7" pathLength="1" />
							</svg>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}
	{#if message}
		{#key shows(error)}
			<p class="ui-sel__message" id={messageId} aria-live={shows(error) ? 'polite' : undefined}>{@render content(message)}</p>
		{/key}
	{/if}
</div>

<style>
	/* Colors and motion as variables – override them on .ui-sel (see Theming in the docs) */
	.ui-sel {
	  --ui-sel-title: var(--aui-ink, #171717);
	  --ui-sel-ink: var(--aui-ink, #171717);
	  --ui-sel-subtle: var(--aui-muted, #8f8f8f);
	  --ui-sel-faint: var(--aui-placeholder, #b5b5b5);
	  --ui-sel-icon: var(--aui-muted, #8f8f8f);
	  --ui-sel-surface: var(--aui-surface, #ffffff);
	  --ui-sel-menu: var(--aui-surface, #ffffff);
	  --ui-sel-line: var(--aui-border, #e6e6e8);
	  --ui-sel-edge: var(--aui-border-strong, #d4d4d8);
	  --ui-sel-edge-open: var(--aui-border-strong, #b4b4bb);
	  --ui-sel-glow: #f4f4f5;
	  --ui-sel-readonly: #fafafa;
	  --ui-sel-shadow-menu: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 18px 40px -12px rgba(0, 0, 0, 0.18), 0 4px 12px -4px rgba(0, 0, 0, 0.06);
	  --ui-sel-danger: var(--aui-danger, #c4320a);
	  --ui-sel-danger-edge: #ff8a7a;
	  --ui-sel-danger-wash: color-mix(in srgb, var(--aui-red, #f04438) 4%, transparent);
	  --ui-sel-focus: var(--aui-focus, rgba(0, 96, 226, 0.7));
	  --ui-sel-ease: cubic-bezier(0.22, 1, 0.36, 1);

	  --h: 36px;
	  --px: 12px;
	  --fs: 13.5px;
	  --radius: var(--aui-radius, 10px);

	  display: flex;
	  flex-direction: column;
	  gap: 7px;
	  min-width: 0;
	  font-family: var(--aui-font, "Inter", "InterVariable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
	  font-size: 13.5px;
	  line-height: 20px;
	  color: var(--ui-sel-ink);
	  -webkit-font-smoothing: antialiased;
	}
	.ui-sel[data-size="sm"] { --h: 32px; --px: 10px; --fs: 13px; --radius: calc(var(--aui-radius, 10px) - 1px); }
	.ui-sel[data-size="lg"] { --h: 40px; --px: 14px; --fs: 14px; --radius: calc(var(--aui-radius, 10px) + 2px); }
	/* Touch screens: a comfortable tap height and 16px text */
	@media (pointer: coarse) {
	  .ui-sel { --fs: 16px; }
	  .ui-sel[data-size="sm"] { --h: 36px; }
	  .ui-sel[data-size="md"] { --h: 40px; }
	  .ui-sel[data-size="lg"] { --h: 44px; }
	}

	.ui-sel__head { display: flex; align-items: baseline; gap: 6px; min-width: 0; padding: 0 2px; }
	.ui-sel__label { min-width: 0; font-size: 13px; font-weight: 500; color: var(--ui-sel-title); overflow-wrap: anywhere; cursor: default; }
	.ui-sel__optional { flex: none; font-size: 12px; line-height: 16px; color: var(--ui-sel-subtle); }

	/* The field: the Text Field's look – white with a 1px gray edge that darkens on hover and while open */
	.ui-sel__trigger {
	  display: flex;
	  align-items: center;
	  gap: 8px;
	  box-sizing: border-box;
	  width: 100%;
	  height: var(--h);
	  min-width: 0;
	  margin: 0;
	  padding: 0 calc(var(--px) - 2px) 0 var(--px);
	  border: 0;
	  border-radius: var(--radius);
	  background: var(--ui-sel-surface);
	  box-shadow: 0 0 0 1px var(--ui-sel-line), 0 1px 2px rgba(0, 0, 0, 0.04);
	  font: inherit;
	  font-size: var(--fs);
	  color: var(--ui-sel-ink);
	  text-align: start;
	  cursor: pointer;
	  -webkit-tap-highlight-color: transparent;
	  transition: box-shadow 140ms ease, background-color 140ms ease;
	}
	.ui-sel__trigger:hover { box-shadow: 0 0 0 1px var(--ui-sel-edge), 0 1px 2px rgba(0, 0, 0, 0.04); }
	.ui-sel[data-open] .ui-sel__trigger { box-shadow: 0 0 0 1px var(--ui-sel-edge-open), 0 1px 2px rgba(0, 0, 0, 0.04); }
	.ui-sel__trigger:focus-visible { outline: 2px solid var(--ui-sel-focus); outline-offset: 2px; }
	.ui-sel[data-invalid] .ui-sel__trigger { background: var(--ui-sel-danger-wash); box-shadow: 0 0 0 1px var(--ui-sel-danger-edge), 0 1px 2px rgba(0, 0, 0, 0.04); }
	.ui-sel__trigger:disabled { background: var(--ui-sel-readonly); box-shadow: 0 0 0 1px var(--ui-sel-line); cursor: not-allowed; }
	.ui-sel[data-disabled] { opacity: 0.55; }

	.ui-sel__value { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
	.ui-sel__value[data-empty] { color: var(--ui-sel-faint); }
	.ui-sel__icon { display: grid; flex: none; place-items: center; width: 16px; height: 16px; color: var(--ui-sel-icon); }
	.ui-sel__icon > :global(svg), .ui-sel__icon > :global(img) { display: block; width: 16px; height: 16px; }
	.ui-sel__chevron { display: grid; flex: none; place-items: center; width: 16px; height: 16px; color: var(--ui-sel-icon); transition: transform 240ms var(--ui-sel-ease); }
	.ui-sel[data-open] .ui-sel__chevron { transform: rotate(180deg); }

	/* The list: a white card in the top layer, at the field's edge */
	.ui-sel__list {
	  position: fixed;
	  inset: auto;
	  z-index: 1000;
	  box-sizing: border-box;
	  margin: 0;
	  padding: 5px;
	  border: 0;
	  border-radius: 14px;
	  background: var(--ui-sel-menu);
	  box-shadow: var(--ui-sel-shadow-menu);
	  color: var(--ui-sel-ink);
	  font: inherit;
	  overflow-y: auto;
	  overscroll-behavior: contain;
	  scrollbar-width: thin;
	  transform-origin: top center;
	  animation: ui-sel-in 200ms var(--ui-sel-ease) both;
	}
	.ui-sel__list[data-up] { transform-origin: bottom center; }
	.ui-sel__list::backdrop { display: none; }

	/* One soft highlight that glides between the rows */
	.ui-sel__glow {
	  position: absolute;
	  top: 0;
	  left: 5px;
	  right: 5px;
	  border-radius: 9px;
	  background: var(--ui-sel-glow);
	  pointer-events: none;
	  transition: transform 180ms var(--ui-sel-ease), height 180ms var(--ui-sel-ease);
	}

	.ui-sel__option {
	  position: relative;
	  display: flex;
	  align-items: center;
	  gap: 8px;
	  min-height: 34px;
	  padding: 7px 10px;
	  box-sizing: border-box;
	  border-radius: 9px;
	  font-size: 13.5px;
	  line-height: 20px;
	  cursor: pointer;
	  user-select: none;
	}
	.ui-sel__option[aria-disabled] { color: var(--ui-sel-faint); cursor: default; }
	.ui-sel__option[aria-disabled] .ui-sel__icon { opacity: 0.5; }
	.ui-sel__text { display: grid; flex: 1; min-width: 0; }
	.ui-sel__option-label { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
	.ui-sel__option[aria-selected="true"] .ui-sel__option-label { font-weight: 500; }
	.ui-sel__option-hint { overflow: hidden; font-size: 12px; line-height: 16px; white-space: nowrap; text-overflow: ellipsis; color: var(--ui-sel-subtle); }
	.ui-sel__check { display: grid; flex: none; place-items: center; width: 16px; height: 16px; color: var(--ui-sel-ink); }
	.ui-sel__tick { stroke-dasharray: 1; animation: ui-sel-draw 280ms 40ms var(--ui-sel-ease) both; }
	@media (pointer: coarse) {
	  .ui-sel__option { min-height: 40px; font-size: 15px; }
	}

	.ui-sel__message { margin: 0; padding: 0 2px; font-size: 12.5px; line-height: 17px; color: var(--ui-sel-subtle); overflow-wrap: anywhere; animation: ui-sel-message 260ms var(--ui-sel-ease); }
	.ui-sel[data-invalid] .ui-sel__message { color: var(--ui-sel-danger); }

	@keyframes ui-sel-in {
	  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
	}
	.ui-sel__list[data-up] { animation-name: ui-sel-in-up; }
	@keyframes ui-sel-in-up {
	  from { opacity: 0; transform: translateY(4px) scale(0.98); }
	}
	@keyframes ui-sel-draw {
	  from { stroke-dashoffset: 1; }
	  to { stroke-dashoffset: 0; }
	}
	@keyframes ui-sel-message {
	  from { opacity: 0; transform: translateY(-3px); filter: blur(2px); }
	}

	@media (prefers-reduced-motion: reduce) {
	  .ui-sel *, .ui-sel__list { animation-duration: 1ms !important; }
	  .ui-sel__glow, .ui-sel__chevron, .ui-sel__trigger { transition-duration: 1ms; }
	}

	/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
	:global(:where(.dark, [data-theme="dark"])) .ui-sel {
	  --ui-sel-title: var(--aui-ink, #ededed);
	  --ui-sel-ink: var(--aui-ink, #ededed);
	  --ui-sel-subtle: var(--aui-muted, #8b8b92);
	  --ui-sel-faint: var(--aui-placeholder, #5c5c63);
	  --ui-sel-icon: var(--aui-muted, #8b8b92);
	  --ui-sel-surface: var(--aui-surface, #19191b);
	  --ui-sel-menu: var(--aui-surface, #19191b);
	  --ui-sel-line: var(--aui-border, #2a2a2e);
	  --ui-sel-edge: var(--aui-border-strong, #3a3a40);
	  --ui-sel-edge-open: var(--aui-border-strong, #4e4e55);
	  --ui-sel-glow: #26262a;
	  --ui-sel-readonly: #151517;
	  --ui-sel-shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 18px 40px -12px rgba(0, 0, 0, 0.6);
	  --ui-sel-danger: var(--aui-danger, #ff8a7a);
	  --ui-sel-danger-edge: color-mix(in srgb, var(--aui-red, #ff6b5f) 45%, transparent);
	  --ui-sel-danger-wash: color-mix(in srgb, var(--aui-red, #ff6b5f) 6%, transparent);
	  --ui-sel-focus: var(--aui-focus, rgba(77, 141, 255, 0.8));
	}
</style>
