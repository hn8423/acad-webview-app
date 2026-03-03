<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getMemberPasses,
		createMemberPass,
		updateMemberPass,
		getPassTypes,
		getInstructors
	} from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate } from '$lib/utils/format';
	import { getPassStatusVariant, getPassStatusLabel, getTicketValue } from '$lib/utils/pass';
	import type { MemberPass, PassType, Instructor } from '$lib/types/member';
	import { onMount } from 'svelte';

	let passes = $state<MemberPass[]>([]);
	let passTypes = $state<PassType[]>([]);
	let instructors = $state<Instructor[]>([]);
	let loading = $state(true);

	// Form modal
	let showFormModal = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let editTarget = $state<MemberPass | null>(null);

	// Create form fields
	let selectedPassTypeId = $state('');
	let selectedInstructorId = $state('');

	// Shared form fields
	let startDate = $state('');
	let totalLessons = $state('');

	// Edit-only form fields
	let endDate = $state('');
	let remainingLessons = $state('');
	let selectedStatus = $state<MemberPass['status']>('ACTIVE');

	const memberId = $derived(Number(page.params.id));
	let formTitle = $derived(editTarget ? '수강권 수정' : '수강권 부여');

	onMount(() => fetchData());

	async function fetchData() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
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
				const data = typesRes.value.data;
				passTypes = Array.isArray(data) ? data : (data.pass_types ?? []);
			}
			if (instrRes.status === 'fulfilled' && instrRes.value.status) {
				const data = instrRes.value.data;
				instructors = Array.isArray(data) ? data : (data.instructors ?? []);
			}
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	async function fetchPasses() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const res = await getMemberPasses(academyId, memberId);
			if (res.status) {
				passes = res.data;
			}
		} catch {
			// handled by client.ts
		}
	}

	function openCreateModal() {
		editTarget = null;
		selectedPassTypeId = '';
		selectedInstructorId = '';
		startDate = new Date().toISOString().split('T')[0];
		totalLessons = '';
		error = '';
		showFormModal = true;
	}

	function openEditModal(pass: MemberPass) {
		editTarget = pass;
		startDate = pass.start_date ? pass.start_date.split('T')[0] : '';
		endDate = pass.end_date ? pass.end_date.split('T')[0] : '';
		totalLessons = String(pass.total_lessons);
		remainingLessons = String(pass.remaining_lessons);
		selectedStatus = pass.status;
		error = '';
		showFormModal = true;
	}

	function handlePassTypeChange() {
		const pt = passTypes.find((t) => String(t.id) === String(selectedPassTypeId));
		if (pt) {
			totalLessons = String(pt.total_lessons);
		}
	}

	let selectedPassTypeTicketValue = $derived.by(() => {
		if (!selectedPassTypeId) return 1;
		const pt = passTypes.find((t) => String(t.id) === String(selectedPassTypeId));
		return pt?.ticket_value ?? 1;
	});

	async function handleSubmit() {
		error = '';
		const academyId = academyStore.academyId;
		if (!academyId) return;

		if (editTarget) {
			if (!startDate || !endDate || !totalLessons || !remainingLessons) {
				error = '모든 항목을 입력해주세요.';
				return;
			}

			submitting = true;
			try {
				const res = await updateMemberPass(academyId, memberId, editTarget.id, {
					start_date: startDate,
					end_date: endDate,
					total_lessons: Number(totalLessons),
					remaining_lessons: Number(remainingLessons),
					status: selectedStatus
				});
				if (res.status) {
					toastStore.success('수강권이 수정되었습니다.');
					showFormModal = false;
					await fetchPasses();
				}
			} catch (err) {
				error = err instanceof Error ? err.message : '수강권 수정에 실패했습니다.';
			} finally {
				submitting = false;
			}
		} else {
			if (!selectedPassTypeId || !selectedInstructorId || !startDate || !totalLessons) {
				error = '모든 항목을 입력해주세요.';
				return;
			}

			submitting = true;
			try {
				const res = await createMemberPass(academyId, memberId, {
					pass_type_id: Number(selectedPassTypeId),
					instructor_id: Number(selectedInstructorId),
					start_date: startDate,
					total_lessons: Number(totalLessons)
				});
				if (res.status) {
					toastStore.success('수강권이 부여되었습니다.');
					showFormModal = false;
					await fetchPasses();
				}
			} catch (err) {
				error = err instanceof Error ? err.message : '수강권 부여에 실패했습니다.';
			} finally {
				submitting = false;
			}
		}
	}
</script>

<div class="passes-page">
	<BackHeader title="수강권 관리" onback={() => goto(`/admin/students/${memberId}`)} />

	<div class="passes-page__content">
		<div class="passes-page__header">
			<button class="passes-page__link" onclick={() => goto('/admin/pass-types')}>
				수강권 종류 관리
			</button>
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
				{#each passes as pass (pass.id)}
					<Card>
						<div class="pass-item">
							<div class="pass-item__header">
								<span class="pass-item__name">
									{pass.pass_name}
									{#if getTicketValue(pass.ticket_value) > 1}
										<span class="pass-item__ticket-badge">{getTicketValue(pass.ticket_value)}회 차감</span>
									{/if}
								</span>
								<Badge variant={getPassStatusVariant(pass.status)}
									>{getPassStatusLabel(pass.status)}</Badge
								>
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
							<div class="pass-item__actions">
								<button class="action-btn" onclick={() => openEditModal(pass)}>수정</button>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Modal isOpen={showFormModal} title={formTitle} onclose={() => (showFormModal = false)}>
	<form
		class="create-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		{#if !editTarget}
			<div class="create-form__field">
				<label class="create-form__label" for="pass-type">수강권 종류</label>
				<select
					id="pass-type"
					class="create-form__select"
					bind:value={selectedPassTypeId}
					onchange={handlePassTypeChange}
				>
					<option value="">선택하세요</option>
					{#each passTypes as pt}
						<option value={pt.id}>
							{pt.pass_name} ({pt.pass_category}){pt.ticket_value > 1 ? ` [${pt.ticket_value}회 차감]` : ''}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedPassTypeTicketValue > 1}
				<p class="create-form__info">
					이 수강권은 예약 시 {selectedPassTypeTicketValue}회씩 차감됩니다.
				</p>
			{/if}

			<div class="create-form__field">
				<label class="create-form__label" for="instructor">담당 강사</label>
				<select id="instructor" class="create-form__select" bind:value={selectedInstructorId}>
					<option value="">선택하세요</option>
					{#each instructors as instr}
						<option value={instr.instructor_id ?? instr.id}
							>{instr.user_name} ({instr.specialties})</option
						>
					{/each}
				</select>
			</div>
		{/if}

		<Input type="date" label="시작일" bind:value={startDate} />

		{#if editTarget}
			<Input type="date" label="종료일" bind:value={endDate} />
		{/if}

		<Input type="number" label="총 수업횟수" bind:value={totalLessons} />

		{#if editTarget}
			<Input type="number" label="잔여 수업횟수" bind:value={remainingLessons} />

			<div class="create-form__field">
				<label class="create-form__label" for="pass-status">상태</label>
				<select id="pass-status" class="create-form__select" bind:value={selectedStatus}>
					<option value="ACTIVE">이용중</option>
					<option value="HOLDING">홀딩</option>
					<option value="EXPIRED">만료</option>
					<option value="USED_UP">소진</option>
				</select>
			</div>
		{/if}

		{#if error}
			<p class="create-form__error">{error}</p>
		{/if}

		<div class="create-form__actions">
			<Button type="submit" fullWidth loading={submitting}>
				{editTarget ? '수정하기' : '부여하기'}
			</Button>
			<Button variant="secondary" fullWidth onclick={() => (showFormModal = false)}>취소</Button>
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
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-md);
		}

		&__link {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			text-decoration: underline;
			transition: opacity var(--transition-fast);

			&:active {
				opacity: 0.6;
			}
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
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__ticket-badge {
			padding: 2px 6px;
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-warning);
			background: var(--color-warning-bg);
			border-radius: var(--radius-full);
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

		&__actions {
			display: flex;
			justify-content: flex-end;
			margin-top: var(--space-sm);
			padding-top: var(--space-sm);
			border-top: 1px solid var(--color-divider);
		}
	}

	.action-btn {
		font-size: var(--font-size-sm);
		color: var(--color-primary);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);

		&:hover {
			background: var(--color-primary-bg);
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

		&__info {
			font-size: var(--font-size-sm);
			color: var(--color-warning);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-warning-bg);
			border-radius: var(--radius-sm);
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
