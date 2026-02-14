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
				passes = passRes.value.data.passes;
			}
			if (typesRes.status === 'fulfilled' && typesRes.value.status) {
				passTypes = typesRes.value.data.pass_types;
			}
			if (instrRes.status === 'fulfilled' && instrRes.value.status) {
				const data = instrRes.value.data;
				instructors = Array.isArray(data) ? data : (data.instructors ?? []);
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
			case 'PAUSED':
				return 'warning' as const;
			default:
				return 'neutral' as const;
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'ACTIVE':
				return '이용중';
			case 'PAUSED':
				return '홀딩';
			case 'EXPIRED':
				return '만료';
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
							<div class="pass-item__progress">
								<div class="pass-item__progress-bar">
									<div
										class="pass-item__progress-fill"
										style="width: {pass.total_lessons > 0
											? ((pass.total_lessons - pass.remaining_lessons) / pass.total_lessons) * 100
											: 0}%"
									></div>
								</div>
								<span class="pass-item__progress-text"
									>잔여 {pass.remaining_lessons}/{pass.total_lessons}회</span
								>
							</div>
							<div class="pass-item__body">
								<span>{pass.instructor_name} 선생님</span>
								<span class="pass-item__date"
									>{formatDate(pass.start_date)} ~ {formatDate(pass.end_date)}</span
								>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Modal isOpen={showCreateModal} title="수강권 부여" onclose={() => (showCreateModal = false)}>
	<form
		class="create-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleCreate();
		}}
	>
		<div class="create-form__field">
			<label class="create-form__label" for="pass-type">수강권 종류</label>
			<select
				id="pass-type"
				class="create-form__select"
				value={selectedPassTypeId}
				onchange={handlePassTypeChange}
			>
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
					<option value={instr.id}>{instr.user_name} ({instr.specialties})</option>
				{/each}
			</select>
		</div>

		<Input type="date" label="시작일" bind:value={startDate} />
		<Input type="number" label="총 수업횟수" bind:value={totalLessons} />

		{#if error}
			<p class="create-form__error">{error}</p>
		{/if}

		<div class="create-form__actions">
			<Button type="submit" fullWidth loading={creating}>부여하기</Button>
			<Button variant="secondary" fullWidth onclick={() => (showCreateModal = false)}>취소</Button>
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
			color: var(--color-text);
		}

		&__progress {
			margin-bottom: var(--space-sm);
		}

		&__progress-bar {
			width: 100%;
			height: 6px;
			background: var(--color-bg);
			border-radius: var(--radius-full);
			overflow: hidden;
			margin-bottom: var(--space-xs);
		}

		&__progress-fill {
			height: 100%;
			background: var(--color-primary-gradient);
			border-radius: var(--radius-full);
			transition: width var(--transition-base);
		}

		&__progress-text {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			font-weight: var(--font-weight-medium);
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
