<!--
  Text Field – ported from affectUI (MIT, https://www.affectui.com/components/text-field).
  A label, an optional hint, prefix and suffix, a clear, reveal or copy button, a character count, and an error
  that takes the hint's place.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Content = string | Snippet;

	type Props = Omit<HTMLInputAttributes, 'size' | 'prefix' | 'value'> & {
		value?: string;
		/** Shown above the field and tied to it */
		label?: Content;
		/** A quiet line under the field – the error takes its place while there is one */
		hint?: Content;
		/** Marks the field invalid and shows this under it, in place of the hint */
		error?: Content | boolean;
		/** Text or an icon inside the field, before the value – e.g. "https://" */
		prefix?: Content;
		/** Text or an icon inside the field, after the value */
		suffix?: Content;
		/** sm 28 · md 32 · lg 36 high */
		size?: 'sm' | 'md' | 'lg';
		/** "Optional" next to the label */
		optional?: boolean;
		/** A small × that empties the field while it has a value */
		clearable?: boolean;
		/** A copy button – for API keys, links and IDs, usually with readonly */
		copyable?: boolean;
		/** Shows "12/40" under the field; needs maxlength */
		counter?: boolean;
		/** Called after the × emptied the field (oninput fires too) */
		onclear?: () => void;
		/** Extra class on the input itself; class goes on the wrapper */
		inputClass?: string;
	};

	let {
		value = $bindable(''),
		label,
		hint,
		error,
		prefix,
		suffix,
		size = 'md',
		optional = false,
		clearable = false,
		copyable = false,
		counter = false,
		onclear,
		onkeydown,
		class: className,
		inputClass,
		id,
		type = 'text',
		disabled,
		readonly,
		maxlength,
		'aria-describedby': describedBy,
		...rest
	}: Props = $props();

	const COPIED_MS = 1600;

	const componentId = $props.id();
	const inputId = $derived(id ?? `${componentId}-input`);
	const messageId = `${componentId}-message`;
	const counterId = `${componentId}-count`;

	let input: HTMLInputElement | undefined = $state();
	let revealed = $state(false);
	let copied = $state(false);
	let copyTimer = 0;
	$effect(() => () => clearTimeout(copyTimer));

	/** Text or a snippet – not true, false, null or an empty string */
	const shows = (content: Content | boolean | undefined): content is Content =>
		content != null && typeof content !== 'boolean' && content !== '';

	const isPassword = $derived(type === 'password');
	const invalid = $derived(Boolean(error) || rest['aria-invalid'] === true || rest['aria-invalid'] === 'true');
	// error={true} marks the field invalid without leaving an empty line
	const message = $derived(shows(error) ? error : shows(hint) ? hint : null);
	const showCount = $derived(counter && typeof maxlength === 'number');
	const showClear = $derived(clearable && !disabled && !readonly && value.length > 0);
	// Without a label, the placeholder names the field for screen readers
	const fallbackName = $derived(
		label == null && !rest['aria-label'] && !rest['aria-labelledby'] && typeof rest.placeholder === 'string'
			? rest.placeholder
			: undefined
	);
	const describedByIds = $derived(
		[describedBy, message ? messageId : null, showCount ? counterId : null].filter(Boolean).join(' ') || undefined
	);

	function clear() {
		if (!input) return;
		// Empties the field the way typing would, so bind:value and oninput listeners both see it
		input.value = '';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.focus();
		onclear?.();
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			// No clipboard (an insecure page or a denied permission): select the text, so ⌘C works
			input?.select();
			return;
		}
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = window.setTimeout(() => (copied = false), COPIED_MS);
	}

	function handleKeydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		// Esc empties a clearable field, like a search field on macOS and iOS
		if (event.key === 'Escape' && showClear) {
			event.preventDefault();
			clear();
		}
		onkeydown?.(event);
	}

	// A click anywhere on the box – the prefix, the padding – puts the caret in the input
	function focusInput(event: PointerEvent) {
		const target = event.target as HTMLElement;
		if (target === input || target.closest('button')) return;
		event.preventDefault();
		input?.focus();
	}
</script>

{#snippet content(item: Content)}
	{#if typeof item === 'string'}{item}{:else}{@render item()}{/if}
{/snippet}

<div
	class={['ui-tf', className]}
	data-size={size}
	data-invalid={invalid || undefined}
	data-disabled={disabled || undefined}
	data-readonly={readonly || undefined}
>
	{#if label != null}
		<div class="ui-tf__head">
			<label class="ui-tf__label" for={inputId}>{@render content(label)}</label>
			{#if optional}<span class="ui-tf__optional">Optional</span>{/if}
		</div>
	{/if}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="ui-tf__box" onpointerdown={focusInput}>
		{#if prefix != null}
			<span class="ui-tf__affix" data-side="start">
				<!-- Long text is cut at its start – the part next to the value is the one that matters -->
				{#if typeof prefix === 'string'}<span class="ui-tf__affix-text">{prefix}</span>{:else}{@render prefix()}{/if}
			</span>
		{/if}
		<input
			{...rest}
			bind:this={input}
			bind:value
			id={inputId}
			class={['ui-tf__input', inputClass]}
			type={isPassword && revealed ? 'text' : type}
			{disabled}
			{readonly}
			{maxlength}
			aria-label={rest['aria-label'] ?? fallbackName}
			aria-invalid={invalid || undefined}
			aria-describedby={describedByIds}
			dir={rest.dir ?? 'auto'}
			data-revealed={isPassword ? String(revealed) : undefined}
			onkeydown={handleKeydown}
		/>
		{#if suffix != null}<span class="ui-tf__affix" data-side="end">{@render content(suffix)}</span>{/if}
		{#if showClear}
			<button type="button" class="ui-tf__action" aria-label="Clear" tabindex="-1" onclick={clear}>
				<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
					<path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm3.53 12.22a.75.75 0 1 1-1.06 1.06L12 13.06l-2.47 2.47a.75.75 0 0 1-1.06-1.06L10.94 12 8.47 9.53a.75.75 0 0 1 1.06-1.06L12 10.94l2.47-2.47a.75.75 0 1 1 1.06 1.06L13.06 12l2.47 2.47Z" />
				</svg>
			</button>
		{/if}
		{#if isPassword && !disabled}
			<button
				type="button"
				class="ui-tf__action"
				aria-label={revealed ? 'Hide password' : 'Show password'}
				aria-pressed={revealed}
				onclick={() => (revealed = !revealed)}
			>
				{#key revealed}
					<span class="ui-tf__swap">
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							{#if revealed}
								<path d="M19.439 15.439c.996-.91 1.719-1.82 2.105-2.36.304-.426.456-.64.456-.955 0-.316-.152-.529-.456-.955C20.178 9.253 16.689 5.124 12 5.124c-.908 0-1.77.155-2.582.418M6.74 6.869c-2.09 1.267-3.6 3.083-4.284 4.04-.304.426-.456.64-.456.955 0 .316.152.529.456.955C3.822 14.735 7.311 18.864 12 18.864c2.008 0 3.786-.757 5.26-1.746" />
								<path d="M9.858 10a2.98 2.98 0 0 0-.858 2.124 3 3 0 0 0 5.124 2.12M3 3l18 18" />
							{:else}
								<path d="M21.544 11.045C21.848 11.471 22 11.685 22 12c0 .316-.152.529-.456.955C20.178 14.871 16.689 19 12 19c-4.69 0-8.178-4.13-9.544-6.045C2.152 12.529 2 12.315 2 12c0-.316.152-.529.456-.955C3.822 9.129 7.311 5 12 5c4.69 0 8.178 4.13 9.544 6.045Z" />
								<path d="M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" />
							{/if}
						</svg>
					</span>
				{/key}
			</button>
		{/if}
		{#if copyable}
			<button
				type="button"
				class="ui-tf__action"
				data-copied={copied || undefined}
				aria-label={copied ? 'Copied' : 'Copy'}
				onclick={copy}
				disabled={disabled || !value}
			>
				{#key copied}
					<span class="ui-tf__swap">
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width={copied ? 1.8 : 1.6} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							{#if copied}
								<path class="ui-tf__check" d="M5 12.5 9.5 17 19 7" pathLength="1" />
							{:else}
								<path d="M9 15c0-2.828 0-4.243.879-5.121C10.757 9 12.172 9 15 9h1c2.828 0 4.243 0 5.121.879C22 10.757 22 12.172 22 15v1c0 2.828 0 4.243-.879 5.121C20.243 22 18.828 22 16 22h-1c-2.828 0-4.243 0-5.121-.879C9 20.243 9 18.828 9 16v-1Z" />
								<path d="M17 9c-.003-2.957-.047-4.489-.908-5.538a4 4 0 0 0-.554-.554C14.43 2 12.788 2 9.5 2c-3.287 0-4.931 0-6.038.908a4 4 0 0 0-.554.554C2 4.57 2 6.212 2 9.5c0 3.287 0 4.931.908 6.038a4 4 0 0 0 .554.554c1.05.86 2.58.906 5.538.908" />
							{/if}
						</svg>
					</span>
				{/key}
			</button>
			<span class="ui-tf__sr" role="status">{copied ? 'Copied' : ''}</span>
		{/if}
	</div>
	{#if message || showCount}
		<div class="ui-tf__foot">
			<!-- The error swaps in where the hint was, so the form below doesn't move -->
			{#key shows(error)}
				<p class="ui-tf__message" id={messageId} dir="auto" aria-live={shows(error) ? 'polite' : undefined}>
					{#if message}{@render content(message)}{/if}
				</p>
			{/key}
			{#if showCount && typeof maxlength === 'number'}
				<span class="ui-tf__count" id={counterId} data-full={value.length === maxlength || undefined} data-over={value.length > maxlength || undefined}>
					{value.length}/{maxlength}
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Colors and motion as variables – override them on .ui-tf (see Theming in the docs) */
	.ui-tf {
	  --ui-tf-ink: var(--aui-ink, #171717);
	  --ui-tf-text: #404040;
	  --ui-tf-muted: var(--aui-muted, #8f8f8f);
	  --ui-tf-faint: var(--aui-placeholder, #b5b5b5);
	  --ui-tf-surface: var(--aui-surface, #ffffff);
	  --ui-tf-line: var(--aui-border, #e6e6e8);
	  --ui-tf-edge: var(--aui-border-strong, #d4d4d8);
	  --ui-tf-edge-focus: var(--aui-border-strong, #b4b4bb);
	  --ui-tf-wash: #f4f4f5;
	  --ui-tf-readonly: #fafafa;
	  --ui-tf-danger: var(--aui-danger, #c4320a);
	  --ui-tf-danger-edge: #ff8a7a;
	  --ui-tf-danger-edge-focus: #f04438;
	  --ui-tf-danger-wash: color-mix(in srgb, var(--aui-red, #f04438) 4%, transparent);
	  --ui-tf-success: var(--aui-success, #1e8a4f);
	  --ui-tf-focus: var(--aui-focus, rgba(0, 96, 226, 0.7));
	  --ui-tf-ease: cubic-bezier(0.22, 1, 0.36, 1);

	  --h: 36px;
	  --px: 12px;
	  --fs: 13.5px;
	  --radius: var(--aui-radius, 10px);

	  display: flex;
	  flex-direction: column;
	  gap: 7px;
	  min-width: 0;
	  font-family: var(--aui-font, "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
	  font-size: 13.5px;
	  line-height: 20px;
	  color: var(--ui-tf-ink);
	  -webkit-font-smoothing: antialiased;
	}
	.ui-tf[data-size="sm"] { --h: 32px; --px: 10px; --fs: 13px; --radius: calc(var(--aui-radius, 10px) - 1px); }
	.ui-tf[data-size="lg"] { --h: 40px; --px: 14px; --fs: 14px; --radius: calc(var(--aui-radius, 10px) + 2px); }
	/* Touch screens: a comfortable tap height, and 16px text so iOS doesn't zoom in on focus */
	@media (pointer: coarse) {
	  .ui-tf { --fs: 16px; }
	  .ui-tf[data-size="sm"] { --h: 36px; }
	  .ui-tf[data-size="md"] { --h: 40px; }
	  .ui-tf[data-size="lg"] { --h: 44px; }
	}

	.ui-tf__head { display: flex; align-items: baseline; gap: 6px; min-width: 0; padding: 0 2px; }
	.ui-tf__label { min-width: 0; font-size: 13px; font-weight: 500; color: var(--ui-tf-ink); overflow-wrap: anywhere; cursor: default; }
	.ui-tf__optional { flex: none; font-size: 12px; line-height: 16px; color: var(--ui-tf-muted); }

	/* The box: white with a 1px gray edge; hover and focus only darken that edge */
	.ui-tf__box {
	  display: flex;
	  align-items: center;
	  gap: 6px;
	  box-sizing: border-box;
	  height: var(--h);
	  min-width: 0;
	  padding-block: 0;
	  padding-inline: var(--px) calc(var(--px) - 6px);
	  border-radius: var(--radius);
	  background: var(--ui-tf-surface);
	  box-shadow: 0 0 0 1px var(--ui-tf-line), 0 1px 2px rgba(0, 0, 0, 0.04);
	  cursor: text;
	  transition: box-shadow 160ms ease, background-color 160ms ease;
	}
	.ui-tf__box:not(:has(.ui-tf__action)) { padding-inline-end: var(--px); }
	.ui-tf__box:hover { box-shadow: 0 0 0 1px var(--ui-tf-edge), 0 1px 2px rgba(0, 0, 0, 0.04); }
	.ui-tf__box:focus-within { box-shadow: 0 0 0 1px var(--ui-tf-edge-focus), 0 1px 2px rgba(0, 0, 0, 0.04); }
	.ui-tf[data-invalid] .ui-tf__box { background: var(--ui-tf-danger-wash); box-shadow: 0 0 0 1px var(--ui-tf-danger-edge), 0 1px 2px rgba(0, 0, 0, 0.04); animation: ui-tf-nudge 320ms var(--ui-tf-ease); }
	.ui-tf[data-invalid] .ui-tf__box:focus-within { box-shadow: 0 0 0 1px var(--ui-tf-danger-edge-focus), 0 1px 2px rgba(0, 0, 0, 0.04); }
	.ui-tf[data-readonly] .ui-tf__box { background: var(--ui-tf-readonly); box-shadow: 0 0 0 1px var(--ui-tf-line); cursor: default; }
	.ui-tf[data-disabled] .ui-tf__box { background: var(--ui-tf-readonly); box-shadow: 0 0 0 1px var(--ui-tf-line); cursor: not-allowed; }
	.ui-tf[data-disabled] { opacity: 0.55; }

	.ui-tf__input {
	  flex: 1;
	  min-width: 0;
	  height: 100%;
	  margin: 0;
	  padding: 0;
	  border: 0;
	  outline: 0;
	  background: transparent;
	  font: inherit;
	  font-size: var(--fs);
	  color: var(--ui-tf-ink);
	  text-overflow: ellipsis;
	  -webkit-appearance: none;
	  appearance: none;
	}
	/* Next to a prefix or suffix the value keeps at least 6em – they shrink first */
	.ui-tf__box:has(> .ui-tf__affix) .ui-tf__input { flex: 1 0 6em; min-width: 6em; }
	.ui-tf__input::placeholder { color: var(--ui-tf-faint); opacity: 1; }
	.ui-tf__input:disabled { cursor: not-allowed; }
	.ui-tf__input[type="search"]::-webkit-search-cancel-button { display: none; }
	.ui-tf__input[type="number"] { -moz-appearance: textfield; appearance: textfield; font-variant-numeric: tabular-nums; }
	.ui-tf__input[type="number"]::-webkit-inner-spin-button,
	.ui-tf__input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
	/* Revealing a password: the characters come out of a short blur */
	.ui-tf__input[data-revealed] { animation: ui-tf-reveal 260ms var(--ui-tf-ease); }
	.ui-tf__input[data-revealed="false"] { animation-name: ui-tf-reveal-hide; }

	/* Prefix and suffix: quiet text or an icon inside the box */
	.ui-tf__affix {
	  display: inline-flex;
	  flex: 0 1 auto;
	  align-items: center;
	  min-width: 0;
	  max-width: 70%;
	  font-size: var(--fs);
	  color: var(--ui-tf-muted);
	  white-space: nowrap;
	  user-select: none;
	  overflow: hidden;
	  text-overflow: ellipsis;
	}
	.ui-tf__affix[data-side="start"] { margin-inline-end: -6px; }
	.ui-tf__affix[data-side="end"] { max-width: 40%; margin-inline-start: -6px; }
	/* A long prefix loses its start: "…/workspaces/" stays next to the value */
	.ui-tf__affix-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ui-tf__affix[data-side="start"]:dir(ltr) .ui-tf__affix-text { direction: rtl; text-align: left; }
	.ui-tf__affix[data-side="start"]:dir(ltr) .ui-tf__affix-text::after { content: "\200E"; }
	.ui-tf__affix[data-side]:has(> :global(svg)) { margin: 0; color: var(--ui-tf-muted); }
	.ui-tf__affix > :global(svg) { display: block; width: 16px; height: 16px; flex: none; }

	/* Clear, reveal and copy: small buttons at the end */
	.ui-tf__action {
	  display: grid;
	  place-items: center;
	  flex: none;
	  width: calc(var(--h) - 10px);
	  height: calc(var(--h) - 10px);
	  position: relative;
	  max-width: 28px;
	  max-height: 28px;
	  margin: 0;
	  padding: 0;
	  border: 0;
	  border-radius: 7px;
	  background: transparent;
	  color: var(--ui-tf-muted);
	  cursor: pointer;
	  -webkit-tap-highlight-color: transparent;
	  transition: background-color 140ms ease, color 140ms ease;
	}
	.ui-tf__action + .ui-tf__action { margin-left: -4px; }
	/* Touch screens: bigger buttons and a hit area that reaches past them */
	@media (pointer: coarse) {
	  .ui-tf__action { width: 32px; height: 32px; max-width: none; max-height: none; }
	  .ui-tf__action::before { content: ""; position: absolute; inset: -4px; }
	}
	.ui-tf__action:hover:not(:disabled) { background: var(--ui-tf-wash); color: var(--ui-tf-ink); }
	.ui-tf__action:focus-visible { outline: 2px solid var(--ui-tf-focus); outline-offset: -2px; }
	.ui-tf__action:disabled { opacity: 0.4; cursor: default; }
	.ui-tf__action[data-copied] { color: var(--ui-tf-success); }
	.ui-tf__action svg { display: block; }
	.ui-tf__swap { display: grid; animation: ui-tf-swap 280ms var(--ui-tf-ease); }
	.ui-tf__check { stroke-dasharray: 1; animation: ui-tf-draw 320ms 60ms var(--ui-tf-ease) both; }

	/* Under the field: the hint, or the error in its place, and the count */
	.ui-tf__foot { display: flex; align-items: flex-start; gap: 12px; min-width: 0; padding: 0 2px; }
	.ui-tf__message {
	  flex: 1;
	  min-width: 0;
	  margin: 0;
	  font-size: 12.5px;
	  line-height: 17px;
	  color: var(--ui-tf-muted);
	  overflow-wrap: anywhere;
	  animation: ui-tf-message 260ms var(--ui-tf-ease);
	}
	.ui-tf[data-invalid] .ui-tf__message { color: var(--ui-tf-danger); }
	.ui-tf__count { flex: none; margin-left: auto; font-size: 12px; line-height: 17px; font-variant-numeric: tabular-nums; color: var(--ui-tf-faint); transition: color 140ms ease; }
	.ui-tf__count[data-over] { color: var(--ui-tf-danger); }
	.ui-tf__sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
	.ui-tf__count[data-full] { color: var(--ui-tf-text); }

	@keyframes ui-tf-nudge {
	  30% { transform: translateX(-3px); }
	  65% { transform: translateX(2px); }
	}
	@keyframes ui-tf-message {
	  from { opacity: 0; transform: translateY(-3px); filter: blur(2px); }
	}
	@keyframes ui-tf-reveal {
	  from { filter: blur(4px); opacity: 0.4; }
	}
	@keyframes ui-tf-reveal-hide {
	  from { filter: blur(3px); opacity: 0.5; }
	}
	@keyframes ui-tf-swap {
	  from { opacity: 0; transform: scale(0.6); filter: blur(2px); }
	}
	@keyframes ui-tf-draw {
	  from { stroke-dashoffset: 1; }
	  to { stroke-dashoffset: 0; }
	}

	@media (prefers-reduced-motion: reduce) {
	  .ui-tf *, .ui-tf[data-invalid] .ui-tf__box { animation-duration: 1ms !important; }
	  .ui-tf__box { transition-duration: 1ms; }
	}

	/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
	:global(:where(.dark, [data-theme="dark"])) .ui-tf {
	  --ui-tf-ink: var(--aui-ink, #ededed);
	  --ui-tf-text: #c8c8cc;
	  --ui-tf-muted: var(--aui-muted, #8b8b92);
	  --ui-tf-faint: var(--aui-placeholder, #5c5c63);
	  --ui-tf-surface: var(--aui-surface, #19191b);
	  --ui-tf-line: var(--aui-border, #2a2a2e);
	  --ui-tf-edge: var(--aui-border-strong, #3a3a40);
	  --ui-tf-edge-focus: var(--aui-border-strong, #4e4e55);
	  --ui-tf-wash: #26262a;
	  --ui-tf-readonly: #151517;
	  --ui-tf-danger: var(--aui-danger, #ff8a7a);
	  --ui-tf-danger-edge: color-mix(in srgb, var(--aui-red, #ff6b5f) 45%, transparent);
	  --ui-tf-danger-edge-focus: rgba(255, 99, 105, 0.75);
	  --ui-tf-danger-wash: color-mix(in srgb, var(--aui-red, #ff6b5f) 6%, transparent);
	  --ui-tf-success: var(--aui-success, #7dcf9f);
	  --ui-tf-focus: var(--aui-focus, rgba(77, 141, 255, 0.8));
	}
</style>
