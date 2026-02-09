<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		if (!authStore.isAuthenticated) {
			goto('/auth/login', { replaceState: true });
			return;
		}
		if (!academyStore.academyId) {
			goto('/auth/select-academy', { replaceState: true });
			return;
		}
		goto('/app', { replaceState: true });
	});
</script>

<div class="loading-screen">
	<p>로딩 중...</p>
</div>

<style lang="scss">
	.loading-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		color: var(--color-text-secondary);
	}
</style>
