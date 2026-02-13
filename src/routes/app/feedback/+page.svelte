<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMyFeedback } from '$lib/api/feedback';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import FeedbackTypeFilter from '$lib/components/feedback/FeedbackTypeFilter.svelte';
	import { formatDate } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { FeedbackListItem, FeedbackType } from '$lib/types/feedback';
	import { onMount } from 'svelte';

	let feedbackList = $state<FeedbackListItem[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let typeFilter = $state<FeedbackType | undefined>(undefined);
	const LIMIT = 10;

	onMount(() => fetchFeedback());

	async function fetchFeedback() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getMyFeedback(academyId, typeFilter, currentPage, LIMIT);
			if (res.status && res.data) {
				feedbackList = res.data.list;
				totalPages = Math.ceil(res.data.meta.total / LIMIT);
			}
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	function handleTypeChange(type: FeedbackType | undefined) {
		typeFilter = type;
		currentPage = 1;
		fetchFeedback();
	}
</script>

<div class="my-feedback">
	<h1 class="my-feedback__title">피드백</h1>

	<div class="my-feedback__filter">
		<FeedbackTypeFilter selected={typeFilter} onchange={handleTypeChange} />
	</div>

	{#if loading}
		<div class="my-feedback__loading">
			<Spinner />
		</div>
	{:else if feedbackList.length === 0}
		<p class="my-feedback__empty">받은 피드백이 없습니다.</p>
	{:else}
		<div class="feedback-list">
			{#each feedbackList as item, i}
				<div
					class="feedback-row"
					role="button"
					tabindex="0"
					onclick={() => goto(`/app/feedback/${item.id}`)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							goto(`/app/feedback/${item.id}`);
						}
					}}
				>
					<div class="feedback-row__left">
						<Badge variant={item.type === 'WEEKLY' ? 'info' : 'success'}>
							{item.type === 'WEEKLY' ? '위클리' : '먼슬리'}
						</Badge>
						<div class="feedback-row__info">
							<span class="feedback-row__date">{formatDate(item.feedback_date)}</span>
							<span class="feedback-row__instructor">{item.instructor_name}</span>
						</div>
					</div>
					<div class="feedback-row__right">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-text-muted)"
							stroke-width="2"
						>
							<path d="M9 18l6-6-6-6" />
						</svg>
					</div>
				</div>
				{#if i < feedbackList.length - 1}
					<div class="feedback-list__divider"></div>
				{/if}
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="my-feedback__pagination">
				<Button
					size="sm"
					variant="ghost"
					disabled={currentPage <= 1}
					onclick={() => {
						currentPage -= 1;
						fetchFeedback();
					}}
				>
					이전
				</Button>
				<span class="my-feedback__page">{currentPage} / {totalPages}</span>
				<Button
					size="sm"
					variant="ghost"
					disabled={currentPage >= totalPages}
					onclick={() => {
						currentPage += 1;
						fetchFeedback();
					}}
				>
					다음
				</Button>
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.my-feedback {
		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			color: var(--color-text);
			margin-bottom: var(--space-md);
		}

		&__filter {
			margin-bottom: var(--space-md);
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

		&__pagination {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: var(--space-md);
			margin-top: var(--space-lg);
		}

		&__page {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}
	}

	.feedback-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.feedback-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.feedback-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) 0;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.7;
		}

		&__left {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}

		&__date {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__instructor {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__right {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			color: var(--color-text-muted);
		}
	}
</style>
