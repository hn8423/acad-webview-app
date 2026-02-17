<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getFeedbackList, createWeeklyFeedback } from '$lib/api/feedback';
	import { getMemberPasses } from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import FeedbackTypeFilter from '$lib/components/feedback/FeedbackTypeFilter.svelte';
	import { formatDate } from '$lib/utils/format';
	import type { FeedbackListItem, FeedbackType } from '$lib/types/feedback';
	import type { MemberPass } from '$lib/types/member';
	import { onMount } from 'svelte';

	let feedbackList = $state<FeedbackListItem[]>([]);
	let passes = $state<MemberPass[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let typeFilter = $state<FeedbackType | undefined>(undefined);
	const LIMIT = 10;

	// Weekly 작성 모달
	let showTypeModal = $state(false);
	let showWeeklyModal = $state(false);
	let creating = $state(false);
	let error = $state('');

	// Weekly 폼
	let selectedPassId = $state('');
	let feedbackDate = $state('');
	let lessonContent = $state('');
	let strengths = $state('');
	let improvements = $state('');
	let notes = $state('');
	let videoUrl = $state('');

	const memberId = $derived(Number(page.params.id));

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const [feedbackRes, passRes] = await Promise.allSettled([
				getFeedbackList(academyId, memberId, undefined, 1, LIMIT),
				getMemberPasses(academyId, memberId)
			]);

			if (feedbackRes.status === 'fulfilled' && feedbackRes.value.status) {
				feedbackList = feedbackRes.value.data.list;
				totalPages = Math.ceil(feedbackRes.value.data.meta.total / LIMIT);
			}
			if (passRes.status === 'fulfilled' && passRes.value.status) {
				passes = passRes.value.data;
			}
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	});

	async function fetchFeedback() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getFeedbackList(academyId, memberId, typeFilter, currentPage, LIMIT);
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

	function openCreateFlow() {
		showTypeModal = true;
	}

	function selectWeekly() {
		showTypeModal = false;
		selectedPassId = '';
		feedbackDate = new Date().toISOString().split('T')[0];
		lessonContent = '';
		strengths = '';
		improvements = '';
		notes = '';
		videoUrl = '';
		error = '';
		showWeeklyModal = true;
	}

	function selectMonthly() {
		showTypeModal = false;
		goto(`/admin/students/${memberId}/feedback/new-monthly`);
	}

	async function handleCreateWeekly() {
		error = '';
		if (!selectedPassId || !feedbackDate || !lessonContent.trim()) {
			error = '수강권, 날짜, 레슨 내용을 입력해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		const selectedPass = activePasses.find((p) => p.id === Number(selectedPassId));
		if (!selectedPass?.instructor_id) {
			error = '선택한 수강권의 강사 정보를 찾을 수 없습니다.';
			return;
		}

		creating = true;
		try {
			const res = await createWeeklyFeedback(academyId, {
				member_id: memberId,
				member_pass_id: Number(selectedPassId),
				instructor_id: selectedPass.instructor_id,
				feedback_date: feedbackDate,
				lesson_content: lessonContent.trim(),
				strengths: strengths.trim() || undefined,
				improvements: improvements.trim() || undefined,
				notes: notes.trim() || undefined,
				video_url: videoUrl.trim() || undefined
			});
			if (res.status) {
				toastStore.success('위클리 피드백이 작성되었습니다.');
				showWeeklyModal = false;
				currentPage = 1;
				await fetchFeedback();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '피드백 작성에 실패했습니다.';
		} finally {
			creating = false;
		}
	}

	const activePasses = $derived(passes.filter((p) => p.status === 'ACTIVE'));
</script>

<div class="feedback-page">
	<BackHeader title="피드백" onback={() => goto(`/admin/students/${memberId}`)} />

	<div class="feedback-page__content">
		<div class="feedback-page__header">
			<FeedbackTypeFilter selected={typeFilter} onchange={handleTypeChange} />
			<Button size="sm" onclick={openCreateFlow}>피드백 작성</Button>
		</div>

		{#if loading}
			<div class="feedback-page__loading">
				<Spinner />
			</div>
		{:else if feedbackList.length === 0}
			<p class="feedback-page__empty">작성된 피드백이 없습니다.</p>
		{:else}
			<div class="feedback-list">
				{#each feedbackList as item, i}
					<div
						class="feedback-row"
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
						<div class="feedback-row__left">
							<Badge variant={item.feedback_type === 'WEEKLY' ? 'info' : 'success'}>
								{item.feedback_type === 'WEEKLY' ? '위클리' : '먼슬리'}
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
				<div class="feedback-page__pagination">
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
					<span class="feedback-page__page">{currentPage} / {totalPages}</span>
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
</div>

<!-- 타입 선택 모달 -->
<Modal isOpen={showTypeModal} title="피드백 유형 선택" onclose={() => (showTypeModal = false)}>
	<div class="type-select">
		<button class="type-select__option" onclick={selectWeekly}>
			<div class="type-select__icon type-select__icon--weekly">W</div>
			<div class="type-select__text">
				<strong>위클리 피드백</strong>
				<span>주간 레슨 내용, 잘한 점, 개선점</span>
			</div>
		</button>
		<button class="type-select__option" onclick={selectMonthly}>
			<div class="type-select__icon type-select__icon--monthly">M</div>
			<div class="type-select__text">
				<strong>먼슬리 피드백</strong>
				<span>월간 종합 평가, 카테고리별 점수</span>
			</div>
		</button>
	</div>
</Modal>

<!-- 위클리 피드백 작성 모달 -->
<Modal
	isOpen={showWeeklyModal}
	title="위클리 피드백 작성"
	onclose={() => (showWeeklyModal = false)}
>
	<form
		class="create-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleCreateWeekly();
		}}
	>
		<div class="create-form__field">
			<label class="create-form__label" for="pass-select">수강권</label>
			<select id="pass-select" class="create-form__select" bind:value={selectedPassId}>
				<option value="">선택하세요</option>
				{#each activePasses as pass}
					<option value={pass.id}>{pass.pass_name} ({pass.instructor_name})</option>
				{/each}
			</select>
		</div>

		<Input type="date" label="피드백 날짜" bind:value={feedbackDate} />

		<div class="create-form__field">
			<label class="create-form__label" for="lesson-content">레슨 내용</label>
			<textarea
				id="lesson-content"
				class="create-form__textarea"
				bind:value={lessonContent}
				placeholder="오늘 레슨에서 다룬 내용"
				rows="3"
			></textarea>
		</div>

		<div class="create-form__field">
			<label class="create-form__label" for="strengths">잘한 점</label>
			<textarea
				id="strengths"
				class="create-form__textarea"
				bind:value={strengths}
				placeholder="선택 사항"
				rows="2"
			></textarea>
		</div>

		<div class="create-form__field">
			<label class="create-form__label" for="improvements">개선할 점</label>
			<textarea
				id="improvements"
				class="create-form__textarea"
				bind:value={improvements}
				placeholder="선택 사항"
				rows="2"
			></textarea>
		</div>

		<div class="create-form__field">
			<label class="create-form__label" for="notes">메모</label>
			<textarea
				id="notes"
				class="create-form__textarea"
				bind:value={notes}
				placeholder="선택 사항"
				rows="2"
			></textarea>
		</div>

		<Input label="영상 URL" bind:value={videoUrl} placeholder="https:// (선택 사항)" />

		{#if error}
			<p class="create-form__error">{error}</p>
		{/if}

		<div class="create-form__actions">
			<Button type="submit" fullWidth loading={creating}>작성하기</Button>
			<Button variant="secondary" fullWidth onclick={() => (showWeeklyModal = false)}>취소</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.feedback-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__header {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
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

	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__select {
			width: 100%;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			outline: none;
			appearance: none;
			background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238b95a1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
			background-repeat: no-repeat;
			background-position: right 16px center;
			padding-right: 40px;
			transition: box-shadow var(--transition-fast);

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__textarea {
			width: 100%;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			outline: none;
			resize: vertical;
			font-family: inherit;
			line-height: var(--line-height-base);
			transition: box-shadow var(--transition-fast);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
