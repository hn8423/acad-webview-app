<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import {
		getAccessibleFeatures,
		getFeatureIcon,
		getSingleFeatureRoute,
		isIconUrl
	} from '$lib/config/admin-features';
	import type { NavItem } from '$lib/types/academy';
	import Card from '$lib/components/ui/Card.svelte';
	import { goto } from '$app/navigation';

	let navItems = $derived(
		academyStore
			.getEnabledNavItems('ADMIN')
			.filter((item) => getAccessibleFeatures(item, academyStore.memberRole).length > 0)
	);

	function handleCardClick(navItem: NavItem) {
		const singleRoute = getSingleFeatureRoute(navItem, academyStore.memberRole);
		if (singleRoute) {
			goto(singleRoute);
		} else {
			goto(`/admin/nav/${navItem.nav_id}`);
		}
	}

	function getCardIcon(navItem: NavItem): string {
		const features = getAccessibleFeatures(navItem, academyStore.memberRole);
		if (features.length === 0) return '';
		return getFeatureIcon(features[0].feature_key);
	}
</script>

<div class="admin-dashboard">
	<h1 class="admin-dashboard__title">대시보드</h1>

	<div class="admin-dashboard__grid">
		{#each navItems as navItem (navItem.nav_id)}
			<Card onclick={() => handleCardClick(navItem)}>
				<div class="dashboard-card">
					<div class="dashboard-card__icon">
						{#if navItem.nav_icon && isIconUrl(navItem.nav_icon)}
							<span
								class="dashboard-card__mask-icon"
								style:--icon-url="url('{navItem.nav_icon}')"
							></span>
						{:else}
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--color-primary)"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d={getCardIcon(navItem)} />
							</svg>
						{/if}
					</div>
					<span class="dashboard-card__label">{navItem.nav_label}</span>
				</div>
			</Card>
		{/each}
	</div>
</div>

<style lang="scss">
	.admin-dashboard {
		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			margin-bottom: var(--space-lg);
			color: var(--color-text);
		}

		&__grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-md);
		}
	}

	.dashboard-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-lg) var(--space-md);
		transition: transform var(--transition-fast);

		&:active {
			transform: scale(0.97);
		}

		&__icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 48px;
			height: 48px;
			background: var(--color-primary-bg);
			border-radius: var(--radius-full);
		}

		&__mask-icon {
			display: inline-block;
			width: 24px;
			height: 24px;
			background-color: var(--color-primary);
			-webkit-mask-image: var(--icon-url);
			mask-image: var(--icon-url);
			-webkit-mask-size: contain;
			mask-size: contain;
			-webkit-mask-repeat: no-repeat;
			mask-repeat: no-repeat;
			-webkit-mask-position: center;
			mask-position: center;
		}

		&__label {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
			text-align: center;
		}
	}
</style>
