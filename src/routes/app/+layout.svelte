<script lang="ts">
	import Header from '$lib/components/layout/Header.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';

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

	function handleMenuClick() {
		goto('/app/profile');
	}

	function handleNotificationClick() {
		// TODO: 알림 페이지로 이동
	}
</script>

<div class="app-layout">
	<Header onMenuClick={handleMenuClick} onNotificationClick={handleNotificationClick} />
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
