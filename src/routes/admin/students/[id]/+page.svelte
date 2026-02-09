<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMemberDetail } from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatPhone, formatDate } from '$lib/utils/format';
	import type { MemberListItem } from '$lib/types/member';
	import { onMount } from 'svelte';

	let member = $state<MemberListItem | null>(null);
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
			<Card>
				<div class="info-section">
					<h2 class="info-section__name">{member.user_name}</h2>
					<p class="info-section__phone">{formatPhone(member.user_phone)}</p>
					<p class="info-section__date">가입일: {formatDate(member.joined_at)}</p>
				</div>
			</Card>

			<div class="student-detail__menu">
				<Card onclick={() => goto(`/admin/students/${page.params.id}/passes`)}>
					<div class="menu-item">
						<span class="menu-item__label">수강권 관리</span>
						<div class="menu-item__right">
							{#if member.active_passes > 0}
								<Badge variant="success">{member.active_passes}개 활성</Badge>
							{/if}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M9 18l6-6-6-6" />
							</svg>
						</div>
					</div>
				</Card>

				<Card onclick={() => goto(`/admin/students/${page.params.id}/drinks`)}>
					<div class="menu-item">
						<span class="menu-item__label">음료권 관리</span>
						<div class="menu-item__right">
							{#if member.remaining_drinks > 0}
								<Badge variant="info">{member.remaining_drinks}잔</Badge>
							{/if}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M9 18l6-6-6-6" />
							</svg>
						</div>
					</div>
				</Card>
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
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-md);
		}
	}

	.info-section {
		&__name {
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-bold);
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

	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;

		&__label {
			font-weight: var(--font-weight-medium);
		}

		&__right {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			color: var(--color-text-muted);
		}
	}
</style>
