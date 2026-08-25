<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getMemberPasses,
		createMemberPass,
		updateMemberPass,
		deleteMemberPass,
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
	import {
		getPassStatusVariant,
		getPassStatusLabel,
		getTicketValue,
		isExpireTransition,
		getPassCategoryLabel,
		getPendingCount,
		getRemainingHoldDays
	} from '$lib/utils/pass';
	import type { MemberPass, PassType, Instructor } from '$lib/types/member';
	import { getSubscriptionPlans } from '$lib/api/subscription';
	import InstallmentScheduleEditor from '$lib/components/subscription/InstallmentScheduleEditor.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import { buildDueDates, calcInstallmentAmounts, validateDueDates } from '$lib/utils/subscription';
	import type { SubscriptionPlan } from '$lib/types/subscription';
	import { onMount, untrack } from 'svelte';

	let passes = $state<MemberPass[]>([]);
	let passTypes = $state<PassType[]>([]);
	let instructors = $state<Instructor[]>([]);
	let loading = $state(true);

	// Form modal
	let showFormModal = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let editTarget = $state<MemberPass | null>(null);

	// Delete modal
	let showDeleteModal = $state(false);
	let deleteTarget = $state<MemberPass | null>(null);
	let deleting = $state(false);

	// Expire confirm modal (EXPIRED 전환 시 예약 자동 취소 경고)
	let showExpireConfirmModal = $state(false);

	// Create form fields
	let selectedPassTypeId = $state('');
	let selectedInstructorId = $state('');

	// Shared form fields
	let startDate = $state('');
	let endDate = $state('');

	// 분할 납부 (부여 시에만, 원장 전용)
	let subscriptionPlans = $state<SubscriptionPlan[]>([]);
	let applySubscription = $state(false);
	let selectedPlanId = $state('');
	let dueDates = $state<string[]>([]);

	// Edit-only form fields
	let totalLessons = $state('');
	let remainingLessons = $state('');
	let selectedStatus = $state<MemberPass['status']>('ACTIVE');

	const memberId = $derived(Number(page.params.id));
	let formTitle = $derived(editTarget ? '수강권 수정' : '수강권 부여');
	let isAdmin = $derived(academyStore.memberRole === 'ADMIN');

	onMount(() => fetchData());

	async function fetchData() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const [passRes, typesRes, instrRes, plansRes] = await Promise.allSettled([
				getMemberPasses(academyId, memberId),
				getPassTypes(academyId),
				getInstructors(academyId),
				// 구독 아이템은 원장만 조회할 수 있다 — 강사는 실패해도 무시된다
				isAdmin ? getSubscriptionPlans(academyId) : Promise.resolve(null)
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
			if (plansRes.status === 'fulfilled' && plansRes.value?.status) {
				subscriptionPlans = plansRes.value.data ?? [];
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

	function addDays(dateStr: string, days: number): string {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- 포맷용 지역 변수
		const date = new Date(dateStr);
		date.setDate(date.getDate() + days);
		return date.toISOString().split('T')[0];
	}

	function calcEndDate(start: string, passTypeId: string): string {
		if (!start || !passTypeId) return '';
		const pt = passTypes.find((t) => String(t.id) === String(passTypeId));
		if (!pt || !pt.duration_days) return '';
		return addDays(start, pt.duration_days);
	}

	function openCreateModal() {
		editTarget = null;
		selectedPassTypeId = '';
		selectedInstructorId = '';
		startDate = new Date().toISOString().split('T')[0];
		endDate = '';
		applySubscription = false;
		selectedPlanId = '';
		dueDates = [];
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
		endDate = calcEndDate(startDate, selectedPassTypeId);
	}

	$effect(() => {
		if (!editTarget && selectedPassTypeId && startDate) {
			endDate = calcEndDate(startDate, selectedPassTypeId);
		}
	});

	let selectedPassTypeTicketValue = $derived.by(() => {
		if (!selectedPassTypeId) return 1;
		const pt = passTypes.find((t) => String(t.id) === String(selectedPassTypeId));
		return pt?.ticket_value ?? 1;
	});

	// 부여 시점의 설정값이 수강권에 스냅샷되므로 미리 안내한다
	let selectedPassTypeHoldDays = $derived.by(() => {
		if (!selectedPassTypeId) return 0;
		const pt = passTypes.find((t) => String(t.id) === String(selectedPassTypeId));
		return pt?.hold_days ?? 0;
	});

	let selectedPlan = $derived(
		subscriptionPlans.find((p) => String(p.id) === String(selectedPlanId)) ?? null
	);

	// 아이템과 시작일이 정해지면 1회차를 시작일 당일로 두고 매월 같은 날로 자동 생성한다.
	// 생성 후 각 회차 날짜는 개별 수정 가능하다.
	$effect(() => {
		if (!applySubscription || !selectedPlan || !startDate) return;
		const count = selectedPlan.installment_count;
		const anchor = startDate;
		untrack(() => {
			dueDates = buildDueDates(anchor, count);
		});
	});

	let installmentAmounts = $derived(
		selectedPlan
			? calcInstallmentAmounts({
					total_amount: selectedPlan.total_amount,
					installment_count: selectedPlan.installment_count,
					monthly_amount: selectedPlan.monthly_amount
				})
			: []
	);

	let subscriptionError = $derived.by(() => {
		if (!applySubscription) return '';
		if (!selectedPlan) return '구독 아이템을 선택해주세요.';
		return validateDueDates(dueDates, selectedPlan.installment_count) ?? '';
	});

	function confirmDelete(pass: MemberPass) {
		deleteTarget = pass;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (deleting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		deleting = true;
		try {
			const res = await deleteMemberPass(academyId, memberId, deleteTarget.id);
			if (res.status) {
				toastStore.success(res.message || '수강권이 삭제되었습니다.');
				showDeleteModal = false;
				deleteTarget = null;
				await fetchPasses();
			} else {
				toastStore.error(res.message || '수강권 삭제에 실패했습니다.');
			}
		} catch {
			// handled by client.ts
		} finally {
			deleting = false;
		}
	}

	async function submitEdit() {
		if (submitting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !editTarget) return;

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
				toastStore.success(res.message || '수강권이 수정되었습니다.');
				showFormModal = false;
				await fetchPasses();
			} else {
				toastStore.error(res.message || '수강권 수정에 실패했습니다.');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '수강권 수정에 실패했습니다.';
		} finally {
			submitting = false;
		}
	}

	async function handleSubmit() {
		error = '';
		const academyId = academyStore.academyId;
		if (!academyId) return;

		if (editTarget) {
			if (!startDate || !endDate || !totalLessons || !remainingLessons) {
				error = '모든 항목을 입력해주세요.';
				return;
			}

			// 만료 전환은 미처리 예약 자동 취소를 동반하므로 확인 후 진행
			if (isExpireTransition(editTarget.status, selectedStatus)) {
				showExpireConfirmModal = true;
				return;
			}

			await submitEdit();
		} else {
			if (!selectedPassTypeId || !selectedInstructorId || !startDate || !endDate) {
				error = '모든 항목을 입력해주세요.';
				return;
			}

			if (applySubscription && subscriptionError) {
				error = subscriptionError;
				return;
			}

			submitting = true;
			try {
				const res = await createMemberPass(academyId, memberId, {
					pass_type_id: Number(selectedPassTypeId),
					instructor_id: Number(selectedInstructorId),
					start_date: startDate,
					end_date: endDate,
					// 회차 금액은 서버가 계산한다 — 어떤 아이템을 언제 낼지만 보낸다
					...(applySubscription && selectedPlan
						? { subscription: { plan_id: selectedPlan.id, due_dates: dueDates } }
						: {})
				});
				if (res.status) {
					toastStore.success(res.message || '수강권이 부여되었습니다.');
					showFormModal = false;
					await fetchPasses();
				} else {
					error = res.message || '수강권 부여에 실패했습니다.';
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
										<span class="pass-item__ticket-badge"
											>{getTicketValue(pass.ticket_value)}회 차감</span
										>
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
								<span class="pass-item__progress-text">
									잔여 {pass.remaining_lessons}/{pass.total_lessons}회
									{#if getPendingCount(pass) > 0}
										<span class="pass-item__pending">(예약중 {getPendingCount(pass)}회)</span>
									{/if}
								</span>
							</div>
							<div class="pass-item__body">
								<span>{pass.instructor_name} 선생님</span>
								<span class="pass-item__date"
									>{formatDate(pass.start_date)} ~ {formatDate(pass.end_date)}</span
								>
							</div>
							{#if (pass.hold_days ?? 0) > 0}
								<div class="pass-item__hold">
									홀딩 {pass.hold_used_days ?? 0}/{pass.hold_days}일 사용 (잔여 {getRemainingHoldDays(
										pass
									)}일)
								</div>
							{/if}
							{#if pass.subscription_id}
								<button
									type="button"
									class="pass-item__subscription"
									onclick={() => goto(`/admin/subscriptions/${pass.subscription_id}`)}
								>
									<span class="pass-item__subscription-label">
										분납 {(pass.subscription_installment_count ?? 0) -
											(pass.subscription_unpaid_count ?? 0)}/{pass.subscription_installment_count}회
										납부
									</span>
									{#if (pass.subscription_unpaid_count ?? 0) > 0}
										<span class="pass-item__subscription-unpaid">
											미납 {formatCurrency(pass.subscription_remaining_total ?? 0)}
										</span>
									{:else}
										<span class="pass-item__subscription-done">완납</span>
									{/if}
								</button>
							{/if}
							<div class="pass-item__actions">
								<button class="action-btn" onclick={() => openEditModal(pass)}>수정</button>
								{#if isAdmin}
									<button class="action-btn action-btn--danger" onclick={() => confirmDelete(pass)}>
										삭제
									</button>
								{/if}
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
					{#each passTypes as pt (pt.id)}
						<option value={pt.id}>
							{pt.pass_name} ({getPassCategoryLabel(pt.pass_category)}){pt.ticket_value > 1
								? ` [${pt.ticket_value}회 차감]`
								: ''}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedPassTypeTicketValue > 1}
				<p class="create-form__info">
					이 수강권은 예약 시 {selectedPassTypeTicketValue}회씩 차감됩니다.
				</p>
			{/if}

			{#if selectedPassTypeHoldDays > 0}
				<p class="create-form__info">홀딩 {selectedPassTypeHoldDays}일이 함께 부여됩니다.</p>
			{/if}

			<div class="create-form__field">
				<label class="create-form__label" for="instructor">담당 강사</label>
				<select id="instructor" class="create-form__select" bind:value={selectedInstructorId}>
					<option value="">선택하세요</option>
					{#each instructors as instr (instr.member_id)}
						<option value={instr.instructor_id ?? instr.id}
							>{instr.user_name} ({instr.specialties})</option
						>
					{/each}
				</select>
			</div>
		{/if}

		<Input type="date" label="시작일" bind:value={startDate} />

		<Input type="date" label="종료일" bind:value={endDate} />

		{#if !editTarget && isAdmin}
			<div class="subscription-section">
				<label class="subscription-section__toggle">
					<input type="checkbox" bind:checked={applySubscription} />
					<span>수강료를 나눠서 받기</span>
				</label>

				{#if applySubscription}
					{#if subscriptionPlans.length === 0}
						<p class="create-form__info">
							등록된 구독 아이템이 없습니다. 먼저 구독 아이템을 추가해주세요.
						</p>
						<button
							type="button"
							class="passes-page__link"
							onclick={() => goto('/admin/subscription-plans')}
						>
							구독 아이템 관리로 이동
						</button>
					{:else}
						<div class="create-form__field">
							<label class="create-form__label" for="subscription-plan">구독 아이템</label>
							<select
								id="subscription-plan"
								class="create-form__select"
								bind:value={selectedPlanId}
							>
								<option value="">선택하세요</option>
								{#each subscriptionPlans as plan (plan.id)}
									<option value={plan.id}>
										{plan.plan_name} ({formatCurrency(plan.total_amount)} / {plan.installment_count}회)
									</option>
								{/each}
							</select>
						</div>

						{#if selectedPlan}
							<p class="create-form__info">
								{#if selectedPlan.installment_count > 1}
									{selectedPlan.installment_count - 1}회는 {formatCurrency(
										selectedPlan.monthly_amount
									)}씩, 마지막 회차에 나머지 {formatCurrency(selectedPlan.final_amount)}을 냅니다.
								{:else}
									1회에 {formatCurrency(selectedPlan.total_amount)}을 냅니다.
								{/if}
							</p>

							<InstallmentScheduleEditor
								bind:dueDates
								amounts={installmentAmounts}
								error={subscriptionError}
							/>
						{/if}
					{/if}
				{/if}
			</div>
		{/if}

		{#if editTarget}
			<Input type="number" label="총 수업횟수" bind:value={totalLessons} />
		{/if}

		{#if editTarget}
			<Input type="number" label="잔여 수업횟수" bind:value={remainingLessons} />

			<div class="create-form__field">
				<label class="create-form__label" for="pass-status">상태</label>
				<select id="pass-status" class="create-form__select" bind:value={selectedStatus}>
					<option value="ACTIVE">이용중</option>
					<option value="HOLDING">홀딩</option>
					<option value="EXPIRED">만료</option>
					<option value="USED_UP">소진</option>
					<option value="REFUNDED">환불</option>
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

<Modal isOpen={showDeleteModal} title="수강권 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">
		"{deleteTarget?.pass_name}" 수강권을 삭제하시겠습니까? 오늘 이후 예정된 미처리 예약이 있는 경우
		자동 취소됩니다.
	</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete} loading={deleting}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<Modal
	isOpen={showExpireConfirmModal}
	title="수강권 만료 처리"
	onclose={() => (showExpireConfirmModal = false)}
>
	<p class="modal-message">
		"{editTarget?.pass_name}" 수강권을 만료 처리하시겠습니까? 오늘 이후 예정된 미처리 예약이 자동
		취소되며, 지난 예약은 그대로 유지됩니다.
	</p>
	<div class="modal-actions">
		<Button
			variant="danger"
			fullWidth
			loading={submitting}
			onclick={async () => {
				await submitEdit();
				showExpireConfirmModal = false;
			}}
		>
			만료 처리
		</Button>
		<Button variant="secondary" fullWidth onclick={() => (showExpireConfirmModal = false)}>
			취소
		</Button>
	</div>
</Modal>

<style lang="scss">
	.subscription-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg);
		border-radius: var(--radius-md);

		&__toggle {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			cursor: pointer;

			input {
				width: 18px;
				height: 18px;
				accent-color: var(--color-primary);
			}
		}
	}

	.pass-item__subscription {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		width: 100%;
		margin-top: var(--space-xs);
		padding: var(--space-sm);
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		font-family: inherit;
		font-size: var(--font-size-xs);
		cursor: pointer;

		&-label {
			color: var(--color-text-secondary);
		}

		&-unpaid {
			font-weight: var(--font-weight-semibold);
			color: var(--color-danger);
		}

		&-done {
			font-weight: var(--font-weight-semibold);
			color: var(--color-success);
		}
	}

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

		&__pending {
			color: var(--color-warning);
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

		&__hold {
			margin-top: var(--space-xs);
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-xs);
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

		&--danger {
			color: var(--color-danger);

			&:hover {
				background: var(--color-danger-bg);
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
