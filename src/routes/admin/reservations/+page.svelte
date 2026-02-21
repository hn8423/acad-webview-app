<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getLessonSlots,
		createLessonSlot,
		updateLessonSlot,
		deleteLessonSlot,
		updateReservationStatus
	} from '$lib/api/reservation';
	import { formatTimeRange, getTodayString } from '$lib/utils/format';
	import { getTicketValue } from '$lib/utils/pass';
	import type {
		LessonSlot,
		SlotStatus,
		SlotReservation,
		ReservationStatus,
		CreateSlotRequest,
		UpdateSlotRequest
	} from '$lib/types/reservation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import DateCalendar from '$lib/components/ui/DateCalendar.svelte';

	let selectedDate = $state(getTodayString());
	let slots = $state<LessonSlot[]>([]);
	let loading = $state(true);
	let actionLoading = $state(false);

	// Create slot modal
	let showCreateModal = $state(false);
	let createForm = $state<CreateSlotRequest>({
		slot_date: getTodayString(),
		start_time: '10:00',
		end_time: '10:50',
		max_capacity: 1
	});

	// Edit slot modal
	let showEditModal = $state(false);
	let editTarget = $state<LessonSlot | null>(null);
	let editForm = $state<UpdateSlotRequest>({});

	// Delete slot modal
	let showDeleteModal = $state(false);
	let deleteTarget = $state<LessonSlot | null>(null);

	// Reservation status confirmation modal
	let showStatusConfirmModal = $state(false);
	let statusConfirmTarget = $state<{
		reservationId: number;
		memberName: string;
		passName: string;
		ticketValue: number;
		currentStatus: ReservationStatus;
		newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
	} | null>(null);

	async function fetchSlots(date: string) {
		const academyId = academyStore.academyId;
		if (!academyId) return;
		loading = true;
		try {
			const res = await getLessonSlots(academyId, date);
			if (res.status) {
				slots = res.data;
			}
		} catch (error) {
			toastStore.error('슬롯 목록을 불러올 수 없습니다');
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchSlots(selectedDate);
	});

	// Slot CRUD handlers

	function openCreateModal() {
		if (academyStore.isAdmin) {
			toastStore.error('관리자는 강의를 열 수 없습니다');
			return;
		}
		createForm = {
			slot_date: selectedDate,
			start_time: '10:00',
			end_time: '10:50',
			max_capacity: 1
		};
		showCreateModal = true;
	}

	async function handleCreateSlot() {
		const academyId = academyStore.academyId;
		if (!academyId) return;
		actionLoading = true;
		try {
			const res = await createLessonSlot(academyId, createForm);
			if (res.status) {
				toastStore.success('수업 슬롯이 생성되었습니다');
				showCreateModal = false;
				await fetchSlots(selectedDate);
			}
		} catch (error) {
			toastStore.error('슬롯 생성에 실패했습니다');
		} finally {
			actionLoading = false;
		}
	}

	function openEditModal(slot: LessonSlot) {
		editTarget = slot;
		editForm = {
			start_time: slot.start_time,
			end_time: slot.end_time,
			max_capacity: slot.max_capacity,
			status: slot.status
		};
		showEditModal = true;
	}

	async function handleEditSlot() {
		const academyId = academyStore.academyId;
		if (!academyId || !editTarget) return;
		actionLoading = true;
		try {
			const res = await updateLessonSlot(academyId, editTarget.id, editForm);
			if (res.status) {
				toastStore.success('슬롯이 수정되었습니다');
				showEditModal = false;
				editTarget = null;
				await fetchSlots(selectedDate);
			}
		} catch (error) {
			toastStore.error('슬롯 수정에 실패했습니다');
		} finally {
			actionLoading = false;
		}
	}

	function openDeleteModal(slot: LessonSlot) {
		deleteTarget = slot;
		showDeleteModal = true;
	}

	async function handleDeleteSlot() {
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;
		actionLoading = true;
		try {
			const res = await deleteLessonSlot(academyId, deleteTarget.id);
			if (res.status) {
				toastStore.success('슬롯이 삭제되었습니다');
				showDeleteModal = false;
				deleteTarget = null;
				await fetchSlots(selectedDate);
			}
		} catch (error) {
			toastStore.error('슬롯 삭제에 실패했습니다');
		} finally {
			actionLoading = false;
		}
	}

	// Reservation status handlers

	function openStatusConfirm(
		rv: SlotReservation,
		newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
	) {
		statusConfirmTarget = {
			reservationId: rv.reservation_id,
			memberName: rv.member_name,
			passName: rv.pass_name ?? '',
			ticketValue: getTicketValue(rv.ticket_value),
			currentStatus: rv.status,
			newStatus
		};
		showStatusConfirmModal = true;
	}

	async function handleConfirmStatusChange() {
		if (!statusConfirmTarget) return;
		await handleReservationStatus(statusConfirmTarget.reservationId, statusConfirmTarget.newStatus);
		showStatusConfirmModal = false;
		statusConfirmTarget = null;
	}

	async function handleReservationStatus(reservationId: number, status: ReservationStatus) {
		const academyId = academyStore.academyId;
		if (!academyId || status === 'PENDING') return;
		actionLoading = true;
		try {
			const res = await updateReservationStatus(academyId, reservationId, {
				status: status as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
			});
			if (res.status) {
				toastStore.success(`예약이 ${getStatusLabel(status)} 처리되었습니다`);
				await fetchSlots(selectedDate);
			}
		} catch (error) {
			toastStore.error('예약 상태 변경에 실패했습니다');
		} finally {
			actionLoading = false;
		}
	}

	// Helpers

	function getStatusLabel(status: ReservationStatus | SlotStatus): string {
		const labels: Record<string, string> = {
			PENDING: '대기',
			CONFIRMED: '승인',
			COMPLETED: '완료',
			NO_SHOW: '노쇼',
			CANCELLED: '취소',
			OPEN: '오픈',
			CLOSED: '마감'
		};
		return labels[status] ?? status;
	}

	function getReservationBadgeVariant(
		status: ReservationStatus
	): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
		const map: Record<ReservationStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
			PENDING: 'warning',
			CONFIRMED: 'info',
			COMPLETED: 'success',
			NO_SHOW: 'danger',
			CANCELLED: 'neutral'
		};
		return map[status];
	}

	function getSlotBadgeVariant(
		status: SlotStatus
	): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
		const map: Record<SlotStatus, 'success' | 'danger' | 'neutral'> = {
			OPEN: 'success',
			CLOSED: 'neutral',
			CANCELLED: 'danger'
		};
		return map[status];
	}
</script>

<div class="reservations">
	<div class="reservations__header">
		<h1 class="reservations__title">예약 관리</h1>
		<Button size="sm" onclick={openCreateModal}>+ 슬롯 추가</Button>
	</div>

	<DateCalendar {selectedDate} onselect={(date) => (selectedDate = date)} />

	{#if loading}
		<div class="reservations__loading"><Spinner /></div>
	{:else if slots.length === 0}
		<div class="reservations__empty">
			<p class="reservations__empty-text">이 날짜에 등록된 수업 슬롯이 없습니다.</p>
		</div>
	{:else}
		<div class="slot-list">
			{#each slots as slot (slot.id)}
				<div class="slot-card">
					<div class="slot-card__header">
						<div class="slot-card__info">
							<span class="slot-card__time">
								{formatTimeRange(slot.start_time, slot.end_time)}
							</span>
							<span class="slot-card__instructor">{slot.instructor_name}</span>
						</div>
						<div class="slot-card__meta">
							<span class="slot-card__capacity">
								예약 {slot.current_count}/{slot.max_capacity}
							</span>
							<Badge variant={getSlotBadgeVariant(slot.status)}>
								{getStatusLabel(slot.status)}
							</Badge>
						</div>
					</div>

					{#if slot.reservations.length > 0}
						<div class="slot-card__reservations">
							{#each slot.reservations as rv (rv.reservation_id)}
								<div class="reservation-row">
									<div class="reservation-row__info">
										<span class="reservation-row__name">{rv.member_name}</span>
										{#if rv.pass_name}
											<span class="reservation-row__pass">{rv.pass_name}</span>
										{/if}
										{#if getTicketValue(rv.ticket_value) > 1}
											<Badge variant="warning">{getTicketValue(rv.ticket_value)}회 차감</Badge>
										{/if}
										<Badge variant={getReservationBadgeVariant(rv.status)}>
											{getStatusLabel(rv.status)}
										</Badge>
									</div>
									<div class="reservation-row__actions">
										{#if rv.status === 'PENDING'}
											<button
												class="action-btn action-btn--confirm"
												disabled={actionLoading}
												onclick={() => openStatusConfirm(rv, 'CONFIRMED')}
											>
												승인
											</button>
											<button
												class="action-btn action-btn--cancel"
												disabled={actionLoading}
												onclick={() => openStatusConfirm(rv, 'CANCELLED')}
											>
												취소
											</button>
										{:else if rv.status === 'CONFIRMED'}
											<button
												class="action-btn action-btn--complete"
												disabled={actionLoading}
												onclick={() => openStatusConfirm(rv, 'COMPLETED')}
											>
												완료
											</button>
											<button
												class="action-btn action-btn--noshow"
												disabled={actionLoading}
												onclick={() => openStatusConfirm(rv, 'NO_SHOW')}
											>
												노쇼
											</button>
											<button
												class="action-btn action-btn--cancel"
												disabled={actionLoading}
												onclick={() => openStatusConfirm(rv, 'CANCELLED')}
											>
												취소
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="slot-card__no-reservations">예약 없음</p>
					{/if}

					<div class="slot-card__footer">
						<button class="slot-action-btn" onclick={() => openEditModal(slot)}>수정</button>
						<button
							class="slot-action-btn slot-action-btn--danger"
							onclick={() => openDeleteModal(slot)}
						>
							삭제
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Slot Modal -->
<Modal
	isOpen={showCreateModal}
	title="수업 슬롯 추가"
	position="center"
	onclose={() => (showCreateModal = false)}
>
	<div class="modal-form">
		<div class="modal-form__field">
			<span class="modal-form__label">날짜</span>
			<span class="modal-form__value">{createForm.slot_date}</span>
		</div>
		<div class="modal-form__row">
			<label class="modal-form__field">
				<span class="modal-form__label">시작 시간</span>
				<input type="time" class="modal-form__input" bind:value={createForm.start_time} />
			</label>
			<label class="modal-form__field">
				<span class="modal-form__label">종료 시간</span>
				<input type="time" class="modal-form__input" bind:value={createForm.end_time} />
			</label>
		</div>
		<label class="modal-form__field">
			<span class="modal-form__label">최대 인원</span>
			<input type="number" class="modal-form__input" min="1" bind:value={createForm.max_capacity} />
		</label>
		<div class="modal-form__actions">
			<Button fullWidth loading={actionLoading} onclick={handleCreateSlot}>생성</Button>
			<Button variant="secondary" fullWidth onclick={() => (showCreateModal = false)}>취소</Button>
		</div>
	</div>
</Modal>

<!-- Edit Slot Modal -->
<Modal
	isOpen={showEditModal}
	title="슬롯 수정"
	position="center"
	onclose={() => (showEditModal = false)}
>
	<div class="modal-form">
		<div class="modal-form__row">
			<label class="modal-form__field">
				<span class="modal-form__label">시작 시간</span>
				<input type="time" class="modal-form__input" bind:value={editForm.start_time} />
			</label>
			<label class="modal-form__field">
				<span class="modal-form__label">종료 시간</span>
				<input type="time" class="modal-form__input" bind:value={editForm.end_time} />
			</label>
		</div>
		<label class="modal-form__field">
			<span class="modal-form__label">최대 인원</span>
			<input type="number" class="modal-form__input" min="1" bind:value={editForm.max_capacity} />
		</label>
		<label class="modal-form__field">
			<span class="modal-form__label">상태</span>
			<select class="modal-form__input" bind:value={editForm.status}>
				<option value="OPEN">오픈</option>
				<option value="CLOSED">마감</option>
				<option value="CANCELLED">취소</option>
			</select>
		</label>
		<div class="modal-form__actions">
			<Button fullWidth loading={actionLoading} onclick={handleEditSlot}>저장</Button>
			<Button variant="secondary" fullWidth onclick={() => (showEditModal = false)}>취소</Button>
		</div>
	</div>
</Modal>

<!-- Delete Slot Confirmation Modal -->
<Modal
	isOpen={showDeleteModal}
	title="슬롯 삭제"
	position="center"
	onclose={() => (showDeleteModal = false)}
>
	<p class="modal-message">
		{#if deleteTarget}
			{formatTimeRange(deleteTarget.start_time, deleteTarget.end_time)} ({deleteTarget.instructor_name})
			슬롯을 삭제하시겠습니까?
		{/if}
	</p>
	{#if deleteTarget && deleteTarget.current_count > 0}
		<p class="modal-warning">활성 예약이 있는 슬롯은 삭제할 수 없습니다.</p>
	{/if}
	<div class="modal-form__actions">
		<Button
			variant="danger"
			fullWidth
			loading={actionLoading}
			disabled={deleteTarget !== null && deleteTarget.current_count > 0}
			onclick={handleDeleteSlot}
		>
			삭제
		</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<!-- Reservation Status Confirmation Modal -->
<Modal
	isOpen={showStatusConfirmModal}
	title="예약 상태 변경"
	position="center"
	onclose={() => {
		showStatusConfirmModal = false;
		statusConfirmTarget = null;
	}}
>
	{#if statusConfirmTarget}
		<div class="status-confirm">
			<p class="status-confirm__message">
				<strong>{statusConfirmTarget.memberName}</strong>님의 예약을
				<strong>{getStatusLabel(statusConfirmTarget.newStatus)}</strong> 처리하시겠습니까?
			</p>
			{#if statusConfirmTarget.passName}
				<div class="status-confirm__detail">
					수강권: {statusConfirmTarget.passName}
				</div>
			{/if}
			{#if statusConfirmTarget.ticketValue > 1}
				<div class="status-confirm__ticket-info">
					{#if statusConfirmTarget.newStatus === 'COMPLETED'}
						{statusConfirmTarget.ticketValue}회가 차감됩니다.
					{:else if statusConfirmTarget.newStatus === 'NO_SHOW'}
						{statusConfirmTarget.ticketValue}회가 차감됩니다. (노쇼)
					{:else if statusConfirmTarget.newStatus === 'CANCELLED' && (statusConfirmTarget.currentStatus === 'COMPLETED' || statusConfirmTarget.currentStatus === 'NO_SHOW')}
						{statusConfirmTarget.ticketValue}회가 환불됩니다.
					{/if}
				</div>
			{/if}
			<div class="status-confirm__actions">
				<Button
					fullWidth
					loading={actionLoading}
					variant={statusConfirmTarget.newStatus === 'CANCELLED' || statusConfirmTarget.newStatus === 'NO_SHOW' ? 'danger' : 'primary'}
					onclick={handleConfirmStatusChange}
				>
					{getStatusLabel(statusConfirmTarget.newStatus)} 처리
				</Button>
				<Button
					variant="secondary"
					fullWidth
					onclick={() => {
						showStatusConfirmModal = false;
						statusConfirmTarget = null;
					}}
				>
					닫기
				</Button>
			</div>
		</div>
	{/if}
</Modal>

<style lang="scss">
	.reservations {
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
			align-items: center;
			justify-content: center;
			min-height: 300px;
		}

		&__empty {
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 200px;
			background: var(--color-white);
			border-radius: var(--radius-lg);
			box-shadow: var(--shadow-card);
		}

		&__empty-text {
			font-size: var(--font-size-base);
			color: var(--color-text-secondary);
		}
	}

	.slot-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.slot-card {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: hidden;

		&__header {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			padding: var(--space-md) var(--space-lg);
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__time {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__instructor {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__meta {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__capacity {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__reservations {
			border-top: 1px solid var(--color-divider);
			padding: var(--space-sm) var(--space-lg);
		}

		&__no-reservations {
			padding: var(--space-sm) var(--space-lg);
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			border-top: 1px solid var(--color-divider);
		}

		&__footer {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-sm);
			padding: var(--space-sm) var(--space-lg);
			border-top: 1px solid var(--color-divider);
		}
	}

	.reservation-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) 0;

		& + & {
			border-top: 1px solid var(--color-divider);
		}

		&__info {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__name {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__pass {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__actions {
			display: flex;
			gap: var(--space-xs);
		}
	}

	.action-btn {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		transition:
			background-color var(--transition-fast),
			opacity var(--transition-fast);

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&--confirm {
			background-color: var(--color-primary-bg);
			color: var(--color-primary);
		}

		&--complete {
			background-color: var(--color-success-bg);
			color: var(--color-success);
		}

		&--noshow {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);
		}

		&--cancel {
			background-color: var(--color-bg);
			color: var(--color-text-secondary);
		}
	}

	.slot-action-btn {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-bg);
		}

		&--danger {
			color: var(--color-danger);

			&:hover {
				background-color: var(--color-danger-bg);
			}
		}
	}

	// Modal form styles
	.modal-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			flex: 1;
		}

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__input {
			width: 100%;
			padding: 14px 16px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			background: var(--color-white);
			transition:
				border-color var(--transition-fast),
				box-shadow var(--transition-fast);

			&:focus {
				outline: none;
				border-color: var(--color-primary-light);
				box-shadow: 0 0 0 2px var(--color-primary-bg);
			}
		}

		&__value {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
			padding: 14px 16px;
			background: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__row {
			display: flex;
			gap: var(--space-md);
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-sm);
		}
	}

	.modal-message {
		font-size: var(--font-size-base);
		color: var(--color-text);
		margin-bottom: var(--space-md);
		line-height: var(--line-height-base);
	}

	.modal-warning {
		font-size: var(--font-size-sm);
		color: var(--color-danger);
		margin-bottom: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-danger-bg);
		border-radius: var(--radius-sm);
	}

	.status-confirm {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__message {
			font-size: var(--font-size-base);
			color: var(--color-text);
			line-height: var(--line-height-base);

			:global(strong) {
				font-weight: var(--font-weight-semibold);
			}
		}

		&__detail {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-sm);
		}

		&__ticket-info {
			font-size: var(--font-size-sm);
			color: var(--color-warning);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-warning-bg);
			border-radius: var(--radius-sm);
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-sm);
		}
	}
</style>
