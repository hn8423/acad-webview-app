<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';

	interface Props {
		onMenuClick?: () => void;
		onNotificationClick?: () => void;
	}

	let { onMenuClick, onNotificationClick }: Props = $props();
</script>

<header class="header">
	<div class="header__left">
		{#if onMenuClick}
			<button class="header__icon-btn" onclick={onMenuClick} aria-label="메뉴">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M3 12h18M3 6h18M3 18h18" />
				</svg>
			</button>
		{/if}
		<h1 class="header__title">{academyStore.academy?.academy_name ?? ''}</h1>
	</div>

	<div class="header__right">
		{#if onNotificationClick}
			<button class="header__icon-btn" onclick={onNotificationClick} aria-label="알림">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
					<path d="M13.73 21a2 2 0 0 1-3.46 0" />
				</svg>
			</button>
		{/if}
	</div>
</header>

<style lang="scss">
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--header-height);
		background-color: var(--color-white);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-md);
		z-index: var(--z-header);
	}

	.header__left {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.header__right {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.header__title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		letter-spacing: var(--letter-spacing-tight);
	}

	.header__icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		color: var(--color-text);
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-bg);
		}
	}
</style>
