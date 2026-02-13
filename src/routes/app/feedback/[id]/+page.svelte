<script lang="ts">
	import { page } from '$app/state';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getFeedbackDetail } from '$lib/api/feedback';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import ScoreDisplay from '$lib/components/feedback/ScoreDisplay.svelte';
	import { formatDate } from '$lib/utils/format';
	import type {
		FeedbackDetail,
		WeeklyFeedbackDetail,
		MonthlyFeedbackDetail
	} from '$lib/types/feedback';
	import { onMount } from 'svelte';

	let feedback = $state<FeedbackDetail | null>(null);
	let loading = $state(true);

	const feedbackId = $derived(Number(page.params.id));
	const isWeekly = $derived(feedback?.type === 'WEEKLY');
	const weekly = $derived(feedback as WeeklyFeedbackDetail | null);
	const monthly = $derived(feedback as MonthlyFeedbackDetail | null);

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const res = await getFeedbackDetail(academyId, feedbackId);
			if (res.status && res.data) {
				feedback = res.data;
			}
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	});
</script>

<div class="detail-page">
	<BackHeader title="피드백 상세" onback={() => history.back()} />

	<div class="detail-page__content">
		{#if loading}
			<div class="detail-page__loading">
				<Spinner />
			</div>
		{:else if !feedback}
			<p class="detail-page__empty">피드백을 찾을 수 없습니다.</p>
		{:else}
			<!-- 헤더 정보 -->
			<div class="detail-card">
				<div class="detail-card__header">
					<Badge variant={isWeekly ? 'info' : 'success'}>
						{isWeekly ? '위클리' : '먼슬리'}
					</Badge>
					<span class="detail-card__date">{formatDate(feedback.feedback_date)}</span>
				</div>
				<p class="detail-card__instructor">{feedback.instructor_name} 선생님</p>
			</div>

			{#if isWeekly && weekly}
				<div class="detail-card">
					<h3 class="detail-card__title">레슨 내용</h3>
					<p class="detail-card__body">{weekly.lesson_content}</p>
				</div>

				{#if weekly.strengths}
					<div class="detail-card">
						<h3 class="detail-card__title">잘한 점</h3>
						<p class="detail-card__body">{weekly.strengths}</p>
					</div>
				{/if}

				{#if weekly.improvements}
					<div class="detail-card">
						<h3 class="detail-card__title">개선할 점</h3>
						<p class="detail-card__body">{weekly.improvements}</p>
					</div>
				{/if}

				{#if weekly.notes}
					<div class="detail-card">
						<h3 class="detail-card__title">메모</h3>
						<p class="detail-card__body">{weekly.notes}</p>
					</div>
				{/if}

				{#if weekly.video_url}
					<div class="detail-card">
						<h3 class="detail-card__title">영상</h3>
						<a href={weekly.video_url} target="_blank" class="detail-card__link"> 영상 보기 </a>
					</div>
				{/if}
			{:else if !isWeekly && monthly}
				{#if monthly.skill_details.length > 0}
					<div class="detail-card">
						<h3 class="detail-card__title">카테고리별 평가</h3>
						<div class="skill-list">
							{#each monthly.skill_details as detail}
								<ScoreDisplay
									categoryName={detail.category_name ?? ''}
									score={detail.score}
									level={detail.level}
									comment={detail.comment}
								/>
							{/each}
						</div>
					</div>
				{/if}

				{#if monthly.curriculum_direction}
					<div class="detail-card">
						<h3 class="detail-card__title">커리큘럼 방향</h3>
						{#if monthly.curriculum_direction.next_month}
							<div class="detail-card__section">
								<p class="detail-card__subtitle">다음 달 목표</p>
								<p class="detail-card__body">{monthly.curriculum_direction.next_month}</p>
							</div>
						{/if}
						{#if monthly.curriculum_direction.long_term}
							<div class="detail-card__section">
								<p class="detail-card__subtitle">장기 방향</p>
								<p class="detail-card__body">{monthly.curriculum_direction.long_term}</p>
							</div>
						{/if}
					</div>
				{/if}

				{#if monthly.instructor_goals}
					<div class="detail-card">
						<h3 class="detail-card__title">강사 목표</h3>
						<p class="detail-card__body">{monthly.instructor_goals}</p>
					</div>
				{/if}

				{#if monthly.instructor_message}
					<div class="detail-card">
						<h3 class="detail-card__title">강사 메시지</h3>
						<p class="detail-card__body">{monthly.instructor_message}</p>
					</div>
				{/if}

				{#if monthly.video_url}
					<div class="detail-card">
						<h3 class="detail-card__title">영상</h3>
						<a href={monthly.video_url} target="_blank" class="detail-card__link"> 영상 보기 </a>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	.detail-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md)
				calc(var(--bottom-nav-height) + var(--space-lg));
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
	}

	.detail-card {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: var(--space-lg);
		margin-bottom: var(--space-sm);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__date {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__instructor {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-sm);
		}

		&__subtitle {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
			margin-top: var(--space-sm);
			margin-bottom: var(--space-xs);
		}

		&__body {
			font-size: var(--font-size-base);
			color: var(--color-text);
			line-height: var(--line-height-base);
			white-space: pre-wrap;
		}

		&__link {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			text-decoration: underline;
		}

	}

	.skill-list {
		display: flex;
		flex-direction: column;
	}
</style>
