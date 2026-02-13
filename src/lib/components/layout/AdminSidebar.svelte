<script lang="ts">
	import { page } from '$app/state';
	import { academyStore } from '$lib/stores/academy.svelte';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
	}

	let { isOpen = $bindable(false), onclose }: Props = $props();

	const MENU_ROUTE_MAP: Record<string, string> = {
		1: '/admin/notices',
		2: '/admin/instructors',
		3: '/admin/students',
		4: '/admin/feedback',
		5: '/admin/ensembles'
	};

	const MENU_ICON_MAP: Record<string, string> = {
		1: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
		2: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
		3: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		4: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		5: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
	};

	let navItems = $derived(academyStore.getEnabledNavItems('ADMIN'));

	function getMenuPath(position: number): string {
		return MENU_ROUTE_MAP[position] ?? '/admin';
	}

	function getIconPath(position: number): string {
		return MENU_ICON_MAP[position] ?? MENU_ICON_MAP[1];
	}

	function isActive(path: string): boolean {
		return (page.url.pathname as string).startsWith(path);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
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
			{@const path = getMenuPath(item.nav_position)}
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
					<path d={getIconPath(item.nav_position)} />
				</svg>
				<span>{item.nav_label}</span>
			</a>
		{/each}
	</nav>
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
