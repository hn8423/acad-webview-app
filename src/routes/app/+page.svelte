<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMyPasses, getMyDrinkTickets } from '$lib/api/member';
	import { getRecentNotices } from '$lib/api/academy';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate } from '$lib/utils/format';
	import type { MemberPass, DrinkTicket } from '$lib/types/member';
	import type { Notice } from '$lib/types/academy';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let passes = $state<MemberPass[]>([]);
	let drinkTickets = $state<DrinkTicket[]>([]);
	let recentNotices = $state<Notice[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const [passRes, drinkRes, noticeRes] = await Promise.allSettled([
				getMyPasses(academyId),
				getMyDrinkTickets(academyId),
				getRecentNotices(academyId)
			]);

			if (passRes.status === 'fulfilled' && passRes.value.status) {
				passes = passRes.value.data;
			}
			if (drinkRes.status === 'fulfilled' && drinkRes.value.status) {
				drinkTickets = drinkRes.value.data;
			}
			if (noticeRes.status === 'fulfilled' && noticeRes.value.status) {
				recentNotices = noticeRes.value.data;
			}
		} catch {
			// errors handled per-section
		} finally {
			loading = false;
		}
	});

	let totalDrinks = $derived(drinkTickets.reduce((sum, t) => sum + t.remaining_count, 0));

	function getPassStatusVariant(status: string) {
		switch (status) {
			case 'ACTIVE':
				return 'success' as const;
			case 'HOLDING':
				return 'warning' as const;
			case 'EXPIRED':
			case 'COMPLETED':
				return 'neutral' as const;
			default:
				return 'neutral' as const;
		}
	}

	function getPassStatusLabel(status: string): string {
		switch (status) {
			case 'ACTIVE':
				return '이용중';
			case 'HOLDING':
				return '홀딩';
			case 'EXPIRED':
				return '만료';
			case 'COMPLETED':
				return '완료';
			default:
				return status;
		}
	}
</script>

<div class="main-page">
	{#if loading}
		<div class="main-page__loading">
			<Spinner />
		</div>
	{:else}
		<!-- 음료권 -->
		<section class="main-page__section">
			<h2 class="section-title">음료권</h2>
			<Card>
				<div class="drink-card">
					<div class="drink-card__icon">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
							<path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
						</svg>
					</div>
					<div class="drink-card__info">
						<span class="drink-card__count">{totalDrinks}</span>
						<span class="drink-card__label">잔 남음</span>
					</div>
				</div>
			</Card>
		</section>

		<!-- 수강권 -->
		<section class="main-page__section">
			<h2 class="section-title">수강권</h2>
			{#if passes.length === 0}
				<Card>
					<p class="empty-text">등록된 수강권이 없습니다.</p>
				</Card>
			{:else}
				<div class="pass-list">
					{#each passes as pass}
						<Card>
							<div class="pass-card">
								<div class="pass-card__header">
									<span class="pass-card__name">{pass.pass_name}</span>
									<Badge variant={getPassStatusVariant(pass.status)}>
										{getPassStatusLabel(pass.status)}
									</Badge>
								</div>
								<div class="pass-card__body">
									<div class="pass-card__instructor">{pass.instructor_name} 선생님</div>
									<div class="pass-card__progress">
										<div class="progress-bar">
											<div
												class="progress-bar__fill"
												style="width: {((pass.total_lessons - pass.remaining_lessons) / pass.total_lessons) * 100}%"
											></div>
										</div>
										<span class="pass-card__remaining">
											잔여 {pass.remaining_lessons}/{pass.total_lessons}회
										</span>
									</div>
									<div class="pass-card__date">
										{formatDate(pass.start_date)} ~ {formatDate(pass.end_date)}
									</div>
								</div>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</section>

		<!-- 공지사항 -->
		<section class="main-page__section">
			<div class="section-header">
				<h2 class="section-title">공지사항</h2>
				<a href="/app/notice" class="section-more">더보기</a>
			</div>
			{#if recentNotices.length === 0}
				<Card>
					<p class="empty-text">공지사항이 없습니다.</p>
				</Card>
			{:else}
				<div class="notice-list">
					{#each recentNotices as notice}
						<Card onclick={() => goto(`/app/notice/${notice.id}`)}>
							<div class="notice-item">
								<h3 class="notice-item__title">{notice.title}</h3>
								<span class="notice-item__date">{formatDate(notice.created_at)}</span>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style lang="scss">
	.main-page {
		padding: var(--space-md);

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__section {
			margin-bottom: var(--space-lg);
		}
	}

	.section-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		margin-bottom: var(--space-sm);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.section-more {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.empty-text {
		text-align: center;
		color: var(--color-text-muted);
		padding: var(--space-md);
		font-size: var(--font-size-sm);
	}

	.drink-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);

		&__info {
			display: flex;
			align-items: baseline;
			gap: var(--space-xs);
		}

		&__count {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			color: var(--color-primary);
		}

		&__label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}
	}

	.pass-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.pass-card {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__name {
			font-weight: var(--font-weight-semibold);
		}

		&__instructor {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-sm);
		}

		&__progress {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-xs);
		}

		&__remaining {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			white-space: nowrap;
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background-color: var(--color-bg);
		border-radius: var(--radius-full);
		overflow: hidden;

		&__fill {
			height: 100%;
			background-color: var(--color-primary);
			border-radius: var(--radius-full);
			transition: width var(--transition-base);
		}
	}

	.notice-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.notice-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
		}
	}
</style>
