<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import {
		getAccessibleFeatures,
		getFeatureRoute,
		getFeatureIcon
	} from '$lib/config/admin-features';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	let navId = $derived(Number(page.params.navId));

	let navItem = $derived(
		academyStore.getEnabledNavItems('ADMIN').find((item) => item.nav_id === navId) ?? null
	);

	let features = $derived(
		navItem ? getAccessibleFeatures(navItem, academyStore.memberRole) : []
	);

	$effect(() => {
		if (academyStore.isInitialized && !navItem) {
			goto('/admin', { replaceState: true });
		}
	});
</script>

<BackHeader title={navItem?.nav_label ?? '메뉴'} onback={() => goto('/admin')} />

<div class="nav-group">
	{#if features.length === 0}
		<p class="nav-group__empty">사용 가능한 기능이 없습니다.</p>
	{:else}
		<div class="nav-group__grid">
			{#each features as feature (feature.feature_id)}
				{@const route = getFeatureRoute(feature.feature_key)}
				{#if route}
					<Card onclick={() => goto(route)}>
						<div class="feature-card">
							<div class="feature-card__icon">
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
									<path d={getFeatureIcon(feature.feature_key)} />
								</svg>
							</div>
							<span class="feature-card__label">{feature.feature_name}</span>
						</div>
					</Card>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.nav-group {
		padding-top: var(--space-md);

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-3xl) var(--space-md);
			font-size: var(--font-size-base);
		}

		&__grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-md);
		}
	}

	.feature-card {
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

		&__label {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
			text-align: center;
		}
	}
</style>
