<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { isRouteAllowed } from '$lib/config/admin-permissions';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
	}

	let { isOpen = $bindable(false), onclose }: Props = $props();

	const MENU_ROUTE_MAP: Record<number, string> = {
		16: '/admin/notices',
		17: '/admin/instructors',
		18: '/admin/students',
		19: '/admin/feedback',
		20: '/admin/reservations'
	};

	const MENU_ICON_MAP: Record<number, string> = {
		16: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
		17: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
		18: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		19: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		20: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
	};

	let navItems = $derived(
		academyStore
			.getEnabledNavItems('ADMIN')
			.filter((item) => {
				const route = MENU_ROUTE_MAP[item.nav_id];
				if (!route) return false;
				return isRouteAllowed(route, academyStore.memberRole);
			})
	);

	function getMenuPath(navId: number): string {
		return MENU_ROUTE_MAP[navId] ?? '/admin';
	}

	function getIconPath(navId: number): string {
		return MENU_ICON_MAP[navId] ?? MENU_ICON_MAP[16];
	}

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

		{#each navItems as item}
			{@const path = getMenuPath(item.nav_id)}
			<a
				href={path}
				class="sidebar__item"
				class:sidebar__item--active={isActive(path)}
				onclick={onclose}
			>
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
					<path d={getIconPath(item.nav_id)} />
				</svg>
				<span>{item.nav_label}</span>
			</a>
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
		background-color: rgba(0, 0, 0, 0.4);
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
	}
</style>
