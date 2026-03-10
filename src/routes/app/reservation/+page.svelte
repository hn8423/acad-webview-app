<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getAvailableSlots,
		getMyReservations,
		createReservation,
		cancelReservation,
		cancelReservationAsNoShow
	} from '$lib/api/reservation';
	import { getMyPasses } from '$lib/api/member';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import PassSummary from '$lib/components/reservation/PassSummary.svelte';
	import ReservationCalendar from '$lib/components/reservation/ReservationCalendar.svelte';
	import {
		formatDate,
		formatTimeRange,
		getDayOfWeek,
		getTodayString,
		getDaysInMonth
	} from '$lib/utils/format';
	import { getTicketValue, getCapacityWeight } from '$lib/utils/pass';
	import { isReservationDay } from '$lib/utils/reservation';
	import type {
		AvailableSlot,
		MyReservation,
		ReservationStatus,
		SlotType
	} from '$lib/types/reservation';
	import type { MemberPass } from '$lib/types/member';
	import { onMount } from 'svelte';

	let activeTab = $state<'book' | 'my'>('book');

	// Book tab state
	let selectedDate = $state(getTodayString());
	let availableSlots = $state<AvailableSlot[]>([]);
	let slotsLoading = $state(true);
	let slotCountMap = $state<Record<string, number>>({});
	let countsLoading = $state(false);

	// My reservations tab state
	let myReservations = $state<MyReservation[]>([]);
	let myLoading = $state(true);

	// Shared state
	let memberPasses = $state<MemberPass[]>([]);
	let passesLoading = $state(true);

	// Booking sheet state
	let bookingSheetOpen = $state(false);
	let selectedSlot = $state<AvailableSlot | null>(null);
	let selectedPassId = $state<number | null>(null);
	let submitting = $state(false);

	// Cancel sheet state
	let cancelSheetOpen = $state(false);
	let selectedReservation = $state<MyReservation | null>(null);
	let cancelling = $state(false);

	let isSameDayCancel = $derived(
		selectedReservation ? isReservationDay(selectedReservation.slot_date) : false
	);

	let activePasses = $derived(
		memberPasses.filter((p) => p.status === 'ACTIVE' && p.remaining_lessons > 0)
	);

	function getPassesForSlot(slot: AvailableSlot | null): MemberPass[] {
		if (!slot) return activePasses;
		if (slot.slot_type === 'ENSEMBLE') return activePasses;
		if (!slot.instructor_name) return activePasses;
		const matched = activePasses.filter((p) => p.instructor_name === slot.instructor_name);
		return matched.length > 0 ? matched : activePasses;
	}

	let filteredPasses = $derived(getPassesForSlot(selectedSlot));
	let selectedPass = $derived(filteredPasses.find((p) => p.id === selectedPassId) ?? null);
	let isRotationPass = $derived(selectedPass?.pass_category === 'ROTATION');

	onMount(() => {
		const now = new Date();
		loadMonthSlotCounts(now.getFullYear(), now.getMonth() + 1);
		loadAvailableSlots(selectedDate);
		loadMemberPasses();
		loadMyReservations();
	});

	async function loadAvailableSlots(date: string) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		slotsLoading = true;
		try {
			const res = await getAvailableSlots(academyId, date);
			if (res.status && res.data) {
				availableSlots = res.data;
			}
		} catch {
			// handled by client.ts
		} finally {
			slotsLoading = false;
		}
	}

	async function loadMemberPasses() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		passesLoading = true;
		try {
			const res = await getMyPasses(academyId);
			if (res.status && res.data) {
				memberPasses = res.data;
			}
		} catch {
			// handled by client.ts
		} finally {
			passesLoading = false;
		}
	}

	async function loadMyReservations() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		myLoading = true;
		try {
			const res = await getMyReservations(academyId);
			if (res.status && res.data) {
				myReservations = res.data;
			}
		} catch {
			// handled by client.ts
		} finally {
			myLoading = false;
		}
	}

	function handleDateSelect(date: string) {
		selectedDate = date;
		loadAvailableSlots(date);
	}

	async function loadMonthSlotCounts(year: number, month: number) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		countsLoading = true;
		const todayStr = getTodayString();
		const daysInMonth = getDaysInMonth(year, month);
		const dates: string[] = [];

		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			if (dateStr >= todayStr) dates.push(dateStr);
		}

		try {
			const results = await Promise.allSettled(
				dates.map((date) => getAvailableSlots(academyId, date))
			);
			const newMap: Record<string, number> = {};
			results.forEach((result, i) => {
				if (result.status === 'fulfilled' && result.value.status && result.value.data) {
					const count = result.value.data.length;
					if (count > 0) newMap[dates[i]] = count;
				}
			});
			slotCountMap = newMap;
		} catch {
			// handled by client.ts
		} finally {
			countsLoading = false;
		}
	}

	function handleMonthChange(year: number, month: number) {
		loadMonthSlotCounts(year, month);
	}

	async function refreshSlotCount(date: string) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const res = await getAvailableSlots(academyId, date);
			if (res.status && res.data) {
				const count = res.data.length;
				slotCountMap =
					count > 0
						? { ...slotCountMap, [date]: count }
						: Object.fromEntries(Object.entries(slotCountMap).filter(([k]) => k !== date));
			}
		} catch {
			// handled by client.ts
		}
	}

	function handleSlotClick(slot: AvailableSlot) {
		const passesForSlot = getPassesForSlot(slot);
		if (passesForSlot.length === 0) {
			const message =
				memberPasses.length === 0
					? '등록된 수강권이 없습니다.'
					: slot.slot_type === 'REGULAR' && slot.instructor_name
						? `${slot.instructor_name} 선생님의 이용 가능한 수강권이 없습니다.`
						: '이용 가능한 수강권이 없습니다.';
			toastStore.error(message);
			return;
		}
		selectedSlot = slot;
		selectedPassId = passesForSlot[0].id;
		bookingSheetOpen = true;
	}

	async function handleConfirmBooking() {
		const academyId = academyStore.academyId;
		if (!academyId || !selectedSlot || !selectedPassId) return;

		submitting = true;
		try {
			const res = await createReservation(academyId, {
				slot_id: selectedSlot.slot_id,
				member_pass_id: selectedPassId
			});
			if (res.status) {
				toastStore.success('예약이 완료되었습니다.');
				bookingSheetOpen = false;
				selectedSlot = null;
				selectedPassId = null;
				loadAvailableSlots(selectedDate);
				loadMyReservations();
				loadMemberPasses();
				refreshSlotCount(selectedDate);
			}
		} catch {
			// handled by client.ts
		} finally {
			submitting = false;
		}
	}

	function handleCancelClick(reservation: MyReservation) {
		selectedReservation = reservation;
		cancelSheetOpen = true;
	}

	async function handleConfirmCancel() {
		const academyId = academyStore.academyId;
		if (!academyId || !selectedReservation) return;

		cancelling = true;
		try {
			const noShow = isReservationDay(selectedReservation.slot_date);
			const res = noShow
				? await cancelReservationAsNoShow(academyId, selectedReservation.reservation_id)
				: await cancelReservation(academyId, selectedReservation.reservation_id);
			if (res.status) {
				toastStore.success(
					noShow ? '당일 취소로 노쇼 처리되었습니다.' : '예약이 취소되었습니다.'
				);
				cancelSheetOpen = false;
				selectedReservation = null;
				loadMyReservations();
				loadAvailableSlots(selectedDate);
				loadMemberPasses();
				refreshSlotCount(selectedDate);
			}
		} catch {
			// handled by client.ts
		} finally {
			cancelling = false;
		}
	}

	function getStatusVariant(status: ReservationStatus) {
		switch (status) {
			case 'PENDING':
				return 'warning' as const;
			case 'CONFIRMED':
				return 'success' as const;
			case 'COMPLETED':
				return 'info' as const;
			case 'CANCELLED':
			case 'NO_SHOW':
				return 'neutral' as const;
			default:
				return 'neutral' as const;
		}
	}

	function getStatusLabel(status: ReservationStatus): string {
		switch (status) {
			case 'PENDING':
				return '대기중';
			case 'CONFIRMED':
				return '확정';
			case 'COMPLETED':
				return '완료';
			case 'CANCELLED':
				return '취소됨';
			case 'NO_SHOW':
				return '노쇼';
			default:
				return status;
		}
	}

	function getInstructorLabel(slot: { slot_type: SlotType; instructor_name: string | null }): string {
		if (slot.slot_type === 'ENSEMBLE') return '합주 수업';
		return slot.instructor_name ? `${slot.instructor_name} 선생님` : '강사 미지정';
	}
</script>

<div class="reservation-page">
	<!-- Tab Navigation -->
	<div class="tab-nav">
		<button
			type="button"
			class="tab-nav__item"
			class:tab-nav__item--active={activeTab === 'book'}
			onclick={() => (activeTab = 'book')}
		>
			예약하기
		</button>
		<button
			type="button"
			class="tab-nav__item"
			class:tab-nav__item--active={activeTab === 'my'}
			onclick={() => {
				activeTab = 'my';
				loadMyReservations();
			}}
		>
			내 예약
		</button>
	</div>

	<!-- Book Tab -->
	{#if activeTab === 'book'}
		<ReservationCalendar
			{selectedDate}
			{slotCountMap}
			{countsLoading}
			onselect={handleDateSelect}
			onmonthchange={handleMonthChange}
		/>

		<PassSummary passes={memberPasses} loading={passesLoading} />

		<div class="slots-content">
			{#if slotsLoading}
				<div class="slots-content__loading">
					<Spinner />
				</div>
			{:else if availableSlots.length === 0}
				<p class="slots-content__empty">예약 가능한 시간이 없습니다.</p>
			{:else}
				<div class="slot-list">
					{#each availableSlots as slot}
						<Card padding="sm" onclick={() => handleSlotClick(slot)}>
							<div class="slot-card">
								<div class="slot-card__info">
									<span class="slot-card__time">
										{formatTimeRange(slot.start_time, slot.end_time)}
									</span>
									<span class="slot-card__instructor">
										{getInstructorLabel(slot)}
									</span>
									{#if slot.slot_type === 'ENSEMBLE'}
										<span class="slot-card__tag">모든 수강권 가능</span>
									{/if}
								</div>
								<Badge variant={slot.remaining_capacity <= 1 ? 'danger' : 'success'}>
									잔여 {slot.remaining_capacity}석
								</Badge>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- My Reservations Tab -->
	{#if activeTab === 'my'}
		<div class="my-content">
			{#if myLoading}
				<div class="my-content__loading">
					<Spinner />
				</div>
			{:else if myReservations.length === 0}
				<p class="my-content__empty">예약 내역이 없습니다.</p>
			{:else}
				<div class="reservation-list">
					{#each myReservations as reservation}
						<Card padding="md">
							<div class="reservation-card">
								<div class="reservation-card__header">
									<Badge variant={getStatusVariant(reservation.status)}>
										{getStatusLabel(reservation.status)}
									</Badge>
									{#if reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'}
										<button
											type="button"
											class="reservation-card__cancel"
											onclick={() => handleCancelClick(reservation)}
										>
											취소
										</button>
									{/if}
								</div>
								<div class="reservation-card__body">
									<span class="reservation-card__date">
										{formatDate(reservation.slot_date)}
										({getDayOfWeek(reservation.slot_date)})
									</span>
									<span class="reservation-card__time">
										{formatTimeRange(reservation.start_time, reservation.end_time)}
									</span>
									<span class="reservation-card__instructor">
										{getInstructorLabel(reservation)}
									</span>
									{#if reservation.pass_name}
										<span class="reservation-card__pass">
											{reservation.pass_name}
											{#if reservation.pass_category === 'ROTATION'}
												<span class="reservation-card__capacity-badge">0.5인원</span>
											{/if}
											{#if getTicketValue(reservation.ticket_value) > 1}
												<span class="reservation-card__ticket">({getTicketValue(reservation.ticket_value)}회 차감)</span>
											{/if}
										</span>
									{/if}
								</div>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Booking Confirmation BottomSheet -->
<BottomSheet
	bind:isOpen={bookingSheetOpen}
	title="예약 확인"
	onclose={() => {
		bookingSheetOpen = false;
		selectedSlot = null;
		selectedPassId = null;
	}}
>
	{#if selectedSlot}
		<div class="booking-sheet">
			<div class="booking-sheet__info">
				<div class="booking-sheet__row">
					<span class="booking-sheet__label">날짜</span>
					<span class="booking-sheet__value">
						{formatDate(selectedSlot.slot_date)} ({getDayOfWeek(selectedSlot.slot_date)})
					</span>
				</div>
				<div class="booking-sheet__row">
					<span class="booking-sheet__label">시간</span>
					<span class="booking-sheet__value">
						{formatTimeRange(selectedSlot.start_time, selectedSlot.end_time)}
					</span>
				</div>
				<div class="booking-sheet__row">
					<span class="booking-sheet__label">{selectedSlot.slot_type === 'ENSEMBLE' ? '유형' : '강사'}</span>
					<span class="booking-sheet__value">{getInstructorLabel(selectedSlot)}</span>
				</div>
			</div>

			<div class="booking-sheet__field">
				<label class="booking-sheet__field-label" for="pass-select">사용할 수강권</label>
				<select
					id="pass-select"
					class="booking-sheet__select"
					bind:value={selectedPassId}
					aria-label="사용할 수강권 선택"
				>
					{#each filteredPasses as pass}
						<option value={pass.id}>
							{pass.pass_name} (잔여 {pass.remaining_lessons}회){pass.pass_category === 'ROTATION' ? ' [0.5인원]' : ''}{getTicketValue(pass.ticket_value) > 1 ? ` [${getTicketValue(pass.ticket_value)}회 차감]` : ''}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedSlot?.slot_type === 'ENSEMBLE'}
				<p class="booking-sheet__pass-notice booking-sheet__pass-notice--info">
					합주 수업은 모든 수강권으로 예약할 수 있습니다.
				</p>
			{:else if selectedSlot?.instructor_name && filteredPasses.length < activePasses.length}
				<p class="booking-sheet__pass-notice">
					{selectedSlot.instructor_name} 선생님 담당 수강권만 표시됩니다.
				</p>
			{/if}

			{#if isRotationPass}
				<div class="booking-sheet__capacity-notice">
					로테이션 수강권은 0.5인원으로 차감됩니다.
				</div>
			{/if}

			{#if selectedPass && getTicketValue(selectedPass.ticket_value) > 1}
				<div class="booking-sheet__ticket-notice">
					이 수강권은 1회 수업당 {getTicketValue(selectedPass.ticket_value)}회가 차감됩니다.
				</div>
			{/if}

			<Button fullWidth loading={submitting} onclick={handleConfirmBooking}>
				{#if isRotationPass}
					예약하기 (0.5인원 차감)
				{:else if selectedPass && getTicketValue(selectedPass.ticket_value) > 1}
					예약하기 ({getTicketValue(selectedPass.ticket_value)}회 차감)
				{:else}
					예약하기
				{/if}
			</Button>
		</div>
	{/if}
</BottomSheet>

<!-- Cancel Confirmation BottomSheet -->
<BottomSheet
	bind:isOpen={cancelSheetOpen}
	title="예약 취소"
	onclose={() => {
		cancelSheetOpen = false;
		selectedReservation = null;
	}}
>
	{#if selectedReservation}
		<div class="cancel-sheet">
			<p class="cancel-sheet__message">
				{isSameDayCancel
					? '당일 취소는 노쇼로 처리됩니다. 정말 취소하시겠습니까?'
					: '정말 예약을 취소하시겠습니까?'}
			</p>
			<div class="cancel-sheet__info">
				<div class="cancel-sheet__row">
					<span class="cancel-sheet__label">날짜</span>
					<span class="cancel-sheet__value">
						{formatDate(selectedReservation.slot_date)}
						({getDayOfWeek(selectedReservation.slot_date)})
					</span>
				</div>
				<div class="cancel-sheet__row">
					<span class="cancel-sheet__label">시간</span>
					<span class="cancel-sheet__value">
						{formatTimeRange(selectedReservation.start_time, selectedReservation.end_time)}
					</span>
				</div>
				<div class="cancel-sheet__row">
					<span class="cancel-sheet__label">{selectedReservation.slot_type === 'ENSEMBLE' ? '유형' : '강사'}</span>
					<span class="cancel-sheet__value">{getInstructorLabel(selectedReservation)}</span>
				</div>
				{#if selectedReservation.pass_name}
					<div class="cancel-sheet__row">
						<span class="cancel-sheet__label">수강권</span>
						<span class="cancel-sheet__value">{selectedReservation.pass_name}</span>
					</div>
				{/if}
			</div>
			{#if isSameDayCancel}
				<div class="cancel-sheet__noshow-warning">
					당일 취소는 노쇼(No-Show)로 처리됩니다.
					수강권이 차감되며 환불되지 않습니다.
				</div>
			{:else}
				{#if selectedReservation.pass_category === 'ROTATION'}
					<p class="cancel-sheet__refund-notice">
						취소 시 0.5인원이 환불됩니다.
					</p>
				{/if}
				{#if getTicketValue(selectedReservation.ticket_value) > 1}
					<p class="cancel-sheet__refund-notice">
						취소 시 {getTicketValue(selectedReservation.ticket_value)}회가 환불됩니다.
					</p>
				{/if}
			{/if}
			<div class="cancel-sheet__buttons">
				<Button
					variant="secondary"
					fullWidth
					onclick={() => {
						cancelSheetOpen = false;
						selectedReservation = null;
					}}
				>
					닫기
				</Button>
				<Button variant="danger" fullWidth loading={cancelling} onclick={handleConfirmCancel}>
					{isSameDayCancel ? '노쇼 처리하기' : '취소하기'}
				</Button>
			</div>
		</div>
	{/if}
</BottomSheet>

<style lang="scss">
	.reservation-page {
		display: flex;
		flex-direction: column;
		min-height: calc(100dvh - var(--header-height) - var(--bottom-nav-height));
	}

	.tab-nav {
		display: flex;
		background: var(--color-white);
		border-bottom: 1px solid var(--color-divider);

		&__item {
			flex: 1;
			padding: var(--space-md) 0;
			background: none;
			border: none;
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			position: relative;
			cursor: pointer;
			transition: color var(--transition-fast);

			&--active {
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);

				&::after {
					content: '';
					position: absolute;
					bottom: 0;
					left: 0;
					right: 0;
					height: 2px;
					background: var(--color-primary);
				}
			}
		}
	}

	.slots-content {
		padding: var(--space-md);
		flex: 1;

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-2xl);
			font-size: var(--font-size-sm);
		}
	}

	.slot-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.slot-card {
		display: flex;
		align-items: center;
		justify-content: space-between;

		&__info {
			display: flex;
			flex-direction: column;
			gap: 4px;
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

		&__tag {
			font-size: var(--font-size-xs);
			color: var(--color-info);
		}
	}

	.my-content {
		padding: var(--space-md);
		flex: 1;

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-2xl);
			font-size: var(--font-size-sm);
		}
	}

	.reservation-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.reservation-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		&__cancel {
			background: none;
			border: none;
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			cursor: pointer;
			padding: var(--space-xs) var(--space-sm);
			border-radius: var(--radius-sm);
			transition: background-color var(--transition-fast);

			&:active {
				background-color: var(--color-danger-bg);
			}
		}

		&__body {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		&__date {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__time {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__instructor {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__pass {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__ticket {
			color: var(--color-warning);
			font-weight: var(--font-weight-medium);
		}

		&__capacity-badge {
			display: inline-block;
			padding: 2px 6px;
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-info);
			background: var(--color-info-bg);
			border-radius: var(--radius-full);
		}
	}

	.booking-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__info {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__row {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		&__label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__value {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}

		&__field-label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__pass-notice {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-sm);

			&--info {
				color: var(--color-info);
				background: var(--color-info-bg);
			}
		}

		&__ticket-notice {
			font-size: var(--font-size-sm);
			color: var(--color-warning);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-warning-bg);
			border-radius: var(--radius-sm);
		}

		&__capacity-notice {
			font-size: var(--font-size-sm);
			color: var(--color-info);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-info-bg);
			border-radius: var(--radius-sm);
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
			background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
			background-repeat: no-repeat;
			background-position: right 16px center;
			padding-right: 40px;

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}
	}

	.cancel-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__message {
			font-size: var(--font-size-base);
			color: var(--color-text);
			text-align: center;
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__row {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		&__label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__value {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__refund-notice {
			font-size: var(--font-size-sm);
			color: var(--color-warning);
			text-align: center;
			font-weight: var(--font-weight-medium);
		}

		&__noshow-warning {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-danger-bg);
			border-radius: var(--radius-sm);
			text-align: center;
			line-height: 1.5;
		}

		&__buttons {
			display: flex;
			gap: var(--space-sm);
		}
	}
</style>
