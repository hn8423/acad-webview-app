<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import {
		getAccessibleFeatures,
		getFeatureRoute,
		getFeatureIcon,
		isIconUrl
	} from '$lib/config/admin-features';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
	}

	let { isOpen = $bindable(false), onclose }: Props = $props();

	let navItems = $derived(
		academyStore
			.getEnabledNavItems('ADMIN')
			.filter((item) => getAccessibleFeatures(item, academyStore.memberRole).length > 0)
	);

	function isActive(path: string): boolean {
		return (page.url.pathname as string).startsWith(path);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	async function handleLogout() {
		await authStore.logout();
		academyStore.clear();
		onclose();
		goto('/auth/login', { replaceState: true });
	}
</script>

{#if isOpen}
	<div class="sidebar-backdrop" onclick={handleBackdropClick} role="presentation"></div>
{/if}

<aside class="sidebar" class:sidebar--open={isOpen}>
	<div class="sidebar__header">
		<h2 class="sidebar__title">{academyStore.academy?.academy_name ?? '관리자'}</h2>
		<button class="sidebar__close" onclick={onclose} aria-label="닫기">
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	</div>

	<nav class="sidebar__nav">
		<a
			href="/admin"
			class="sidebar__item"
			class:sidebar__item--active={(page.url.pathname as string) === '/admin'}
			onclick={onclose}
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
				/>
			</svg>
			<span>대시보드</span>
		</a>

		{#each navItems as item (item.nav_id)}
			{@const accessible = getAccessibleFeatures(item, academyStore.memberRole)}
			{#if accessible.length === 1}
				{@const feature = accessible[0]}
				{@const path = getFeatureRoute(feature.feature_key) ?? '/admin'}
				<a
					href={path}
					class="sidebar__item"
					class:sidebar__item--active={isActive(path)}
					onclick={onclose}
				>
					{#if item.nav_icon && isIconUrl(item.nav_icon)}
						<span
							class="sidebar__mask-icon"
							style:--icon-url="url('{item.nav_icon}')"
						></span>
					{:else}
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d={getFeatureIcon(feature.feature_key)} />
						</svg>
					{/if}
					<span>{item.nav_label}</span>
				</a>
			{:else if accessible.length > 1}
				<div class="sidebar__section-label">{item.nav_label}</div>
				{#each accessible as feature (feature.feature_id)}
					{@const path = getFeatureRoute(feature.feature_key) ?? '/admin'}
					<a
						href={path}
						class="sidebar__sub-item"
						class:sidebar__sub-item--active={isActive(path)}
						onclick={onclose}
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d={getFeatureIcon(feature.feature_key)} />
						</svg>
						<span>{feature.feature_name}</span>
					</a>
				{/each}
			{/if}
		{/each}
	</nav>

	<div class="sidebar__footer">
		<button type="button" class="sidebar__logout" onclick={handleLogout}>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
				<polyline points="16 17 21 12 16 7" />
				<line x1="21" y1="12" x2="9" y2="12" />
			</svg>
			<span>로그아웃</span>
		</button>
	</div>
</aside>

<style lang="scss">
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		background-color: var(--color-backdrop);
		backdrop-filter: blur(4px);
		z-index: calc(var(--z-sidebar) - 1);
	}

	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: var(--sidebar-width);
		background-color: var(--color-white);
		z-index: var(--z-sidebar);
		transform: translateX(-100%);
		transition: transform var(--transition-spring);
		display: flex;
		flex-direction: column;

		&--open {
			transform: translateX(0);
		}

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: var(--space-lg) var(--space-lg);
		}

		&__title {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
		}

		&__close {
			width: 44px;
			height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--radius-full);
			color: var(--color-text-secondary);
			transition: background-color var(--transition-fast);

			&:hover {
				background-color: var(--color-bg);
				color: var(--color-text);
			}
		}

		&__nav {
			flex: 1;
			padding: var(--space-sm) var(--space-md);
			overflow-y: auto;
		}

		&__footer {
			padding: var(--space-md) var(--space-md);
			border-top: 1px solid var(--color-border);
		}

		&__logout {
			display: flex;
			align-items: center;
			gap: var(--space-md);
			width: 100%;
			padding: 12px var(--space-lg);
			border-radius: var(--radius-md);
			background: none;
			border: none;
			cursor: pointer;
			font-size: var(--font-size-base);
			color: var(--color-danger);
			transition:
				background-color var(--transition-fast),
				opacity var(--transition-fast);

			&:hover {
				background-color: var(--color-bg);
			}

			&:active {
				opacity: 0.6;
			}
		}

		&__item {
			display: flex;
			align-items: center;
			gap: var(--space-md);
			padding: 12px var(--space-lg);
			border-radius: var(--radius-md);
			color: var(--color-text);
			text-decoration: none;
			font-size: var(--font-size-base);
			transition:
				background-color var(--transition-fast),
				color var(--transition-fast);

			&:hover {
				background-color: var(--color-bg);
				text-decoration: none;
			}

			&--active {
				background-color: var(--color-primary-bg);
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);
				border-left: 3px solid var(--color-primary);
			}
		}

		&__section-label {
			padding: var(--space-md) var(--space-lg) var(--space-xs);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-muted);
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		&__sub-item {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			padding: 10px var(--space-lg) 10px var(--space-2xl);
			border-radius: var(--radius-md);
			color: var(--color-text-secondary);
			text-decoration: none;
			font-size: var(--font-size-sm);
			transition:
				background-color var(--transition-fast),
				color var(--transition-fast);

			&:hover {
				background-color: var(--color-bg);
				text-decoration: none;
			}

			&--active {
				background-color: var(--color-primary-bg);
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);
			}
		}

		&__mask-icon {
			display: inline-block;
			width: 20px;
			height: 20px;
			background-color: currentColor;
			-webkit-mask-image: var(--icon-url);
			mask-image: var(--icon-url);
			-webkit-mask-size: contain;
			mask-size: contain;
			-webkit-mask-repeat: no-repeat;
			mask-repeat: no-repeat;
			-webkit-mask-position: center;
			mask-position: center;
		}
	}
</style>
