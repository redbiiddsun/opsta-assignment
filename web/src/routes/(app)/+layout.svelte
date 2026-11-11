<!--
  The signed-in shell: a left sidebar on desktop, a top bar with a slide-out menu on phones.
  The sidebar holds what people reach for most – "New link" and their links – and who is signed in.
-->
<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import Button from '#lib/components/ui/Button.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import CreateLinkDialog from '#lib/components/CreateLinkDialog.svelte';
	import { auth } from '#lib/auth.svelte.ts';
	import { createLinkDialog } from '#lib/create-link-dialog.svelte.ts';

	let { children } = $props();

	type NavItem = { label: string; href: string; icon: IconName; matches: string[] };

	// A link's detail page still belongs to "Links", so the item stays highlighted there
	const NAV_ITEMS: NavItem[] = [
		{ label: 'Links', href: resolve('/(app)/dashboard'), icon: 'link', matches: ['/(app)/dashboard', '/(app)/links/[id]'] }
	];

	let menuOpen = $state(false);
	let menu: HTMLDialogElement | undefined = $state();
	afterNavigate(() => (menuOpen = false));

	$effect(() => {
		if (!menu) return;
		if (menuOpen && !menu.open) menu.showModal();
		if (!menuOpen && menu.open) menu.close();
	});

	// Closes only when the press both starts and ends on the dimmed backdrop (the dialog element itself)
	let pressedBackdrop = false;

	function closeOnBackdrop(event: MouseEvent) {
		if (pressedBackdrop && event.target === menu) menuOpen = false;
	}

	const isCurrent = (item: NavItem) => item.matches.includes(page.route.id ?? '');

	function openCreateLink() {
		menuOpen = false;
		createLinkDialog.open = true;
	}

	async function logout() {
		auth.logout();
		await goto(resolve('/(auth)/login'));
	}
</script>

{#snippet sidebar()}
	<div class="flex h-full flex-col gap-6 p-4">
		<a href={resolve('/(app)/dashboard')} class="flex items-center gap-2.5 px-2 pt-1">
			<span class="grid size-8 place-items-center rounded-lg bg-primary text-surface"><Icon name="link" size={16} /></span>
			<span class="font-semibold tracking-tight">URL Shortener</span>
		</a>

		<Button onclick={openCreateLink} class="w-full">
			{#snippet icon()}<Icon name="plus" />{/snippet}
			New link
		</Button>

		<nav aria-label="Main">
			<ul class="flex flex-col gap-1">
				{#each NAV_ITEMS as item (item.href)}
					<li>
						<a
							href={item.href}
							aria-current={isCurrent(item) ? 'page' : undefined}
							class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink aria-[current=page]:bg-ink/[0.07] aria-[current=page]:text-ink"
						>
							<Icon name={item.icon} />
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="mt-auto border-t border-line pt-4">
			<p class="truncate px-2 text-xs text-muted">Signed in as</p>
			<p class="truncate px-2 text-sm font-medium" title={auth.session?.email}>{auth.session?.email}</p>
			<button
				type="button"
				onclick={logout}
				class="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-ink/5 hover:text-ink"
			>
				<Icon name="logout" />
				Sign out
			</button>
		</div>
	</div>
{/snippet}

<!-- Loading feedback while a page fetches its data -->
{#if navigating.to}
	<div class="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary" role="progressbar" aria-label="Loading"></div>
{/if}

<div class="min-h-dvh md:pl-64">
	<!-- Desktop: fixed sidebar -->
	<aside class="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface md:block">
		{@render sidebar()}
	</aside>

	<!-- Phone: top bar + slide-out menu -->
	<header class="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
		<button
			type="button"
			class="-ml-1 rounded-lg p-1.5 hover:bg-ink/5"
			aria-label="Open menu"
			aria-expanded={menuOpen}
			aria-controls="mobile-menu"
			onclick={() => (menuOpen = true)}
		>
			<Icon name="menu" size={20} />
		</button>
		<span class="font-semibold tracking-tight">URL Shortener</span>
		<button type="button" class="-mr-1 rounded-lg p-1.5 hover:bg-ink/5" aria-label="New link" onclick={openCreateLink}>
			<Icon name="plus" size={20} />
		</button>
	</header>

	<!-- A native modal dialog, like Modal.svelte: the browser traps focus, closes on Esc and returns focus -->
	<dialog
		bind:this={menu}
		id="mobile-menu"
		aria-label="Menu"
		class="m-0 h-dvh max-h-none w-72 max-w-[85%] border-0 bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40 md:hidden"
		onclose={() => (menuOpen = false)}
		onpointerdown={(event) => (pressedBackdrop = event.target === menu)}
		onclick={closeOnBackdrop}
	>
		<div class="relative h-full">
			<button
				type="button"
				class="absolute top-4 right-3 z-10 rounded-lg p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
				aria-label="Close menu"
				onclick={() => (menuOpen = false)}
			>
				<Icon name="close" size={20} />
			</button>
			{@render sidebar()}
		</div>
	</dialog>

	<main class="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
		{@render children()}
	</main>
</div>

<CreateLinkDialog />

