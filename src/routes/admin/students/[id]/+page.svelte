<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMemberDetail } from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatPhone, formatDate } from '$lib/utils/format';
	import type { MemberDetail } from '$lib/types/member';
	import { onMount } from 'svelte';

	let member = $state<MemberDetail | null>(null);
	let loading = $state(true);

	onMount(async () => {
		const academyId = academyStore.academyId;
		const memberId = Number(page.params.id);
		if (!academyId || !memberId) return;

		try {
			const res = await getMemberDetail(academyId, memberId);
			if (res.status && res.data) {
				member = res.data;
			}
		} catch {
			// handle error
		} finally {
			loading = false;
		}
	});
</script>

<div class="student-detail">
	<BackHeader title="수강생 상세" onback={() => goto('/admin/students')} />

	<div class="student-detail__content">
		{#if loading}
			<div class="student-detail__loading">
				<Spinner />
			</div>
		{:else if member}
			<div class="info-section">
				<h2 class="info-section__name">{member.user_name}</h2>
				<p class="info-section__phone">{formatPhone(member.user_phone)}</p>
				<p class="info-section__date">가입일: {formatDate(member.joined_at)}</p>
			</div>

			<div class="student-detail__menu">
				<div class="menu-list">
					{#if academyStore.isAdmin}
						<div
							class="menu-item"
							role="button"
							tabindex="0"
							onclick={() => goto(`/admin/students/${page.params.id}/passes`)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									goto(`/admin/students/${page.params.id}/passes`);
								}
							}}
						>
							<span class="menu-item__label">수강권 관리</span>
							<div class="menu-item__right">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M9 18l6-6-6-6" />
								</svg>
							</div>
						</div>
						<div class="menu-list__divider"></div>
						<div
							class="menu-item"
							role="button"
							tabindex="0"
							onclick={() => goto(`/admin/students/${page.params.id}/drinks`)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									goto(`/admin/students/${page.params.id}/drinks`);
								}
							}}
						>
							<span class="menu-item__label">음료권 관리</span>
							<div class="menu-item__right">
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M9 18l6-6-6-6" />
								</svg>
							</div>
						</div>
						<div class="menu-list__divider"></div>
					{/if}
					<div
						class="menu-item"
						role="button"
						tabindex="0"
						onclick={() => goto(`/admin/students/${page.params.id}/feedback`)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(`/admin/students/${page.params.id}/feedback`);
							}
						}}
					>
						<span class="menu-item__label">피드백</span>
						<div class="menu-item__right">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M9 18l6-6-6-6" />
							</svg>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<p class="student-detail__empty">수강생 정보를 찾을 수 없습니다.</p>
		{/if}
	</div>
</div>

<style lang="scss">
	.student-detail {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-2xl);
		}

		&__menu {
			margin-top: var(--space-lg);
		}
	}

	.info-section {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: var(--space-lg);

		&__name {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			color: var(--color-text);
		}

		&__phone {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-top: var(--space-xs);
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-top: var(--space-xs);
		}
	}

	.menu-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.menu-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) 0;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.7;
		}

		&__label {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__right {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			color: var(--color-text-muted);
		}
	}
</style>
