<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getMyPasses, getMyDrinkTickets } from '$lib/api/member';
	import { getRecentNotices } from '$lib/api/academy';
	import { createHolding } from '$lib/api/holding';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import CalendarSection from '$lib/components/ui/CalendarSection.svelte';
	import HoldingRequestModal from '$lib/components/holding/HoldingRequestModal.svelte';
	import { formatDate } from '$lib/utils/format';
	import { getPassStatusVariant, getPassStatusLabel, getTicketValue } from '$lib/utils/pass';
	import type { MemberPass, DrinkTicket } from '$lib/types/member';
	import type { Notice } from '$lib/types/academy';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let passes = $state<MemberPass[]>([]);
	let drinkTickets = $state<DrinkTicket[]>([]);
	let recentNotices = $state<Notice[]>([]);
	let loading = $state(true);

	let showHoldingModal = $state(false);
	let holdingTargetPass = $state<MemberPass | null>(null);
	let holdingSubmitting = $state(false);
	let holdingError = $state('');
	let holdingRequestedPassIds = $state(new Set<number>());

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

	function openHoldingModal(pass: MemberPass) {
		holdingTargetPass = pass;
		holdingError = '';
		showHoldingModal = true;
	}

	async function handleHoldingSubmit(data: {
		holding_start: string;
		holding_end: string;
		reason?: string;
	}) {
		const academyId = academyStore.academyId;
		if (!academyId || !holdingTargetPass) return;

		holdingSubmitting = true;
		holdingError = '';
		try {
			const res = await createHolding(academyId, holdingTargetPass.id, {
				holding_start: data.holding_start,
				holding_end: data.holding_end,
				reason: data.reason
			});
			if (res.status) {
				toastStore.success('홀딩 신청이 완료되었습니다.');
				holdingRequestedPassIds = new Set([...holdingRequestedPassIds, holdingTargetPass.id]);
				showHoldingModal = false;
				holdingTargetPass = null;
			} else {
				holdingError = res.message || '홀딩 신청에 실패했습니다.';
			}
		} catch (err) {
			holdingError = err instanceof Error ? err.message : '홀딩 신청에 실패했습니다.';
		} finally {
			holdingSubmitting = false;
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
			<div class="section-card">
				<h2 class="section-title">음료권</h2>
				<div class="drink-card">
					<div class="drink-card__icon">
						<svg
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-primary)"
							stroke-width="2"
						>
							<path
								d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"
							/>
						</svg>
					</div>
					<div class="drink-card__info">
						<span class="drink-card__count">{totalDrinks}</span>
						<span class="drink-card__label">잔 남음</span>
					</div>
				</div>
			</div>
		</section>

		<!-- 수강권 -->
		<section class="main-page__section">
			<div class="section-card">
				<h2 class="section-title">수강권</h2>
				{#if passes.length === 0}
					<p class="empty-text">등록된 수강권이 없습니다.</p>
				{:else}
					<div class="pass-list">
						{#each passes as pass}
							<div class="pass-card">
								<div class="pass-card__header">
									<span class="pass-card__name">
									{pass.pass_name}
									{#if getTicketValue(pass.ticket_value) > 1}
										<span class="pass-card__ticket-badge">{getTicketValue(pass.ticket_value)}회 차감</span>
									{/if}
								</span>
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
												style="width: {((pass.total_lessons - pass.remaining_lessons) /
													pass.total_lessons) *
													100}%"
											></div>
										</div>
										<span class="pass-card__remaining">
											잔여 {pass.remaining_lessons}/{pass.total_lessons}회
										</span>
									</div>
									<div class="pass-card__date">
										{formatDate(pass.start_date)} ~ {formatDate(pass.end_date)}
									</div>
									{#if holdingRequestedPassIds.has(pass.id)}
										<span class="pass-card__holding-status">홀딩 신청중</span>
									{:else if pass.status === 'ACTIVE'}
										<button class="pass-card__holding-btn" onclick={() => openHoldingModal(pass)}>
											홀딩 신청
										</button>
									{/if}
								</div>
							</div>
							{#if passes.indexOf(pass) < passes.length - 1}
								<div class="pass-divider"></div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<!-- 캘린더 조회 -->
		{#if academyStore.academyId}
			<section class="main-page__section">
				<CalendarSection academyId={academyStore.academyId} />
			</section>
		{/if}

		<!-- 공지사항 -->
		<section class="main-page__section">
			<div class="section-card">
				<div class="section-header">
					<h2 class="section-title">공지사항</h2>
					<a href="/app/notice" class="section-more">더보기</a>
				</div>
				{#if recentNotices.length === 0}
					<p class="empty-text">공지사항이 없습니다.</p>
				{:else}
					<div class="notice-list">
						{#each recentNotices as notice, i}
							<button
								type="button"
								class="notice-item"
								onclick={() => goto(`/app/notice/${notice.id}`)}
							>
								<h3 class="notice-item__title">{notice.title}</h3>
								<span class="notice-item__date">{formatDate(notice.created_at)}</span>
							</button>
							{#if i < recentNotices.length - 1}
								<div class="notice-divider"></div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}
</div>

<HoldingRequestModal
	isOpen={showHoldingModal}
	passName={holdingTargetPass?.pass_name ?? ''}
	onclose={() => {
		showHoldingModal = false;
		holdingError = '';
	}}
	onsubmit={handleHoldingSubmit}
	submitting={holdingSubmitting}
	error={holdingError}
/>

<style lang="scss">
	.main-page {
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-section);

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__section {
			min-width: 0;
		}
	}

	.section-card {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-xl) var(--space-lg);
	}

	.section-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		margin-bottom: var(--space-md);
		letter-spacing: var(--letter-spacing-tight);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);

		.section-title {
			margin-bottom: 0;
		}
	}

	.section-more {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		text-decoration: none;
	}

	.empty-text {
		text-align: center;
		color: var(--color-text-muted);
		padding: var(--space-md) 0;
		font-size: var(--font-size-sm);
	}

	.drink-card {
		display: flex;
		align-items: center;
		gap: var(--space-lg);

		&__icon {
			flex-shrink: 0;
		}

		&__info {
			display: flex;
			align-items: baseline;
			gap: var(--space-sm);
		}

		&__count {
			font-size: var(--font-size-4xl);
			font-weight: var(--font-weight-extrabold);
			letter-spacing: var(--letter-spacing-tight);
			line-height: var(--line-height-tight);
			background: var(--color-primary-gradient);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		&__label {
			font-size: var(--font-size-base);
			color: var(--color-text-secondary);
		}
	}

	.pass-list {
		display: flex;
		flex-direction: column;
	}

	.pass-divider {
		height: 1px;
		background-color: var(--color-divider);
		margin: var(--space-md) 0;
	}

	.pass-card {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__name {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			font-weight: var(--font-weight-semibold);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__ticket-badge {
			padding: 2px 6px;
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-warning);
			background: var(--color-warning-bg);
			border-radius: var(--radius-full);
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

		&__holding-btn {
			margin-top: var(--space-sm);
			padding: 6px 12px;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-primary);
			background: var(--color-primary-bg);
			border: none;
			border-radius: var(--radius-sm);
			cursor: pointer;
			transition: all var(--transition-fast);
			align-self: flex-start;

			&:hover {
				background: var(--color-primary-light);
			}

			&:active {
				opacity: 0.7;
			}
		}

		&__holding-status {
			margin-top: var(--space-sm);
			padding: 6px 12px;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-warning);
			background: var(--color-warning-bg);
			border-radius: var(--radius-sm);
			align-self: flex-start;
		}
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background-color: var(--color-divider);
		border-radius: var(--radius-full);
		overflow: hidden;

		&__fill {
			height: 100%;
			background: var(--color-primary-gradient);
			border-radius: var(--radius-full);
			transition: width var(--transition-base);
		}
	}

	.notice-list {
		display: flex;
		flex-direction: column;
	}

	.notice-divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.notice-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: 14px 0;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.6;
		}

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
			color: var(--color-text);
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
		}
	}
</style>
