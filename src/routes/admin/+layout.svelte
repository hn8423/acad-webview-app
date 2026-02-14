<script lang="ts">
	import Header from '$lib/components/layout/Header.svelte';
	import AdminSidebar from '$lib/components/layout/AdminSidebar.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { isRouteAllowed } from '$lib/config/admin-permissions';

	let { children } = $props();
	let sidebarOpen = $state(false);

	$effect(() => {
		if (!authStore.isInitialized || !academyStore.isInitialized) return;
		if (!authStore.isAuthenticated) {
			goto('/auth/login', { replaceState: true });
			return;
		}
		if (!academyStore.academyId) {
			goto('/auth/select-academy', { replaceState: true });
			return;
		}
		if (!academyStore.memberRole || academyStore.memberRole === 'STUDENT') {
			goto('/auth/select-academy', { replaceState: true });
			return;
		}
	});

	$effect(() => {
		if (!authStore.isAuthenticated) return;
		const pathname = page.url.pathname;
		if (pathname === '/admin' || pathname === '/admin/') return;
		if (!isRouteAllowed(pathname, academyStore.memberRole)) {
			goto('/admin', { replaceState: true });
		}
	});

	function handleMenuClick() {
		sidebarOpen = true;
	}

	function handleSidebarClose() {
		sidebarOpen = false;
	}
</script>

<div class="admin-layout">
	<Header onMenuClick={handleMenuClick} onTitleClick={() => goto('/admin')} />
	<AdminSidebar bind:isOpen={sidebarOpen} onclose={handleSidebarClose} />
	<main class="admin-layout__content">
		{@render children()}
	</main>
</div>

<style lang="scss">
	.admin-layout {
		min-height: 100dvh;
		background-color: var(--color-bg);

		&__content {
			padding-top: var(--header-height);
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
			background-color: var(--color-bg);
		}
	}
</style>
