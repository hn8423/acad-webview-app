<script lang="ts">
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getMembers, getMemberPasses } from '$lib/api/member';
	import { createWeeklyFeedback } from '$lib/api/feedback';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatPhone } from '$lib/utils/format';
	import type { MemberListItem, MemberPass } from '$lib/types/member';
	import { onMount } from 'svelte';

	let step = $state(1);

	// Step 1: 학생 검색/선택
	let members = $state<MemberListItem[]>([]);
	let search = $state('');
	let searchLoading = $state(true);
	let selectedMember = $state<MemberListItem | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Step 2: 위클리 폼
	let passes = $state<MemberPass[]>([]);
	let passesLoading = $state(false);
	let creating = $state(false);
	let error = $state('');
	let selectedPassId = $state('');
	let feedbackDate = $state(new Date().toISOString().split('T')[0]);
	let lessonContent = $state('');
	let strengths = $state('');
	let improvements = $state('');
	let notes = $state('');
	let videoUrl = $state('');

	const stepLabels = ['학생 선택', '피드백 작성'];
	const activePasses = $derived(passes.filter((p) => p.status === 'ACTIVE'));

	onMount(() => fetchMembers());

	async function fetchMembers() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		searchLoading = true;
		try {
			const res = await getMembers(academyId, undefined, 20, search || undefined);
			if (res.status && res.data) {
				members = res.data.list;
			}
		} catch {
			// handled by client.ts
		} finally {
			searchLoading = false;
		}
	}

	function handleSearchInput() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => fetchMembers(), 300);
	}

	async function selectMember(member: MemberListItem) {
		selectedMember = member;
		error = '';
		selectedPassId = '';

		const academyId = academyStore.academyId;
		if (!academyId) return;

		passesLoading = true;
		try {
			const res = await getMemberPasses(academyId, member.member_id);
			if (res.status && res.data) {
				passes = res.data;
			}
		} catch {
			// handled by client.ts
		} finally {
			passesLoading = false;
			step = 2;
		}
	}

	async function handleSubmit() {
		error = '';
		if (!selectedPassId || !feedbackDate || !lessonContent.trim()) {
			error = '수강권, 날짜, 레슨 내용을 입력해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId || !selectedMember) return;

		const selectedPass = activePasses.find((p) => p.id === Number(selectedPassId));
		if (!selectedPass?.instructor_id) {
			error = '선택한 수강권의 강사 정보를 찾을 수 없습니다.';
			return;
		}

		creating = true;
		try {
			const res = await createWeeklyFeedback(academyId, {
				member_id: selectedMember.member_id,
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
				goto('/admin/feedback');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '피드백 작성에 실패했습니다.';
		} finally {
			creating = false;
		}
	}
</script>

<div class="weekly-page">
	<BackHeader
		title="위클리 피드백 작성"
		onback={() => {
			if (step > 1) {
				step -= 1;
				selectedMember = null;
				passes = [];
				error = '';
			} else {
				goto('/admin/feedback');
			}
		}}
	/>

	<div class="weekly-page__content">
		<!-- 스텝 인디케이터 -->
		<div class="step-indicator">
			<span class="step-indicator__text">
				STEP {step}/{stepLabels.length} · {stepLabels[step - 1]}
			</span>
			<div class="step-indicator__bar">
				<div class="step-indicator__progress" style="width: {(step / stepLabels.length) * 100}%"></div>
			</div>
		</div>

		{#if step === 1}
			<div class="step-section">
				<h2 class="step-section__title">학생 선택</h2>

				<div class="member-search">
					<Input placeholder="이름으로 검색..." bind:value={search} oninput={handleSearchInput} />
				</div>

				{#if searchLoading}
					<div class="weekly-page__loading">
						<Spinner />
					</div>
				{:else if members.length === 0}
					<p class="weekly-page__empty">
						{search ? '검색 결과가 없습니다.' : '등록된 수강생이 없습니다.'}
					</p>
				{:else}
					<div class="member-list">
						{#each members as member, i}
							<div
								class="member-row"
								role="button"
								tabindex="0"
								onclick={() => selectMember(member)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										selectMember(member);
									}
								}}
							>
								<div class="member-row__info">
									<span class="member-row__name">{member.user_name}</span>
									<span class="member-row__phone">{formatPhone(member.user_phone)}</span>
								</div>
								{#if member.active_passes > 0}
									<Badge variant="success">수강권 {member.active_passes}</Badge>
								{/if}
							</div>
							{#if i < members.length - 1}
								<div class="member-list__divider"></div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="step-section">
				<div class="selected-member">
					<span class="selected-member__label">선택된 학생</span>
					<span class="selected-member__name">{selectedMember?.user_name}</span>
				</div>

				{#if passesLoading}
					<div class="weekly-page__loading">
						<Spinner />
					</div>
				{:else if activePasses.length === 0}
					<p class="weekly-page__empty">이 학생은 활성화된 수강권이 없습니다.</p>
					<Button variant="secondary" fullWidth onclick={() => (step = 1)}>다른 학생 선택</Button>
				{:else}
					<form
						class="create-form"
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
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
							<Button variant="secondary" fullWidth onclick={() => goto('/admin/feedback')}
								>취소</Button
							>
						</div>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.weekly-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-2xl);
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

	.step-indicator {
		margin-bottom: var(--space-lg);

		&__text {
			display: block;
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			color: var(--color-primary);
			letter-spacing: 0.5px;
			margin-bottom: var(--space-xs);
		}

		&__bar {
			width: 100%;
			height: 4px;
			background: var(--color-divider);
			border-radius: var(--radius-full);
			overflow: hidden;
		}

		&__progress {
			height: 100%;
			background: var(--color-primary);
			border-radius: var(--radius-full);
			transition: width var(--transition-base);
		}
	}

	.step-section {
		&__title {
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-bold);
			color: var(--color-text);
			margin-bottom: var(--space-lg);
		}
	}

	.member-search {
		margin-bottom: var(--space-md);
	}

	.member-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.member-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) 0;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.7;
		}

		&__info {
			flex: 1;
			min-width: 0;
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__phone {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			margin-top: 2px;
			display: block;
		}
	}

	.selected-member {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-primary-bg);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);

		&__label {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-primary);
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
