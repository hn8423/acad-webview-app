<script lang="ts">
	import { page } from '$app/state';
	import { academyStore } from '$lib/stores/academy.svelte';

	const NAV_ICON_MAP: Record<string, string> = {
		home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		feedback:
			'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
		reservation:
			'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		ensemble:
			'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
	};

	const NAV_ROUTE_MAP: Record<string, string> = {
		1: '/app',
		2: '/app/feedback',
		3: '/app/reservation',
		4: '/app/ensemble'
	};

	let navItems = $derived(academyStore.getEnabledNavItems('USER'));

	function getNavPath(position: number): string {
		return NAV_ROUTE_MAP[position] ?? '/app';
	}

	function getIconPath(icon: string): string {
		return NAV_ICON_MAP[icon] ?? NAV_ICON_MAP['home'];
	}

	function isActive(path: string): boolean {
		const pathname = page.url.pathname as string;
		if (path === '/app') {
			return pathname === '/app';
		}
		return pathname.startsWith(path);
	}
</script>

<nav class="bottom-nav">
	{#each navItems as item}
		{@const path = getNavPath(item.nav_position)}
		<a href={path} class="bottom-nav__item" class:bottom-nav__item--active={isActive(path)}>
			<svg
				class="bottom-nav__icon"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d={getIconPath(item.nav_icon)} />
			</svg>
			<span class="bottom-nav__label">{item.nav_label}</span>
			{#if isActive(path)}
				<span class="bottom-nav__indicator"></span>
			{/if}
		</a>
	{/each}
</nav>

<style lang="scss">
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: var(--bottom-nav-height);
		background-color: var(--color-white);
		box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.04);
		display: flex;
		align-items: center;
		justify-content: space-around;
		z-index: var(--z-bottom-nav);
		padding-bottom: env(safe-area-inset-bottom, 0);

		&__item {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 2px;
			flex: 1;
			height: 100%;
			color: var(--color-text-muted);
			text-decoration: none;
			position: relative;
			transition: color var(--transition-fast);

			&--active {
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);
			}

			&:hover {
				text-decoration: none;
				color: var(--color-primary);
			}
		}

		&__icon {
			width: 24px;
			height: 24px;
		}

		&__label {
			font-size: 10px;
			font-weight: var(--font-weight-medium);
		}

		&__indicator {
			position: absolute;
			bottom: 0;
			width: 20px;
			height: 2px;
			background: var(--color-primary-gradient);
			border-radius: var(--radius-full);
		}
	}
</style>
