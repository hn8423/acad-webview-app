<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getFeedbackList, deleteFeedback } from '$lib/api/feedback';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import FeedbackTypeFilter from '$lib/components/feedback/FeedbackTypeFilter.svelte';
	import { formatDate } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { FeedbackListItem, FeedbackType } from '$lib/types/feedback';
	import { onMount } from 'svelte';

	let showTypeModal = $state(false);

	let feedbackList = $state<FeedbackListItem[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let typeFilter = $state<FeedbackType | undefined>(undefined);
	let deleteTarget = $state<FeedbackListItem | null>(null);
	let showDeleteModal = $state(false);
	const LIMIT = 10;

	onMount(() => fetchFeedback());

	async function fetchFeedback() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getFeedbackList(academyId, undefined, typeFilter, currentPage, LIMIT);
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

	function confirmDelete(item: FeedbackListItem) {
		deleteTarget = item;
		showDeleteModal = true;
	}

	async function handleDelete() {
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		try {
			await deleteFeedback(academyId, deleteTarget.id);
			showDeleteModal = false;
			deleteTarget = null;
			await fetchFeedback();
		} catch {
			// handled by client.ts
		}
	}
</script>

<div class="admin-feedback">
	<div class="admin-feedback__header">
		<h1 class="admin-feedback__title">피드백 관리</h1>
		<div class="admin-feedback__actions">
			<Button size="sm" onclick={() => (showTypeModal = true)}>피드백 작성</Button>
			<Button size="sm" variant="secondary" onclick={() => goto('/admin/feedback/categories')}>
				카테고리 관리
			</Button>
		</div>
	</div>

	<div class="admin-feedback__filter">
		<FeedbackTypeFilter selected={typeFilter} onchange={handleTypeChange} />
	</div>

	{#if loading}
		<div class="admin-feedback__loading">
			<Spinner />
		</div>
	{:else if feedbackList.length === 0}
		<p class="admin-feedback__empty">작성된 피드백이 없습니다.</p>
	{:else}
		<div class="feedback-list">
			{#each feedbackList as item, i}
				<div class="feedback-row" role="listitem">
					<div
						class="feedback-row__left"
						role="button"
						tabindex="0"
						onclick={() => goto(`/admin/feedback/${item.id}`)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(`/admin/feedback/${item.id}`);
							}
						}}
					>
						<Badge variant={item.type === 'WEEKLY' ? 'info' : 'success'}>
							{item.type === 'WEEKLY' ? '위클리' : '먼슬리'}
						</Badge>
						<div class="feedback-row__info">
							<span class="feedback-row__name">{item.member_name ?? ''}</span>
							<span class="feedback-row__meta">
								{item.instructor_name} · {formatDate(item.feedback_date)}
							</span>
						</div>
					</div>
					<div class="feedback-row__right">
						<button
							class="feedback-row__delete"
							onclick={() => confirmDelete(item)}
							aria-label="삭제"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
				</div>
				{#if i < feedbackList.length - 1}
					<div class="feedback-list__divider"></div>
				{/if}
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="admin-feedback__pagination">
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
				<span class="admin-feedback__page">{currentPage} / {totalPages}</span>
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

<Modal isOpen={showDeleteModal} title="피드백 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">이 피드백을 삭제하시겠습니까?</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<Modal isOpen={showTypeModal} title="피드백 유형 선택" onclose={() => (showTypeModal = false)}>
	<div class="type-select">
		<button
			class="type-select__option"
			onclick={() => {
				showTypeModal = false;
				goto('/admin/feedback/new-weekly');
			}}
		>
			<div class="type-select__icon type-select__icon--weekly">W</div>
			<div class="type-select__text">
				<strong>위클리 피드백</strong>
				<span>주간 레슨 내용, 잘한 점, 개선점</span>
			</div>
		</button>
		<button
			class="type-select__option"
			onclick={() => {
				showTypeModal = false;
				goto('/admin/feedback/new-monthly');
			}}
		>
			<div class="type-select__icon type-select__icon--monthly">M</div>
			<div class="type-select__text">
				<strong>먼슬리 피드백</strong>
				<span>월간 종합 평가, 카테고리별 점수</span>
			</div>
		</button>
	</div>
</Modal>

<style lang="scss">
	.admin-feedback {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-md);
		}

		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			color: var(--color-text);
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
		gap: var(--space-sm);
		padding: var(--space-md) 0;

		&__left {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			flex: 1;
			min-width: 0;
			cursor: pointer;
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		&__meta {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__right {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			color: var(--color-text-muted);
		}

		&__delete {
			color: var(--color-text-muted);
			padding: 6px;
			border-radius: var(--radius-sm);
			transition: all var(--transition-fast);

			&:hover {
				color: var(--color-danger);
				background-color: var(--color-danger-bg);
			}
		}
	}

	.admin-feedback__actions {
		display: flex;
		gap: var(--space-xs);
	}

	.type-select {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&__option {
			display: flex;
			align-items: center;
			gap: var(--space-md);
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
			cursor: pointer;
			transition: all var(--transition-fast);
			text-align: left;

			&:active {
				opacity: 0.7;
			}
		}

		&__icon {
			width: 40px;
			height: 40px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-bold);
			font-size: var(--font-size-lg);
			color: var(--color-white);
			flex-shrink: 0;

			&--weekly {
				background: var(--color-info);
			}

			&--monthly {
				background: var(--color-success);
			}
		}

		&__text {
			display: flex;
			flex-direction: column;
			gap: 2px;

			strong {
				font-size: var(--font-size-base);
				font-weight: var(--font-weight-semibold);
				color: var(--color-text);
			}

			span {
				font-size: var(--font-size-xs);
				color: var(--color-text-secondary);
			}
		}
	}

	.modal-message {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		line-height: var(--line-height-base);
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}
</style>
