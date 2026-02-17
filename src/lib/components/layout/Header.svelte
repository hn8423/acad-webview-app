<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';

	interface Props {
		onMenuClick?: () => void;
		onNotificationClick?: () => void;
		onTitleClick?: () => void;
		unreadCount?: number;
	}

	let { onMenuClick, onNotificationClick, onTitleClick, unreadCount = 0 }: Props = $props();
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
		{#if onTitleClick}
			<button class="header__title-btn" onclick={onTitleClick}>
				<h1 class="header__title">{academyStore.academy?.academy_name ?? ''}</h1>
			</button>
		{:else}
			<h1 class="header__title">{academyStore.academy?.academy_name ?? ''}</h1>
		{/if}
	</div>

	<div class="header__right">
		{#if onNotificationClick}
			<button
				class="header__icon-btn header__notification-btn"
				onclick={onNotificationClick}
				aria-label="알림"
			>
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
				{#if unreadCount > 0}
					<span class="header__badge">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				{/if}
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

	.header__title-btn {
		display: flex;
		align-items: center;
		cursor: pointer;
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

	.header__notification-btn {
		position: relative;
	}

	.header__badge {
		position: absolute;
		top: 4px;
		right: 4px;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: var(--radius-full);
		background-color: var(--color-danger);
		color: var(--color-white);
		font-size: 10px;
		font-weight: var(--font-weight-bold);
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		pointer-events: none;
	}
</style>
