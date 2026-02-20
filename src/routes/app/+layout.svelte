<script lang="ts">
	import Header from '$lib/components/layout/Header.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';

	let { children } = $props();

	$effect(() => {
		if (!authStore.isInitialized || !academyStore.isInitialized) return;
		if (!authStore.isAuthenticated) {
			goto('/auth/login', { replaceState: true });
			return;
		}
		if (!academyStore.academyId) {
			goto('/auth/select-academy', { replaceState: true });
		}
	});

	$effect(() => {
		if (academyStore.academyId) {
			notificationStore.startPolling();
		}
		return () => notificationStore.stopPolling();
	});

	function handleMenuClick() {
		goto('/app/profile');
	}

	function handleNotificationClick() {
		goto('/app/notifications');
	}
</script>

<div class="app-layout">
	<Header
		onMenuClick={handleMenuClick}
		onNotificationClick={handleNotificationClick}
		unreadCount={notificationStore.unreadCount}
	/>
	<main class="app-layout__content">
		{@render children()}
	</main>
	<BottomNav />
</div>

<style lang="scss">
	.app-layout {
		min-height: 100dvh;

		&__content {
			padding-top: var(--header-height);
			padding-bottom: var(--bottom-nav-height);
			min-height: 100dvh;
			background-color: var(--color-bg);
		}
	}
</style>
