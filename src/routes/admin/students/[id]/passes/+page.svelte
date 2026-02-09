<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMemberPasses, createMemberPass, getPassTypes, getInstructors } from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate } from '$lib/utils/format';
	import type { MemberPass, PassType, Instructor } from '$lib/types/member';
	import { onMount } from 'svelte';

	let passes = $state<MemberPass[]>([]);
	let passTypes = $state<PassType[]>([]);
	let instructors = $state<Instructor[]>([]);
	let loading = $state(true);
	let showCreateModal = $state(false);
	let creating = $state(false);
	let error = $state('');

	// Form
	let selectedPassTypeId = $state('');
	let selectedInstructorId = $state('');
	let startDate = $state('');
	let totalLessons = $state('');

	const memberId = $derived(Number(page.params.id));

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const [passRes, typesRes, instrRes] = await Promise.allSettled([
				getMemberPasses(academyId, memberId),
				getPassTypes(academyId),
				getInstructors(academyId)
			]);

			if (passRes.status === 'fulfilled' && passRes.value.status) {
				passes = passRes.value.data;
			}
			if (typesRes.status === 'fulfilled' && typesRes.value.status) {
				passTypes = typesRes.value.data;
			}
			if (instrRes.status === 'fulfilled' && instrRes.value.status) {
				instructors = instrRes.value.data;
			}
		} catch {
			// handle error
		} finally {
			loading = false;
		}
	});

	function openCreateModal() {
		selectedPassTypeId = '';
		selectedInstructorId = '';
		startDate = new Date().toISOString().split('T')[0];
		totalLessons = '';
		error = '';
		showCreateModal = true;
	}

	function handlePassTypeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedPassTypeId = target.value;
		const pt = passTypes.find((t) => t.id === Number(target.value));
		if (pt) {
			totalLessons = String(pt.total_lessons);
		}
	}

	async function handleCreate() {
		error = '';
		if (!selectedPassTypeId || !selectedInstructorId || !startDate || !totalLessons) {
			error = '모든 항목을 입력해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		creating = true;
		try {
			const res = await createMemberPass(academyId, memberId, {
				pass_type_id: Number(selectedPassTypeId),
				instructor_id: Number(selectedInstructorId),
				start_date: startDate,
				total_lessons: Number(totalLessons)
			});
			if (res.status && res.data) {
				passes = [...passes, res.data];
				showCreateModal = false;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '수강권 부여에 실패했습니다.';
		} finally {
			creating = false;
		}
	}

	function getStatusVariant(status: string) {
		switch (status) {
			case 'ACTIVE':
				return 'success' as const;
			case 'HOLDING':
				return 'warning' as const;
			default:
				return 'neutral' as const;
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'ACTIVE':
				return '이용중';
			case 'HOLDING':
				return '홀딩';
			case 'EXPIRED':
				return '만료';
			case 'COMPLETED':
				return '완료';
			default:
				return status;
		}
	}
</script>

<div class="passes-page">
	<BackHeader title="수강권 관리" onback={() => goto(`/admin/students/${memberId}`)} />

	<div class="passes-page__content">
		<div class="passes-page__header">
			<Button size="sm" onclick={openCreateModal}>수강권 부여</Button>
		</div>

		{#if loading}
			<div class="passes-page__loading">
				<Spinner />
			</div>
		{:else if passes.length === 0}
			<p class="passes-page__empty">등록된 수강권이 없습니다.</p>
		{:else}
			<div class="pass-list">
				{#each passes as pass}
					<Card>
						<div class="pass-item">
							<div class="pass-item__header">
								<span class="pass-item__name">{pass.pass_name}</span>
								<Badge variant={getStatusVariant(pass.status)}>{getStatusLabel(pass.status)}</Badge>
							</div>
							<div class="pass-item__body">
								<span>{pass.instructor_name} 선생님</span>
								<span>잔여 {pass.remaining_lessons}/{pass.total_lessons}회</span>
								<span class="pass-item__date">{formatDate(pass.start_date)} ~ {formatDate(pass.end_date)}</span>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Modal isOpen={showCreateModal} title="수강권 부여" onclose={() => (showCreateModal = false)}>
	<form class="create-form" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
		<div class="create-form__field">
			<label class="create-form__label" for="pass-type">수강권 종류</label>
			<select id="pass-type" class="create-form__select" value={selectedPassTypeId} onchange={handlePassTypeChange}>
				<option value="">선택하세요</option>
				{#each passTypes as pt}
					<option value={pt.id}>{pt.pass_name} ({pt.pass_category})</option>
				{/each}
			</select>
		</div>

		<div class="create-form__field">
			<label class="create-form__label" for="instructor">담당 강사</label>
			<select id="instructor" class="create-form__select" bind:value={selectedInstructorId}>
				<option value="">선택하세요</option>
				{#each instructors as instr}
					<option value={instr.instructor_id}>{instr.user_name} ({instr.specialties})</option>
				{/each}
			</select>
		</div>

		<Input type="date" label="시작일" bind:value={startDate} />
		<Input type="number" label="총 수업횟수" bind:value={totalLessons} />

		{#if error}
			<p class="create-form__error">{error}</p>
		{/if}

		<div class="create-form__actions">
			<Button variant="secondary" onclick={() => (showCreateModal = false)}>취소</Button>
			<Button type="submit" loading={creating}>부여하기</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.passes-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__header {
			display: flex;
			justify-content: flex-end;
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
	}

	.pass-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.pass-item {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__name {
			font-weight: var(--font-weight-semibold);
		}

		&__body {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
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
		}

		&__select {
			width: 100%;
			padding: 12px 16px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			background-color: var(--color-white);
			outline: none;

			&:focus {
				border-color: var(--color-primary);
			}
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}

		&__actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-sm);
		}
	}
</style>
