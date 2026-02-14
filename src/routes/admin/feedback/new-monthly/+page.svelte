<script lang="ts">
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getMembers, getMemberPasses } from '$lib/api/member';
	import { getCategories, createMonthlyFeedback } from '$lib/api/feedback';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ScoreInput from '$lib/components/feedback/ScoreInput.svelte';
	import { formatPhone } from '$lib/utils/format';
	import type { MemberListItem, MemberPass } from '$lib/types/member';
	import type { FeedbackCategory } from '$lib/types/feedback';
	import { onMount } from 'svelte';

	let step = $state(1);

	// Step 1: 학생 검색/선택
	let members = $state<MemberListItem[]>([]);
	let search = $state('');
	let searchLoading = $state(true);
	let selectedMember = $state<MemberListItem | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Step 2: 기본 정보
	let passes = $state<MemberPass[]>([]);
	let categories = $state<FeedbackCategory[]>([]);
	let dataLoading = $state(false);
	let error = $state('');
	let selectedPassId = $state('');
	let feedbackDate = $state(new Date().toISOString().split('T')[0]);
	let genre = $state('');
	let favoriteArtist = $state('');
	let experienceYears = $state('');

	// Step 3: 카테고리별 점수
	let scores = $state<Record<number, number>>({});
	let comments = $state<Record<number, string>>({});

	// Step 4: 커리큘럼 + 메시지
	let direction = $state('');
	let focus = $state('');
	let instructorGoals = $state('');
	let instructorMessage = $state('');
	let videoUrl = $state('');
	let creating = $state(false);

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

		dataLoading = true;
		try {
			const [passRes, catRes] = await Promise.allSettled([
				getMemberPasses(academyId, member.member_id),
				getCategories(academyId)
			]);

			if (passRes.status === 'fulfilled' && passRes.value.status) {
				passes = passRes.value.data;
			}
			if (catRes.status === 'fulfilled' && catRes.value.status) {
				categories = [...catRes.value.data].sort((a, b) => a.sort_order - b.sort_order);
				scores = Object.fromEntries(categories.map((cat) => [cat.id, 10]));
				comments = Object.fromEntries(categories.map((cat) => [cat.id, '']));
			}
		} catch {
			// handled by client.ts
		} finally {
			dataLoading = false;
			step = 2;
		}
	}

	function goToStep3() {
		error = '';
		if (!selectedPassId || !feedbackDate) {
			error = '수강권과 날짜를 선택해주세요.';
			return;
		}
		step = 3;
	}

	function goToStep4() {
		step = 4;
	}

	function goBack() {
		if (step > 1) {
			const prevStep = step - 1;
			step = prevStep;
			if (prevStep === 1) {
				selectedMember = null;
				passes = [];
				categories = [];
				error = '';
			}
		} else {
			goto('/admin/feedback');
		}
	}

	async function handleSubmit() {
		error = '';
		const academyId = academyStore.academyId;
		if (!academyId || !selectedMember) return;

		const skillDetails = categories.map((cat) => ({
			category_id: cat.id,
			score: scores[cat.id] ?? 10,
			comment: comments[cat.id]?.trim() || undefined
		}));

		creating = true;
		try {
			const res = await createMonthlyFeedback(academyId, {
				member_id: selectedMember.member_id,
				member_pass_id: Number(selectedPassId),
				feedback_date: feedbackDate,
				member_music_info:
					genre || favoriteArtist || experienceYears
						? {
								genre: genre.trim() || undefined,
								favorite_artist: favoriteArtist.trim() || undefined,
								experience_years: experienceYears ? Number(experienceYears) : undefined
							}
						: undefined,
				skill_details: skillDetails,
				curriculum_direction:
					direction || focus.trim()
						? {
								direction: direction.trim() || '',
								focus: focus.trim() || ''
							}
						: undefined,
				instructor_goals: instructorGoals.trim() || undefined,
				instructor_message: instructorMessage.trim() || undefined,
				video_url: videoUrl.trim() || undefined
			});
			if (res.status) {
				toastStore.success('먼슬리 피드백이 작성되었습니다.');
				goto('/admin/feedback');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '피드백 작성에 실패했습니다.';
		} finally {
			creating = false;
		}
	}
</script>

<div class="monthly-page">
	<BackHeader title="먼슬리 피드백 작성" onback={goBack} />

	<div class="monthly-page__content">
		<!-- 스텝 인디케이터 -->
		<div class="step-indicator">
			{#each [1, 2, 3, 4] as s}
				<div class="step-indicator__dot" class:step-indicator__dot--active={step >= s}></div>
			{/each}
		</div>

		{#if step === 1}
			<div class="step-section">
				<h2 class="step-section__title">학생 선택</h2>

				<div class="member-search">
					<Input placeholder="이름으로 검색..." bind:value={search} oninput={handleSearchInput} />
				</div>

				{#if searchLoading}
					<div class="monthly-page__loading">
						<Spinner />
					</div>
				{:else if members.length === 0}
					<p class="monthly-page__empty">
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
		{:else if step === 2}
			<div class="step-section">
				<div class="selected-member">
					<span class="selected-member__label">선택된 학생</span>
					<span class="selected-member__name">{selectedMember?.user_name}</span>
				</div>

				{#if dataLoading}
					<div class="monthly-page__loading">
						<Spinner />
					</div>
				{:else if activePasses.length === 0}
					<p class="monthly-page__empty">이 학생은 활성화된 수강권이 없습니다.</p>
					<Button variant="secondary" fullWidth onclick={() => (step = 1)}>다른 학생 선택</Button>
				{:else}
					<h2 class="step-section__title">기본 정보</h2>

					<div class="create-form">
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

						<h3 class="step-section__subtitle">학생 음악 정보 (선택)</h3>
						<Input label="장르" bind:value={genre} placeholder="예: 팝, 재즈, 클래식" />
						<Input label="좋아하는 아티스트" bind:value={favoriteArtist} placeholder="예: Dream Theater, BTS" />
						<Input
							type="number"
							label="경력 (년)"
							bind:value={experienceYears}
							placeholder="예: 2"
						/>

						{#if error}
							<p class="create-form__error">{error}</p>
						{/if}

						<Button fullWidth onclick={goToStep3}>다음</Button>
					</div>
				{/if}
			</div>
		{:else if step === 3}
			<div class="step-section">
				<div class="selected-member">
					<span class="selected-member__label">선택된 학생</span>
					<span class="selected-member__name">{selectedMember?.user_name}</span>
				</div>

				<h2 class="step-section__title">카테고리별 평가</h2>

				{#if categories.length === 0}
					<p class="monthly-page__empty">
						등록된 평가 카테고리가 없습니다. 먼저 카테고리를 추가해주세요.
					</p>
				{:else}
					<div class="score-list">
						{#each categories as cat (cat.id)}
							<ScoreInput
								categoryName={cat.category_name}
								score={scores[cat.id] ?? 10}
								comment={comments[cat.id] ?? ''}
								onscorechange={(s) => (scores = { ...scores, [cat.id]: s })}
								oncommentchange={(c) => (comments = { ...comments, [cat.id]: c })}
							/>
						{/each}
					</div>

					<Button fullWidth onclick={goToStep4}>다음</Button>
				{/if}
			</div>
		{:else}
			<div class="step-section">
				<div class="selected-member">
					<span class="selected-member__label">선택된 학생</span>
					<span class="selected-member__name">{selectedMember?.user_name}</span>
				</div>

				<h2 class="step-section__title">커리큘럼 & 메시지</h2>

				<div class="create-form">
					<div class="create-form__field">
						<label class="create-form__label" for="next-focus">커리큘럼 방향</label>
						<textarea
							id="next-focus"
							class="create-form__textarea"
							bind:value={direction}
							placeholder="선택 사항"
							rows="2"
						></textarea>
					</div>

					<div class="create-form__field">
						<label class="create-form__label" for="songs">중점 사항</label>
						<textarea
							id="songs"
							class="create-form__textarea"
							bind:value={focus}
							placeholder="선택 사항"
							rows="3"
						></textarea>
					</div>

					<div class="create-form__field">
						<label class="create-form__label" for="goals">강사 목표</label>
						<textarea
							id="goals"
							class="create-form__textarea"
							bind:value={instructorGoals}
							placeholder="선택 사항"
							rows="2"
						></textarea>
					</div>

					<div class="create-form__field">
						<label class="create-form__label" for="message">강사 메시지</label>
						<textarea
							id="message"
							class="create-form__textarea"
							bind:value={instructorMessage}
							placeholder="학생에게 전할 메시지"
							rows="3"
						></textarea>
					</div>

					<Input label="영상 URL" bind:value={videoUrl} placeholder="https:// (선택 사항)" />

					{#if error}
						<p class="create-form__error">{error}</p>
					{/if}

					<Button fullWidth loading={creating} onclick={handleSubmit}>작성하기</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.monthly-page {
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
		display: flex;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);

		&__dot {
			width: 8px;
			height: 8px;
			border-radius: var(--radius-full);
			background: var(--color-divider);
			transition: all var(--transition-fast);

			&--active {
				width: 24px;
				background: var(--color-primary);
			}
		}
	}

	.step-section {
		&__title {
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-bold);
			color: var(--color-text);
			margin-bottom: var(--space-lg);
		}

		&__subtitle {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
			margin-top: var(--space-sm);
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

	.score-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
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
	}
</style>
