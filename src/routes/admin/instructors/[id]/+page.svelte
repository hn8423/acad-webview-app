<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getInstructorDetail, getMembers } from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatPhone } from '$lib/utils/format';
	import type { Instructor, MemberListItem, StudentPassStatus } from '$lib/types/member';
	import { onMount } from 'svelte';

	const instructorId = Number(page.params.id);

	let instructor = $state<Instructor | null>(null);
	let loadingInstructor = $state(true);

	let students = $state<MemberListItem[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let search = $state('');
	let nextCursor = $state<number | null>(null);
	let hasMore = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let activeTab = $state<StudentPassStatus>('ALL');
	let loadMoreEl = $state<HTMLDivElement | null>(null);

	const tabs: { label: string; value: StudentPassStatus }[] = [
		{ label: '전체', value: 'ALL' },
		{ label: '수업중', value: 'ACTIVE' },
		{ label: '만료', value: 'EXPIRED' }
	];

	$effect(() => {
		if (!loadMoreEl || !hasMore) return;
		const target = loadMoreEl;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
					fetchStudents(true);
				}
			},
			{ rootMargin: '200px 0px' }
		);
		observer.observe(target);
		return () => observer.disconnect();
	});

	onMount(() => {
		fetchInstructor();
		fetchStudents();
	});

	async function fetchInstructor() {
		const academyId = academyStore.academyId;
		if (!academyId || !instructorId) return;

		try {
			const res = await getInstructorDetail(academyId, instructorId);
			if (res.status && res.data) {
				instructor = res.data;
			}
		} catch {
			// Error toast is handled automatically by client.ts
		} finally {
			loadingInstructor = false;
		}
	}

	async function fetchStudents(append = false) {
		const academyId = academyStore.academyId;
		if (!academyId || !instructorId) return;

		if (append) {
			loadingMore = true;
		} else {
			loading = true;
		}

		try {
			const cursor = append ? (nextCursor ?? undefined) : undefined;
			// instructor_id가 있으면 pass_status 생략 시 백엔드가 ACTIVE를 강제하므로 항상 명시적으로 전달
			const res = await getMembers(
				academyId,
				cursor,
				20,
				search || undefined,
				'STUDENT',
				activeTab,
				instructorId
			);
			if (res.status && res.data) {
				students = append ? [...students, ...res.data.list] : res.data.list;
				nextCursor = res.data.next_cursor;
				hasMore = res.data.next_cursor !== null;
			}
		} catch {
			// Error toast is handled automatically by client.ts
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function handleSearchInput() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			nextCursor = null;
			fetchStudents();
		}, 300);
	}

	function handleTabChange(tab: StudentPassStatus) {
		activeTab = tab;
		search = '';
		nextCursor = null;
		fetchStudents();
	}
</script>

<div class="instructor-detail">
	<BackHeader title="강사 상세" onback={() => goto('/admin/instructors')} />

	<div class="instructor-detail__content">
		{#if loadingInstructor}
			<div class="instructor-detail__loading">
				<Spinner />
			</div>
		{:else if instructor}
			<div class="info-section">
				<div class="info-section__avatar">
					{#if instructor.profile_img}
						<img
							src={instructor.profile_img}
							alt={instructor.user_name}
							class="info-section__avatar-img"
						/>
					{:else}
						<svg
							width="28"
							height="28"
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
				<div class="info-section__text">
					<div class="info-section__top">
						<h2 class="info-section__name">{instructor.user_name}</h2>
						{#if instructor.specialties}
							<Badge variant="info">{instructor.specialties}</Badge>
						{/if}
					</div>
					<p class="info-section__count">담당 수강생 {instructor.student_count ?? 0}명</p>
					{#if instructor.introduction}
						<p class="info-section__intro">{instructor.introduction}</p>
					{/if}
				</div>
			</div>
		{:else}
			<p class="instructor-detail__empty">강사 정보를 찾을 수 없습니다.</p>
		{/if}

		<section class="students-section">
			<h3 class="students-section__title">담당 수강생</h3>

			<div class="students-section__tabs">
				{#each tabs as tab (tab.value)}
					<button
						class="students-section__tab"
						class:students-section__tab--active={activeTab === tab.value}
						onclick={() => handleTabChange(tab.value)}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<div class="students-section__search">
				<Input placeholder="이름으로 검색..." bind:value={search} oninput={handleSearchInput} />
			</div>

			{#if loading}
				<div class="students-section__loading">
					<Spinner />
				</div>
			{:else if students.length === 0}
				<p class="students-section__empty">
					{#if search}
						검색 결과가 없습니다.
					{:else if activeTab === 'ACTIVE'}
						수업중인 수강생이 없습니다.
					{:else if activeTab === 'EXPIRED'}
						만료된 수강생이 없습니다.
					{:else}
						담당 수강생이 없습니다.
					{/if}
				</p>
			{:else}
				<div class="student-list">
					{#each students as student, i (student.member_id)}
						<div
							class="student-row"
							role="button"
							tabindex="0"
							onclick={() => goto(`/admin/students/${student.member_id}`)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									goto(`/admin/students/${student.member_id}`);
								}
							}}
						>
							<div class="student-row__info">
								<h4 class="student-row__name">{student.user_name}</h4>
								<span class="student-row__phone">{formatPhone(student.user_phone)}</span>
							</div>
							<div class="student-row__stats">
								{#if student.active_passes > 0}
									<Badge variant="success">수강권 {student.active_passes}</Badge>
								{:else}
									<Badge variant="neutral">수강권 없음</Badge>
								{/if}
							</div>
						</div>
						{#if i < students.length - 1}
							<div class="student-list__divider"></div>
						{/if}
					{/each}
				</div>

				{#if hasMore}
					<div class="students-section__load-more" bind:this={loadMoreEl}>
						{#if loadingMore}
							<Spinner size="sm" />
						{/if}
					</div>
				{/if}
			{/if}
		</section>
	</div>
</div>

<style lang="scss">
	.instructor-detail {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
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

	.info-section {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: var(--space-md);
		margin-bottom: var(--space-lg);

		&__avatar {
			width: 56px;
			height: 56px;
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

		&__text {
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
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__count {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
			margin-bottom: var(--space-xs);
		}

		&__intro {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			line-height: var(--line-height-base);
		}
	}

	.students-section {
		&__title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
			margin-bottom: var(--space-sm);
		}

		&__tabs {
			display: flex;
			gap: var(--space-xs);
			background: var(--color-bg);
			border-radius: var(--radius-md);
			padding: 4px;
			margin-bottom: var(--space-md);
		}

		&__tab {
			flex: 1;
			padding: 8px 12px;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			transition: all var(--transition-fast);

			&--active {
				background: var(--color-white);
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);
				box-shadow: var(--shadow-sm);
			}
		}

		&__search {
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

		&__load-more {
			display: flex;
			justify-content: center;
			align-items: center;
			min-height: 48px;
			padding: var(--space-md);
		}
	}

	.student-list {
		display: flex;
		flex-direction: column;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.student-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.student-row {
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
		}

		&__stats {
			display: flex;
			gap: var(--space-xs);
		}
	}
</style>
