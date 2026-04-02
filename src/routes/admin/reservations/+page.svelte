<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getLessonSlots,
		createLessonSlot,
		createBulkLessonSlots,
		updateLessonSlot,
		deleteLessonSlot,
		updateReservationStatus
	} from '$lib/api/reservation';
	import { getInstructors } from '$lib/api/member';
	import type { Instructor } from '$lib/types/member';
	import { formatTimeRange, getTodayString, getDaysInMonth } from '$lib/utils/format';
	import {
		getTicketValue,
		getCapacityWeight,
		getReservationWeight,
		isActiveReservationStatus
	} from '$lib/utils/pass';
	import { buildDateIndicators, countSlotDates, formatDayLabels } from '$lib/utils/reservation';
	import type {
		LessonSlot,
		SlotStatus,
		SlotReservation,
		SlotType,
		ReservationStatus,
		CreateSlotRequest,
		BulkCreateSlotRequest,
		UpdateSlotRequest,
		DateIndicators
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

	// Instructor list for admin slot creation
	let instructors = $state<Instructor[]>([]);

	// Date indicators for calendar lesson status shapes
	let dateIndicators = $state<Map<string, DateIndicators>>(new Map());
	const dateIndicatorsCache = new Map<string, Map<string, DateIndicators>>();

	// Create slot modal
	let showCreateModal = $state(false);
	let createMode = $state<'single' | 'bulk'>('single');
	let createForm = $state<CreateSlotRequest>({
		slot_date: getTodayString(),
		start_time: '10:00',
		end_time: '11:00',
		max_capacity: 2,
		slot_type: 'REGULAR'
	});

	// Bulk create form
	function getDefaultEndDate(startDate: string): string {
		const d = new Date(startDate);
		d.setMonth(d.getMonth() + 3);
		return d.toISOString().split('T')[0];
	}

	let bulkForm = $state<BulkCreateSlotRequest>({
		start_date: getTodayString(),
		end_date: getDefaultEndDate(getTodayString()),
		days_of_week: [],
		start_time: '10:00',
		end_time: '11:00',
		max_capacity: 2,
		slot_type: 'REGULAR'
	});

	let bulkSlotCount = $derived(
		countSlotDates(bulkForm.start_date, bulkForm.end_date, bulkForm.days_of_week)
	);

	const DAY_OPTIONS = [
		{ value: 1, label: '월' },
		{ value: 2, label: '화' },
		{ value: 3, label: '수' },
		{ value: 4, label: '목' },
		{ value: 5, label: '금' },
		{ value: 6, label: '토' },
		{ value: 0, label: '일' }
	] as const;

	function toggleDay(day: number) {
		const idx = bulkForm.days_of_week.indexOf(day);
		bulkForm = {
			...bulkForm,
			days_of_week:
				idx >= 0
					? bulkForm.days_of_week.filter((d) => d !== day)
					: [...bulkForm.days_of_week, day]
		};
	}

	function handleBulkSlotTypeChange(type: SlotType) {
		const hours = type === 'ENSEMBLE' ? 2 : 1;
		const [h, m] = bulkForm.start_time.split(':').map(Number);
		const endH = String(Math.min(h + hours, 23)).padStart(2, '0');
		const endTime = `${endH}:${String(m).padStart(2, '0')}`;
		if (type === 'ENSEMBLE') {
			const { max_capacity: _, ...rest } = bulkForm;
			bulkForm = { ...rest, slot_type: type, min_capacity: 4, end_time: endTime };
		} else {
			const { min_capacity: _, ...rest } = bulkForm;
			bulkForm = { ...rest, slot_type: type, max_capacity: 2, end_time: endTime };
		}
	}

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
		passCategory?: string;
		ticketValue: number;
		capacityWeight: number;
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

	// Fetch date indicators for calendar lesson status shapes
	let indicatorRequestId = 0;

	async function fetchDateIndicators(year: number, month: number) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
		const cached = dateIndicatorsCache.get(cacheKey);
		if (cached) {
			dateIndicators = cached;
			return;
		}

		const daysInMonth = getDaysInMonth(year, month);

		const datesToFetch: string[] = [];
		for (let d = 1; d <= daysInMonth; d++) {
			datesToFetch.push(
				`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
			);
		}

		const requestId = ++indicatorRequestId;

		try {
			const BATCH_SIZE = 5;
			const slotsByDate = new Map<string, LessonSlot[]>();

			for (let i = 0; i < datesToFetch.length; i += BATCH_SIZE) {
				if (requestId !== indicatorRequestId) return;
				const batch = datesToFetch.slice(i, i + BATCH_SIZE);
				const results = await Promise.allSettled(
					batch.map((date) => getLessonSlots(academyId, date))
				);
				results.forEach((result, idx) => {
					if (result.status === 'fulfilled' && result.value.status) {
						slotsByDate.set(batch[idx], result.value.data);
					}
				});
			}

			if (requestId !== indicatorRequestId) return;

			const indicators = buildDateIndicators(slotsByDate);
			dateIndicators = indicators;
			dateIndicatorsCache.set(cacheKey, indicators);
		} catch {
			// Indicators are non-critical; silently fail
		}
	}

	function invalidateMonthCache(date: string) {
		const cacheKey = date.substring(0, 7);
		dateIndicatorsCache.delete(cacheKey);
		const [y, m] = cacheKey.split('-').map(Number);
		fetchDateIndicators(y, m);
	}

	function handleMonthChange(year: number, month: number) {
		fetchDateIndicators(year, month);
	}

	onMount(async () => {
		const now = new Date();
		fetchDateIndicators(now.getFullYear(), now.getMonth() + 1);

		if (academyStore.isAdmin) {
			const academyId = academyStore.academyId;
			if (!academyId) return;
			try {
				const res = await getInstructors(academyId);
				if (res.status) {
					const data = res.data;
					instructors = Array.isArray(data) ? data : data.instructors;
				}
			} catch {
				// Non-critical; instructor list unavailable
			}
		}
	});

	// Slot CRUD handlers

	function getInstructorId(inst: Instructor): number {
		return inst.instructor_id ?? inst.id ?? inst.member_id;
	}

	function openCreateModal() {
		const firstInstructorId =
			academyStore.isAdmin && instructors.length > 0
				? getInstructorId(instructors[0])
				: undefined;
		createMode = 'single';
		createForm = {
			slot_date: selectedDate,
			start_time: '10:00',
			end_time: '11:00',
			max_capacity: 1,
			slot_type: 'REGULAR',
			instructor_id: firstInstructorId
		};
		bulkForm = {
			start_date: selectedDate,
			end_date: getDefaultEndDate(selectedDate),
			days_of_week: [],
			start_time: '10:00',
			end_time: '11:00',
			max_capacity: 2,
			slot_type: 'REGULAR',
			instructor_id: firstInstructorId
		};
		showCreateModal = true;
	}

	function handleSlotTypeChange(type: SlotType) {
		const hours = type === 'ENSEMBLE' ? 2 : 1;
		const [h, m] = createForm.start_time.split(':').map(Number);
		const endH = String(Math.min(h + hours, 23)).padStart(2, '0');
		const endTime = `${endH}:${String(m).padStart(2, '0')}`;
		if (type === 'ENSEMBLE') {
			const { max_capacity: _, ...rest } = createForm;
			createForm = { ...rest, slot_type: type, min_capacity: 4, end_time: endTime };
		} else {
			const { min_capacity: _, ...rest } = createForm;
			createForm = { ...rest, slot_type: type, max_capacity: 2, end_time: endTime };
		}
	}

	function getSlotLabel(slot: { slot_type: SlotType; instructor_name: string | null }): string {
		if (slot.slot_type === 'ENSEMBLE') return '합주 수업';
		return slot.instructor_name ?? '강사 미지정';
	}

	function canEditSlot(slot: LessonSlot): boolean {
		if (academyStore.isAdmin) return true;
		return slot.slot_type !== 'ENSEMBLE';
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
				invalidateMonthCache(selectedDate);
			}
		} catch (error) {
			toastStore.error('슬롯 생성에 실패했습니다');
		} finally {
			actionLoading = false;
		}
	}

	async function handleBulkCreateSlots() {
		const academyId = academyStore.academyId;
		if (!academyId || bulkForm.days_of_week.length === 0) return;
		actionLoading = true;
		try {
			const res = await createBulkLessonSlots(academyId, bulkForm);
			if (res.status) {
				const { created_count, skipped_count } = res.data;
				const msg =
					skipped_count > 0
						? `${created_count}개 슬롯 생성, ${skipped_count}개 스킵`
						: `${created_count}개 슬롯이 생성되었습니다`;
				toastStore.success(msg);
				showCreateModal = false;
				await fetchSlots(selectedDate);
				invalidateMonthCache(selectedDate);
			}
		} catch (error) {
			toastStore.error('일괄 슬롯 생성에 실패했습니다');
		} finally {
			actionLoading = false;
		}
	}

	function openEditModal(slot: LessonSlot) {
		editTarget = slot;
		editForm =
			slot.slot_type === 'ENSEMBLE'
				? {
						start_time: slot.start_time,
						end_time: slot.end_time,
						min_capacity: slot.min_capacity ?? slot.max_capacity,
						status: slot.status
					}
				: {
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
				invalidateMonthCache(selectedDate);
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
				invalidateMonthCache(selectedDate);
			}
		} catch (error) {
			toastStore.error('슬롯 삭제에 실패했습니다');
		} finally {
			actionLoading = false;
		}
	}

	// Reservation status handlers

	function computeWeightedCount(reservations: SlotReservation[]): number {
		return reservations
			.filter((rv) => isActiveReservationStatus(rv.status))
			.reduce((sum, rv) => sum + getReservationWeight(rv.pass_category, rv.ticket_value), 0);
	}

	function openStatusConfirm(
		rv: SlotReservation,
		newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
	) {
		statusConfirmTarget = {
			reservationId: rv.reservation_id,
			memberName: rv.member_name,
			passName: rv.pass_name ?? '',
			passCategory: rv.pass_category,
			ticketValue: getTicketValue(rv.ticket_value),
			capacityWeight: getReservationWeight(rv.pass_category, rv.ticket_value),
			currentStatus: rv.status,
			newStatus
		};
		showStatusConfirmModal = true;
	}

	async function handleConfirmStatusChange() {
		if (!statusConfirmTarget) return;

		if (statusConfirmTarget.newStatus === 'COMPLETED') {
			showStatusConfirmModal = false;
			const params = new URLSearchParams({
				reservation_id: String(statusConfirmTarget.reservationId),
				member_name: statusConfirmTarget.memberName
			});
			statusConfirmTarget = null;
			goto(`/admin/feedback/new-weekly?${params.toString()}`);
			return;
		}

		await handleReservationStatus(
			statusConfirmTarget.reservationId,
			statusConfirmTarget.newStatus
		);
		showStatusConfirmModal = false;
		statusConfirmTarget = null;
	}

	async function handleReservationStatus(
		reservationId: number,
		status: ReservationStatus
	) {
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
				invalidateMonthCache(selectedDate);
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

	<DateCalendar
		{selectedDate}
		{dateIndicators}
		onselect={(date) => (selectedDate = date)}
		onmonthchange={handleMonthChange}
	/>

	<div class="reservations__legend">
		<span class="reservations__legend-item">
			<span class="reservations__legend-circle"></span>
			확정
		</span>
		<span class="reservations__legend-item">
			<span class="reservations__legend-triangle"></span>
			신청
		</span>
		<span class="reservations__legend-item">
			<span class="reservations__legend-square"></span>
			열림
		</span>
	</div>

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
							<div class="slot-card__time-row">
								<span class="slot-card__time">
									{formatTimeRange(slot.start_time, slot.end_time)}
								</span>
								{#if slot.slot_type === 'ENSEMBLE'}
									<Badge variant="info">합주</Badge>
								{/if}
							</div>
							<span class="slot-card__instructor">{getSlotLabel(slot)}</span>
						</div>
						<div class="slot-card__meta">
							<span class="slot-card__capacity">
								예약 {computeWeightedCount(slot.reservations)}/{slot.max_capacity}
							</span>
							<Badge variant={getSlotBadgeVariant(slot.status)}>
								{getStatusLabel(slot.status)}
							</Badge>
						</div>
					</div>

					{#if slot.reservations.length > 0}
						<div class="slot-card__reservations">
							{#each slot.reservations as rv, i (rv.reservation_id)}
								<div class="reservation-row">
									<div class="reservation-row__info">
										<span class="reservation-row__number">{i + 1}</span>
										<span class="reservation-row__name">{rv.member_name}</span>
										{#if rv.pass_name}
											<span class="reservation-row__pass">{rv.pass_name}</span>
										{/if}
										{#if rv.pass_category === 'ROTATION'}
											<Badge variant="info">로테이션</Badge>
										{:else if rv.pass_category === 'FULL'}
											<Badge variant="warning">풀타임</Badge>
										{/if}
										{#if getReservationWeight(rv.pass_category, rv.ticket_value) !== 1}
											<span class="reservation-row__weight">{getReservationWeight(rv.pass_category, rv.ticket_value)}인원</span>
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

					{#if canEditSlot(slot)}
						<div class="slot-card__footer">
							<button class="slot-action-btn" onclick={() => openEditModal(slot)}>수정</button>
							<button class="slot-action-btn slot-action-btn--danger" onclick={() => openDeleteModal(slot)}>
								삭제
							</button>
						</div>
					{/if}
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
		<!-- Mode Toggle -->
		<div class="slot-type-toggle">
			<button
				type="button"
				class="slot-type-toggle__btn"
				class:slot-type-toggle__btn--active={createMode === 'single'}
				onclick={() => (createMode = 'single')}
			>
				단건 생성
			</button>
			<button
				type="button"
				class="slot-type-toggle__btn"
				class:slot-type-toggle__btn--active={createMode === 'bulk'}
				onclick={() => (createMode = 'bulk')}
			>
				반복 생성
			</button>
		</div>

		{#if createMode === 'single'}
			<!-- Single Create Form -->
			<div class="modal-form__field">
				<span class="modal-form__label">수업 유형</span>
				<div class="slot-type-toggle">
					<button
						type="button"
						class="slot-type-toggle__btn"
						class:slot-type-toggle__btn--active={createForm.slot_type !== 'ENSEMBLE'}
						onclick={() => handleSlotTypeChange('REGULAR')}
					>
						일반 수업
					</button>
					<button
						type="button"
						class="slot-type-toggle__btn"
						class:slot-type-toggle__btn--active={createForm.slot_type === 'ENSEMBLE'}
						onclick={() => handleSlotTypeChange('ENSEMBLE')}
					>
						합주 수업
					</button>
				</div>
			</div>
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
			{#if academyStore.isAdmin}
				<div class="modal-form__field">
					<span class="modal-form__label">담당 강사</span>
					{#if instructors.length === 0}
						<div class="modal-form__notice">
							강사가 없습니다. 강사를 추가해주세요.
						</div>
					{:else}
						<select class="modal-form__input" bind:value={createForm.instructor_id}>
							{#each instructors as inst}
								<option value={getInstructorId(inst)}>{inst.user_name}</option>
							{/each}
						</select>
					{/if}
				</div>
			{/if}
			<label class="modal-form__field">
				<span class="modal-form__label">{createForm.slot_type === 'ENSEMBLE' ? '최소 인원' : '최대 인원'}</span>
				{#if createForm.slot_type === 'ENSEMBLE'}
					<input type="number" class="modal-form__input" min="1" bind:value={createForm.min_capacity} />
				{:else}
					<input type="number" class="modal-form__input" min="1" bind:value={createForm.max_capacity} />
				{/if}
			</label>
			<div class="modal-form__actions">
				<Button
					fullWidth
					loading={actionLoading}
					disabled={academyStore.isAdmin && instructors.length === 0}
					onclick={handleCreateSlot}
				>
					생성
				</Button>
				<Button variant="secondary" fullWidth onclick={() => (showCreateModal = false)}>취소</Button>
			</div>
		{:else}
			<!-- Bulk Create Form -->
			<div class="modal-form__field">
				<span class="modal-form__label">수업 유형</span>
				<div class="slot-type-toggle">
					<button
						type="button"
						class="slot-type-toggle__btn"
						class:slot-type-toggle__btn--active={bulkForm.slot_type !== 'ENSEMBLE'}
						onclick={() => handleBulkSlotTypeChange('REGULAR')}
					>
						일반 수업
					</button>
					<button
						type="button"
						class="slot-type-toggle__btn"
						class:slot-type-toggle__btn--active={bulkForm.slot_type === 'ENSEMBLE'}
						onclick={() => handleBulkSlotTypeChange('ENSEMBLE')}
					>
						합주 수업
					</button>
				</div>
			</div>
			<div class="modal-form__field">
				<span class="modal-form__label">반복 요일</span>
				<div class="day-chips" role="group" aria-label="요일 선택">
					{#each DAY_OPTIONS as { value, label }}
						<button
							type="button"
							class="day-chip"
							class:day-chip--active={bulkForm.days_of_week.includes(value)}
							onclick={() => toggleDay(value)}
							aria-pressed={bulkForm.days_of_week.includes(value)}
						>
							{label}
						</button>
					{/each}
				</div>
			</div>
			<div class="modal-form__row">
				<label class="modal-form__field">
					<span class="modal-form__label">시작일</span>
					<input type="date" class="modal-form__input" bind:value={bulkForm.start_date} />
				</label>
				<label class="modal-form__field">
					<span class="modal-form__label">종료일</span>
					<input type="date" class="modal-form__input" bind:value={bulkForm.end_date} />
				</label>
			</div>
			<div class="modal-form__row">
				<label class="modal-form__field">
					<span class="modal-form__label">시작 시간</span>
					<input type="time" class="modal-form__input" bind:value={bulkForm.start_time} />
				</label>
				<label class="modal-form__field">
					<span class="modal-form__label">종료 시간</span>
					<input type="time" class="modal-form__input" bind:value={bulkForm.end_time} />
				</label>
			</div>
			{#if academyStore.isAdmin}
				<div class="modal-form__field">
					<span class="modal-form__label">담당 강사</span>
					{#if instructors.length === 0}
						<div class="modal-form__notice">
							강사가 없습니다. 강사를 추가해주세요.
						</div>
					{:else}
						<select class="modal-form__input" bind:value={bulkForm.instructor_id}>
							{#each instructors as inst}
								<option value={getInstructorId(inst)}>{inst.user_name}</option>
							{/each}
						</select>
					{/if}
				</div>
			{/if}
			<label class="modal-form__field">
				<span class="modal-form__label">{bulkForm.slot_type === 'ENSEMBLE' ? '최소 인원' : '최대 인원'}</span>
				{#if bulkForm.slot_type === 'ENSEMBLE'}
					<input type="number" class="modal-form__input" min="1" bind:value={bulkForm.min_capacity} />
				{:else}
					<input type="number" class="modal-form__input" min="1" bind:value={bulkForm.max_capacity} />
				{/if}
			</label>
			{#if bulkForm.days_of_week.length > 0 && bulkSlotCount > 0}
				<div class="bulk-preview">
					<span class="bulk-preview__label">
						매주 {formatDayLabels(bulkForm.days_of_week)} | {bulkForm.start_date} ~ {bulkForm.end_date}
					</span>
					<span class="bulk-preview__count">
						총 <strong>{bulkSlotCount}</strong>개 슬롯 생성 예정
					</span>
				</div>
			{/if}
			<div class="modal-form__actions">
				<Button
					fullWidth
					loading={actionLoading}
					disabled={(academyStore.isAdmin && instructors.length === 0) || bulkForm.days_of_week.length === 0 || bulkSlotCount === 0}
					onclick={handleBulkCreateSlots}
				>
					일괄 생성 ({bulkSlotCount}개)
				</Button>
				<Button variant="secondary" fullWidth onclick={() => (showCreateModal = false)}>취소</Button>
			</div>
		{/if}
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
			<span class="modal-form__label">{editTarget?.slot_type === 'ENSEMBLE' ? '최소 인원' : '최대 인원'}</span>
			{#if editTarget?.slot_type === 'ENSEMBLE'}
				<input type="number" class="modal-form__input" min="1" bind:value={editForm.min_capacity} />
			{:else}
				<input type="number" class="modal-form__input" min="1" bind:value={editForm.max_capacity} />
			{/if}
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
			{formatTimeRange(deleteTarget.start_time, deleteTarget.end_time)} ({getSlotLabel(deleteTarget)}) 슬롯을 삭제하시겠습니까?
		{/if}
	</p>
	{#if deleteTarget && computeWeightedCount(deleteTarget.reservations) > 0}
		<p class="modal-warning">활성 예약이 있는 슬롯은 삭제할 수 없습니다.</p>
	{/if}
	<div class="modal-form__actions">
		<Button
			variant="danger"
			fullWidth
			loading={actionLoading}
			disabled={deleteTarget !== null && computeWeightedCount(deleteTarget.reservations) > 0}
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
			{#if statusConfirmTarget.newStatus === 'COMPLETED'}
				<div class="status-confirm__feedback-notice">
					수업 완료를 위해 위클리 피드백을 먼저 작성해야 합니다.
				</div>
			{/if}
			{#if statusConfirmTarget.passName}
				<div class="status-confirm__detail">
					수강권: {statusConfirmTarget.passName}
				</div>
			{/if}
			{#if statusConfirmTarget.capacityWeight !== 1}
				<div class="status-confirm__capacity-info">
					{#if statusConfirmTarget.newStatus === 'CONFIRMED'}
						{statusConfirmTarget.capacityWeight}인원이 차감됩니다.
					{:else if statusConfirmTarget.newStatus === 'CANCELLED'}
						{statusConfirmTarget.capacityWeight}인원이 환원됩니다.
					{/if}
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
					{statusConfirmTarget.newStatus === 'COMPLETED' ? '피드백 작성하러 가기' : `${getStatusLabel(statusConfirmTarget.newStatus)} 처리`}
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

		&__legend {
			display: flex;
			justify-content: center;
			gap: var(--space-md);
			padding: var(--space-xs) 0 var(--space-sm);
		}

		&__legend-item {
			display: flex;
			align-items: center;
			gap: var(--space-2xs);
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__legend-circle {
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background-color: var(--color-success);
		}

		&__legend-triangle {
			width: 0;
			height: 0;
			border-left: 3.5px solid transparent;
			border-right: 3.5px solid transparent;
			border-bottom: 6px solid var(--color-warning);
		}

		&__legend-square {
			width: 6px;
			height: 6px;
			border-radius: 0;
			background-color: var(--color-danger);
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

		&__time-row {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
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

		&__number {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-muted);
			min-width: 18px;
			text-align: center;
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

		&__weight {
			font-size: var(--font-size-xs);
			color: var(--color-info);
			font-weight: var(--font-weight-medium);
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

		&__notice {
			font-size: var(--font-size-sm);
			color: var(--color-warning);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-warning-bg);
			border-radius: var(--radius-sm);
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

	.slot-type-toggle {
		display: flex;
		gap: var(--space-xs);
		background: var(--color-bg);
		border-radius: var(--radius-md);
		padding: var(--space-2xs);

		&__btn {
			flex: 1;
			padding: 10px 0;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			background: none;
			transition:
				background-color var(--transition-fast),
				color var(--transition-fast);

			&--active {
				background: var(--color-white);
				color: var(--color-text);
				box-shadow: var(--shadow-sm);
			}
		}
	}

	.day-chips {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
	}

	.day-chip {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		background: var(--color-bg);
		border: 1.5px solid var(--color-border);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast),
			transform 150ms;

		&:active {
			transform: scale(0.95);
		}

		&--active {
			background: var(--color-primary);
			color: var(--color-on-primary);
			border-color: var(--color-primary);
			font-weight: var(--font-weight-semibold);
		}
	}

	.bulk-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-primary-bg);
		border-radius: var(--radius-sm);

		&__label {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__count {
			font-size: var(--font-size-sm);
			color: var(--color-primary);

			:global(strong) {
				font-weight: var(--font-weight-bold);
			}
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

		&__capacity-info {
			font-size: var(--font-size-sm);
			color: var(--color-info);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-info-bg);
			border-radius: var(--radius-sm);
		}

		&__feedback-notice {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-primary-bg);
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
