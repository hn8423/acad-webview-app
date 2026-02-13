<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getFeedbackDetail,
		deleteFeedback,
		updateWeeklyFeedback,
		updateMonthlyFeedback,
		getCategories
	} from '$lib/api/feedback';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import ScoreDisplay from '$lib/components/feedback/ScoreDisplay.svelte';
	import ScoreInput from '$lib/components/feedback/ScoreInput.svelte';
	import { formatDate } from '$lib/utils/format';
	import type {
		FeedbackDetail,
		WeeklyFeedbackDetail,
		MonthlyFeedbackDetail,
		FeedbackCategory
	} from '$lib/types/feedback';
	import { onMount } from 'svelte';

	let feedback = $state<FeedbackDetail | null>(null);
	let loading = $state(true);

	// 삭제 모달
	let showDeleteModal = $state(false);

	// 위클리 수정 모달
	let showEditWeeklyModal = $state(false);
	let editLessonContent = $state('');
	let editStrengths = $state('');
	let editImprovements = $state('');
	let editNotes = $state('');
	let editVideoUrl = $state('');
	let saving = $state(false);
	let editError = $state('');

	// 먼슬리 수정 모달
	let showEditMonthlyModal = $state(false);
	let categories = $state<FeedbackCategory[]>([]);
	let editScores = $state<Record<number, number>>({});
	let editComments = $state<Record<number, string>>({});
	let editGoals = $state('');
	let editMessage = $state('');
	let editMonthlyVideoUrl = $state('');

	const feedbackId = $derived(Number(page.params.id));

	const isWeekly = $derived(feedback?.feedback_type === 'WEEKLY');
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

	function openEditWeekly() {
		if (!weekly) return;
		editLessonContent = weekly.lesson_content;
		editStrengths = weekly.strengths ?? '';
		editImprovements = weekly.improvements ?? '';
		editNotes = weekly.notes ?? '';
		editVideoUrl = weekly.video_url ?? '';
		editError = '';
		showEditWeeklyModal = true;
	}

	async function handleEditWeekly() {
		editError = '';
		if (!editLessonContent.trim()) {
			editError = '레슨 내용을 입력해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		saving = true;
		try {
			const res = await updateWeeklyFeedback(academyId, feedbackId, {
				lesson_content: editLessonContent.trim(),
				strengths: editStrengths.trim() || undefined,
				improvements: editImprovements.trim() || undefined,
				notes: editNotes.trim() || undefined,
				video_url: editVideoUrl.trim() || undefined
			});
			if (res.status && res.data) {
				feedback = res.data;
				toastStore.success('피드백이 수정되었습니다.');
				showEditWeeklyModal = false;
			}
		} catch (err) {
			editError = err instanceof Error ? err.message : '수정에 실패했습니다.';
		} finally {
			saving = false;
		}
	}

	async function openEditMonthly() {
		if (!monthly) return;
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const catRes = await getCategories(academyId);
			if (catRes.status && catRes.data) {
				categories = catRes.data.sort((a, b) => a.sort_order - b.sort_order);
			}
		} catch {
			// handled by client.ts
		}

		const newScores: Record<number, number> = {};
		const newComments: Record<number, string> = {};
		for (const detail of monthly.skill_details) {
			newScores[detail.category_id] = detail.score;
			newComments[detail.category_id] = detail.comment ?? '';
		}
		editScores = newScores;
		editComments = newComments;
		editGoals = monthly.instructor_goals ?? '';
		editMessage = monthly.instructor_message ?? '';
		editMonthlyVideoUrl = monthly.video_url ?? '';
		editError = '';
		showEditMonthlyModal = true;
	}

	async function handleEditMonthly() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		const skillDetails = categories.map((cat) => ({
			category_id: cat.id,
			score: editScores[cat.id] ?? 10,
			comment: editComments[cat.id]?.trim() || undefined
		}));

		saving = true;
		try {
			const res = await updateMonthlyFeedback(academyId, feedbackId, {
				skill_details: skillDetails,
				instructor_goals: editGoals.trim() || undefined,
				instructor_message: editMessage.trim() || undefined,
				video_url: editMonthlyVideoUrl.trim() || undefined
			});
			if (res.status && res.data) {
				feedback = res.data;
				toastStore.success('피드백이 수정되었습니다.');
				showEditMonthlyModal = false;
			}
		} catch (err) {
			editError = err instanceof Error ? err.message : '수정에 실패했습니다.';
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			await deleteFeedback(academyId, feedbackId);
			toastStore.success('피드백이 삭제되었습니다.');
			history.back();
		} catch {
			// handled by client.ts
		}
	}
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
				<div class="detail-card__meta">
					<p>학생: <strong>{feedback.member_name}</strong></p>
					<p>강사: {feedback.instructor_name}</p>
				</div>
			</div>

			{#if isWeekly && weekly}
				<!-- 위클리 상세 -->
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
						<a href={weekly.video_url} target="_blank" class="detail-card__link">
							영상 보기
						</a>
					</div>
				{/if}
			{:else if !isWeekly && monthly}
				<!-- 먼슬리 상세 -->
				{#if monthly.overall_level}
					<div class="detail-card">
						<h3 class="detail-card__title">종합 레벨</h3>
						<p class="detail-card__level">{monthly.overall_level}</p>
					</div>
				{/if}

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

				{#if monthly.member_music_info}
					<div class="detail-card">
						<h3 class="detail-card__title">학생 음악 정보</h3>
						<div class="detail-card__info-grid">
							{#if monthly.member_music_info.genre}
								<p>장르: {monthly.member_music_info.genre}</p>
							{/if}
							{#if monthly.member_music_info.instrument}
								<p>악기: {monthly.member_music_info.instrument}</p>
							{/if}
							{#if monthly.member_music_info.experience_years}
								<p>경력: {monthly.member_music_info.experience_years}년</p>
							{/if}
						</div>
					</div>
				{/if}

				{#if monthly.curriculum_direction}
					<div class="detail-card">
						<h3 class="detail-card__title">커리큘럼 방향</h3>
						{#if monthly.curriculum_direction.next_month_focus}
							<p class="detail-card__body">{monthly.curriculum_direction.next_month_focus}</p>
						{/if}
						{#if monthly.curriculum_direction.recommended_songs?.length}
							<div class="detail-card__songs">
								<p class="detail-card__subtitle">추천 곡</p>
								<ul>
									{#each monthly.curriculum_direction.recommended_songs as song}
										<li>{song}</li>
									{/each}
								</ul>
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
						<a href={monthly.video_url} target="_blank" class="detail-card__link">
							영상 보기
						</a>
					</div>
				{/if}
			{/if}

			<!-- 액션 버튼 -->
			<div class="detail-page__actions">
				<Button fullWidth onclick={isWeekly ? openEditWeekly : openEditMonthly}>수정</Button>
				<Button variant="danger" fullWidth onclick={() => (showDeleteModal = true)}>삭제</Button>
			</div>
		{/if}
	</div>
</div>

<!-- 삭제 확인 모달 -->
<Modal isOpen={showDeleteModal} title="피드백 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">이 피드백을 삭제하시겠습니까?</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<!-- 위클리 수정 모달 -->
<Modal
	isOpen={showEditWeeklyModal}
	title="위클리 피드백 수정"
	onclose={() => (showEditWeeklyModal = false)}
>
	<form
		class="edit-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleEditWeekly();
		}}
	>
		<div class="edit-form__field">
			<label class="edit-form__label" for="edit-content">레슨 내용</label>
			<textarea
				id="edit-content"
				class="edit-form__textarea"
				bind:value={editLessonContent}
				rows="3"
			></textarea>
		</div>

		<div class="edit-form__field">
			<label class="edit-form__label" for="edit-strengths">잘한 점</label>
			<textarea
				id="edit-strengths"
				class="edit-form__textarea"
				bind:value={editStrengths}
				rows="2"
			></textarea>
		</div>

		<div class="edit-form__field">
			<label class="edit-form__label" for="edit-improvements">개선할 점</label>
			<textarea
				id="edit-improvements"
				class="edit-form__textarea"
				bind:value={editImprovements}
				rows="2"
			></textarea>
		</div>

		<div class="edit-form__field">
			<label class="edit-form__label" for="edit-notes">메모</label>
			<textarea
				id="edit-notes"
				class="edit-form__textarea"
				bind:value={editNotes}
				rows="2"
			></textarea>
		</div>

		<Input label="영상 URL" bind:value={editVideoUrl} />

		{#if editError}
			<p class="edit-form__error">{editError}</p>
		{/if}

		<div class="edit-form__actions">
			<Button type="submit" fullWidth loading={saving}>수정하기</Button>
			<Button variant="secondary" fullWidth onclick={() => (showEditWeeklyModal = false)}>
				취소
			</Button>
		</div>
	</form>
</Modal>

<!-- 먼슬리 수정 모달 -->
<Modal
	isOpen={showEditMonthlyModal}
	title="먼슬리 피드백 수정"
	onclose={() => (showEditMonthlyModal = false)}
>
	<form
		class="edit-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleEditMonthly();
		}}
	>
		{#if categories.length > 0}
			<div class="score-list">
				{#each categories as cat (cat.id)}
					<ScoreInput
						categoryName={cat.category_name}
						score={editScores[cat.id] ?? 10}
						comment={editComments[cat.id] ?? ''}
						onscorechange={(s) => (editScores = { ...editScores, [cat.id]: s })}
						oncommentchange={(c) => (editComments = { ...editComments, [cat.id]: c })}
					/>
				{/each}
			</div>
		{/if}

		<div class="edit-form__field">
			<label class="edit-form__label" for="edit-goals">강사 목표</label>
			<textarea
				id="edit-goals"
				class="edit-form__textarea"
				bind:value={editGoals}
				rows="2"
			></textarea>
		</div>

		<div class="edit-form__field">
			<label class="edit-form__label" for="edit-message">강사 메시지</label>
			<textarea
				id="edit-message"
				class="edit-form__textarea"
				bind:value={editMessage}
				rows="3"
			></textarea>
		</div>

		<Input label="영상 URL" bind:value={editMonthlyVideoUrl} />

		{#if editError}
			<p class="edit-form__error">{editError}</p>
		{/if}

		<div class="edit-form__actions">
			<Button type="submit" fullWidth loading={saving}>수정하기</Button>
			<Button variant="secondary" fullWidth onclick={() => (showEditMonthlyModal = false)}>
				취소
			</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.detail-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md)
				var(--space-2xl);
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

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-lg);
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

		&__meta {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			line-height: var(--line-height-base);

			strong {
				color: var(--color-text);
			}
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

		&__level {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			background: var(--color-primary-gradient);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		&__link {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			text-decoration: underline;
		}

		&__info-grid {
			font-size: var(--font-size-sm);
			color: var(--color-text);
			line-height: var(--line-height-base);
		}

		&__songs {
			ul {
				list-style: disc;
				padding-left: var(--space-lg);
				font-size: var(--font-size-sm);
				color: var(--color-text);
				line-height: var(--line-height-base);
			}
		}
	}

	.skill-list {
		display: flex;
		flex-direction: column;
	}

	.score-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.edit-form {
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
