<!-- Copies text and confirms with a check for a moment. Falls back to an error label when the clipboard is blocked. -->
<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Icon from '#lib/components/Icon.svelte';

	type Props = {
		text: string;
		/** What is being copied, for screen readers: "Copy short link" */
		label?: string;
		/** Shows "Copy" next to the icon */
		showText?: boolean;
		variant?: 'secondary' | 'ghost';
		size?: 'sm' | 'md';
	};

	let { text, label = 'Copy', showText = false, variant = 'ghost', size = 'sm' }: Props = $props();

	const CONFIRM_MS = 1600;

	let copyState = $state<'idle' | 'copied' | 'failed'>('idle');
	let resetTimer = 0;
	$effect(() => () => clearTimeout(resetTimer));

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
		clearTimeout(resetTimer);
		resetTimer = window.setTimeout(() => (copyState = 'idle'), CONFIRM_MS);
	}

	const caption = $derived(copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy');
</script>

<Button {variant} {size} onclick={copy} aria-label={showText ? undefined : copyState === 'idle' ? label : caption} title={label}>
	{#snippet icon()}<Icon name={copyState === 'copied' ? 'check' : 'copy'} />{/snippet}
	{#if showText}{caption}{/if}
</Button>
<span class="sr-only" role="status">{copyState === 'idle' ? '' : caption}</span>
