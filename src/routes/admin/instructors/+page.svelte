<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getInstructors, createInstructor, getMembers } from '$lib/api/member';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { Instructor, MemberListItem } from '$lib/types/member';
	import { formatPhone } from '$lib/utils/format';
	import { onMount } from 'svelte';

	let instructors = $state<Instructor[]>([]);
	let loading = $state(true);
	let fetchError = $state('');
	let showCreateModal = $state(false);
	let creating = $state(false);
	let error = $state('');

	// Step management: 'select-member' | 'fill-details'
	let step = $state<'select-member' | 'fill-details'>('select-member');

	// Step 1: Member search & select
	let memberSearch = $state('');
	let memberList = $state<MemberListItem[]>([]);
	let memberLoading = $state(false);
	let memberNextCursor = $state<number | null>(null);
	let memberHasMore = $state(false);
	let memberLoadingMore = $state(false);
	let selectedMember = $state<MemberListItem | null>(null);
	let memberSearchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Step 2: Instructor details
	let specialties = $state('');
	let introduction = $state('');
	let isAdmin = $state(false);

	onMount(() => fetchInstructors());

	async function fetchInstructors() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		fetchError = '';
		try {
			const res = await getInstructors(academyId);
			if (res.status && res.data) {
				instructors = res.data.instructors;
			}
		} catch {
			fetchError = '강사 목록을 불러오는데 실패했습니다.';
		} finally {
			loading = false;
		}
	}

	function openCreateModal() {
		step = 'select-member';
		memberSearch = '';
		memberList = [];
		memberNextCursor = null;
		memberHasMore = false;
		selectedMember = null;
		specialties = '';
		introduction = '';
		isAdmin = false;
		error = '';
		showCreateModal = true;
		fetchMemberList();
	}

	async function fetchMemberList(append = false) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		if (append) {
			memberLoadingMore = true;
		} else {
			memberLoading = true;
		}

		try {
			const cursor = append ? (memberNextCursor ?? undefined) : undefined;
			const res = await getMembers(academyId, cursor, 20, memberSearch || undefined);
			if (res.status && res.data) {
				if (append) {
					memberList = [...memberList, ...res.data.list];
				} else {
					memberList = res.data.list;
				}
				memberNextCursor = res.data.meta.next_cursor;
				memberHasMore = res.data.meta.next_cursor !== null;
			}
		} catch {
			error = '멤버 목록을 불러오는데 실패했습니다.';
		} finally {
			memberLoading = false;
			memberLoadingMore = false;
		}
	}

	function handleMemberSearchInput() {
		if (memberSearchTimeout) clearTimeout(memberSearchTimeout);
		memberSearchTimeout = setTimeout(() => {
			memberNextCursor = null;
			fetchMemberList();
		}, 300);
	}

	function selectMember(member: MemberListItem) {
		selectedMember = member;
		step = 'fill-details';
		error = '';
	}

	function goBackToMemberSelect() {
		step = 'select-member';
		error = '';
	}

	function loadMoreMembers() {
		if (!memberLoadingMore && memberHasMore) {
			fetchMemberList(true);
		}
	}

	async function handleCreate() {
		error = '';
		if (!selectedMember) {
			error = '멤버를 선택해주세요.';
			return;
		}
		if (!specialties.trim()) {
			error = '전문분야를 입력해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		creating = true;
		try {
			const trimmedIntro = introduction.trim();
			const res = await createInstructor(academyId, {
				member_id: selectedMember.id,
				specialties: specialties.trim(),
				...(trimmedIntro ? { introduction: trimmedIntro } : {}),
				is_admin: isAdmin ? 1 : 0
			});
			if (res.status && res.data) {
				instructors = [...instructors, res.data];
				showCreateModal = false;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '강사 추가에 실패했습니다.';
		} finally {
			creating = false;
		}
	}
</script>

<div class="admin-instructors">
	<div class="admin-instructors__header">
		<h1 class="admin-instructors__title">강사 관리</h1>
		<Button size="sm" onclick={openCreateModal}>강사 추가</Button>
	</div>

	{#if loading}
		<div class="admin-instructors__loading">
			<Spinner />
		</div>
	{:else if fetchError}
		<p class="admin-instructors__error">{fetchError}</p>
	{:else if instructors.length === 0}
		<p class="admin-instructors__empty">등록된 강사가 없습니다.</p>
	{:else}
		<div class="instructor-list">
			{#each instructors as instructor, i}
				<div class="instructor-row">
					<div class="instructor-row__avatar">
						{#if instructor.profile_img}
							<img
								src={instructor.profile_img}
								alt={instructor.user_name}
								class="instructor-row__avatar-img"
							/>
						{:else}
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						{/if}
					</div>
					<div class="instructor-row__info">
						<div class="instructor-row__top">
							<h3 class="instructor-row__name">{instructor.user_name}</h3>
							{#if instructor.specialties}
								<Badge variant="info">{instructor.specialties}</Badge>
							{/if}
						</div>
						{#if instructor.introduction}
							<p class="instructor-row__intro">{instructor.introduction}</p>
						{/if}
					</div>
				</div>
				{#if i < instructors.length - 1}
					<div class="instructor-list__divider"></div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<Modal isOpen={showCreateModal} title="강사 추가" onclose={() => (showCreateModal = false)}>
	{#if step === 'select-member'}
		<div class="member-select">
			<div class="member-select__search">
				<Input
					placeholder="이름으로 검색..."
					bind:value={memberSearch}
					oninput={handleMemberSearchInput}
				/>
			</div>

			{#if memberLoading}
				<div class="member-select__loading">
					<Spinner size="sm" />
				</div>
			{:else if memberList.length === 0}
				<p class="member-select__empty">
					{memberSearch ? '검색 결과가 없습니다.' : '등록된 멤버가 없습니다.'}
				</p>
			{:else}
				<div class="member-select__list">
					{#each memberList as member, i}
						<button type="button" class="member-select__row" onclick={() => selectMember(member)}>
							<div class="member-select__info">
								<span class="member-select__name">{member.user_name}</span>
								<span class="member-select__phone">{formatPhone(member.user_phone)}</span>
							</div>
							<Badge variant="neutral">{member.role}</Badge>
						</button>
						{#if i < memberList.length - 1}
							<div class="member-select__divider"></div>
						{/if}
					{/each}
				</div>

				{#if memberHasMore}
					<div class="member-select__load-more">
						{#if memberLoadingMore}
							<Spinner size="sm" />
						{:else}
							<button type="button" class="load-more-btn" onclick={loadMoreMembers}>
								더 보기
							</button>
						{/if}
					</div>
				{/if}
			{/if}

			{#if error}
				<p class="create-form__error">{error}</p>
			{/if}
		</div>
	{:else}
		<form
			class="create-form"
			onsubmit={(e) => {
				e.preventDefault();
				handleCreate();
			}}
		>
			<div class="selected-member">
				<button
					type="button"
					class="selected-member__back"
					aria-label="멤버 선택으로 돌아가기"
					onclick={goBackToMemberSelect}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>
				<div class="selected-member__info">
					<span class="selected-member__label">선택된 멤버</span>
					<span class="selected-member__name">{selectedMember?.user_name}</span>
				</div>
			</div>

			<Input
				label="전문분야"
				placeholder="예: 피아노, 기타, 드럼"
				bind:value={specialties}
				maxlength={100}
			/>

			<div class="create-form__field">
				<label class="create-form__label" for="instructor-intro">소개</label>
				<textarea
					id="instructor-intro"
					class="create-form__textarea"
					placeholder="강사 소개를 입력하세요"
					bind:value={introduction}
					maxlength={500}
				></textarea>
			</div>

			<label class="create-form__checkbox">
				<input type="checkbox" bind:checked={isAdmin} />
				<span>관리자 권한 부여</span>
			</label>

			{#if error}
				<p class="create-form__error">{error}</p>
			{/if}

			<div class="create-form__actions">
				<Button type="submit" fullWidth loading={creating}>추가하기</Button>
				<Button variant="secondary" fullWidth onclick={() => (showCreateModal = false)}>취소</Button
				>
			</div>
		</form>
	{/if}
</Modal>

<style lang="scss">
	.admin-instructors {
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

		&__error {
			text-align: center;
			color: var(--color-danger);
			padding: var(--space-2xl);
		}
	}

	.instructor-list {
		display: flex;
		flex-direction: column;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.instructor-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.instructor-row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md) 0;

		&__avatar {
			width: 48px;
			height: 48px;
			border-radius: var(--radius-full);
			background-color: var(--color-bg);
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			overflow: hidden;
			color: var(--color-text-muted);
		}

		&__avatar-img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		&__info {
			flex: 1;
			min-width: 0;
		}

		&__top {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-xs);
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__intro {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			line-height: var(--line-height-base);
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	}

	.member-select {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__search {
			flex-shrink: 0;
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-xl);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-xl);
			font-size: var(--font-size-sm);
		}

		&__list {
			display: flex;
			flex-direction: column;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			max-height: 320px;
			overflow-y: auto;
		}

		&__row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-sm);
			padding: var(--space-sm) var(--space-md);
			cursor: pointer;
			transition: background-color var(--transition-fast);
			text-align: left;
			width: 100%;

			&:active {
				background-color: var(--color-primary-bg);
			}
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
		}

		&__phone {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__divider {
			height: 1px;
			background-color: var(--color-divider);
			margin: 0 var(--space-md);
		}

		&__load-more {
			display: flex;
			justify-content: center;
			padding: var(--space-sm);
		}
	}

	.selected-member {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-primary-bg);
		border-radius: var(--radius-md);

		&__back {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 32px;
			height: 32px;
			border-radius: var(--radius-full);
			color: var(--color-primary);
			cursor: pointer;
			transition: background-color var(--transition-fast);
			flex-shrink: 0;

			&:hover {
				background-color: var(--color-primary-light);
			}
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}

		&__label {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
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

		&__textarea {
			width: 100%;
			min-height: 120px;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			font-family: inherit;
			resize: vertical;
			outline: none;
			color: var(--color-text);
			transition: box-shadow var(--transition-fast);

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}

			&::placeholder {
				color: var(--color-text-muted);
			}
		}

		&__checkbox {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			font-size: var(--font-size-sm);
			color: var(--color-text);
			cursor: pointer;

			input[type='checkbox'] {
				width: 18px;
				height: 18px;
				accent-color: var(--color-primary);
				cursor: pointer;
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

	.load-more-btn {
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		padding: var(--space-xs) var(--space-lg);
		border-radius: var(--radius-full);
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-primary-bg);
		}
	}
</style>
