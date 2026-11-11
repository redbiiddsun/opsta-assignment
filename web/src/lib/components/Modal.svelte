<!--
  A modal on the native <dialog>: the browser traps focus, closes on Esc and returns focus to the opener.
  `open` is bindable so Esc, the × and a backdrop click all keep the parent in sync.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		children: Snippet;
	};

	let { open = $bindable(), title, description, children }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const titleId = $props.id();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	// Closes only when the press both starts and ends on the backdrop (the dialog element itself, outside the panel),
	// so a text selection dragged out of a field doesn't dismiss the form
	let pressedBackdrop = false;

	function closeOnBackdrop(event: MouseEvent) {
		if (pressedBackdrop && event.target === dialog) open = false;
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	class="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
	onclose={() => (open = false)}
	onpointerdown={(event) => (pressedBackdrop = event.target === dialog)}
	onclick={closeOnBackdrop}
>
	{#if open}
		<div class="p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 id={titleId} class="text-lg font-semibold tracking-tight">{title}</h2>
					{#if description}<p class="mt-1 text-sm text-muted">{description}</p>{/if}
				</div>
				<button
					type="button"
					class="-m-1 rounded-lg p-1 text-muted hover:bg-ink/5 hover:text-ink"
					aria-label="Close"
					onclick={() => (open = false)}
				>
					<Icon name="close" />
				</button>
			</div>
			<div class="mt-5">{@render children()}</div>
		</div>
	{/if}
</dialog>
