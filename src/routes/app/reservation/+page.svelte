<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getAvailableSlots,
		getMyReservations,
		createReservation,
		cancelReservation,
		cancelReservationAsNoShow,
		getLessonSlotsMonthlySummary
	} from '$lib/api/reservation';
	import { getMyPasses } from '$lib/api/member';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import PassSummary from '$lib/components/reservation/PassSummary.svelte';
	import ReservationCalendar from '$lib/components/reservation/ReservationCalendar.svelte';
	import { formatDate, formatTimeRange, getDayOfWeek, getTodayString } from '$lib/utils/format';
	import {
		getTicketValue,
		getReservationWeight,
		getPassDisplayName,
		isPassUsable,
		getAvailableLessons,
		getPendingCount
	} from '$lib/utils/pass';
	import {
		getBookingBlockLabel,
		getBookingBlockMessage,
		getDateEligibility,
		getSlotEligibility,
		getUsablePassesForDate,
		getUsablePassesForSlot
	} from '$lib/utils/booking';
	import {
		buildActiveReservationMap,
		buildSlotKey,
		hasVisibleSequence,
		isReservationDay
	} from '$lib/utils/reservation';
	import type {
		AvailableSlot,
		DateIndicators,
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
	let rawDateIndicators = $state<Map<string, DateIndicators>>(new Map());

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

	// 오늘 기준 이용 가능 수강권 (월 인디케이터의 강사 필터용)
	let activePasses = $derived(memberPasses.filter((p) => isPassUsable(p, getTodayString())));

	// 선택한 날짜 자체가 막혀 있는지(유효기간/홀딩/잔여) — 슬롯을 하나씩 눌러보지 않아도
	// 이유를 알 수 있도록 목록 위 배너로 노출한다
	let dateEligibility = $derived(getDateEligibility(memberPasses, selectedDate));

	// 월 요약 API는 강사 단위라 수강권 유효기간을 모른다. 예약할 수 없는 날짜의 '예약 가능' 점은
	// 여기서 걷어낸다 (기존 예약이 있는 날의 확정/대기 점은 그대로 둔다).
	let dateIndicators = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- $derived 안에서 매번 새로 만들어 반환한다
		const filtered = new Map<string, DateIndicators>();
		for (const [date, indicators] of rawDateIndicators) {
			const hasAvailable =
				indicators.has_available && getDateEligibility(memberPasses, date).bookable;
			if (!hasAvailable && !indicators.has_confirmed && !indicators.has_pending) continue;
			filtered.set(date, { ...indicators, has_available: hasAvailable });
		}
		return filtered;
	});

	let activeReservationMap = $derived(buildActiveReservationMap(myReservations));

	function isSlotAlreadyBooked(slot: AvailableSlot): boolean {
		return activeReservationMap.has(buildSlotKey(slot));
	}

	// 로테이션 수업처럼 한 시간대에 여러 명이 들어갈 때만 내 순번을 노출한다
	function getSequenceForSlot(slot: AvailableSlot): MyReservation | null {
		const reservation = activeReservationMap.get(buildSlotKey(slot));
		return hasVisibleSequence(reservation) ? (reservation ?? null) : null;
	}

	function getPassesForSlot(slot: AvailableSlot | null): MemberPass[] {
		if (!slot) return getUsablePassesForDate(memberPasses, selectedDate);
		return getUsablePassesForSlot(memberPasses, slot);
	}

	let filteredPasses = $derived(getPassesForSlot(selectedSlot));
	let selectedPass = $derived(filteredPasses.find((p) => p.id === selectedPassId) ?? null);
	let selectedPassWeight = $derived(
		selectedPass
			? getReservationWeight(
					selectedPass.pass_category,
					selectedPass.ticket_value,
					selectedSlot?.slot_type
				)
			: 1
	);
	let exceedsCapacity = $derived(
		selectedSlot && selectedPass
			? selectedSlot.slot_type !== 'ENSEMBLE' &&
					selectedSlot.remaining_capacity < selectedPassWeight
			: false
	);

	let indicatorRequestId = 0;
	let currentCalendarYear = new Date().getFullYear();
	let currentCalendarMonth = new Date().getMonth() + 1;

	onMount(async () => {
		await Promise.all([loadMemberPasses(), loadAvailableSlots(selectedDate), loadMyReservations()]);
		loadMonthIndicators(currentCalendarYear, currentCalendarMonth);
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

	async function loadMonthIndicators(year: number, month: number) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		const instructorIds = [
			...new Set(
				activePasses.map((p) => p.instructor_id).filter((id): id is number => id !== undefined)
			)
		];

		if (instructorIds.length === 0) {
			rawDateIndicators = new Map();
			return;
		}

		const requestId = ++indicatorRequestId;

		try {
			const results = await Promise.allSettled(
				instructorIds.map((id) => getLessonSlotsMonthlySummary(academyId, year, month, id))
			);

			if (requestId !== indicatorRequestId) return;

			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- 만든 뒤 rawDateIndicators에 통째로 재할당한다
			const merged = new Map<string, DateIndicators>();
			for (const result of results) {
				if (result.status !== 'fulfilled' || !result.value.status || !result.value.data) continue;
				for (const [date, indicators] of Object.entries(result.value.data)) {
					const existing = merged.get(date);
					if (existing) {
						merged.set(date, {
							has_confirmed: existing.has_confirmed || indicators.has_confirmed,
							has_pending: existing.has_pending || indicators.has_pending,
							has_available: existing.has_available || indicators.has_available
						});
					} else {
						merged.set(date, { ...indicators });
					}
				}
			}
			rawDateIndicators = merged;
		} catch {
			// handled by client.ts
		}
	}

	function handleMonthChange(year: number, month: number) {
		currentCalendarYear = year;
		currentCalendarMonth = month;
		loadMonthIndicators(year, month);
	}

	function refreshMonthIndicators() {
		loadMonthIndicators(currentCalendarYear, currentCalendarMonth);
	}

	function handleSlotClick(slot: AvailableSlot) {
		if (isSlotAlreadyBooked(slot)) {
			toastStore.error('이미 예약된 시간입니다.');
			return;
		}
		// 서버가 거부할 예약은 여기서 같은 기준으로 막고, 실제 사유(유효기간/홀딩/잔여/마감)를 알려준다
		const eligibility = getSlotEligibility(memberPasses, slot);
		if (!eligibility.bookable) {
			toastStore.error(getBookingBlockMessage(eligibility));
			return;
		}
		selectedSlot = slot;
		selectedPassId = getPassesForSlot(slot)[0].id;
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
				refreshMonthIndicators();
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
				toastStore.success(noShow ? '당일 취소로 노쇼 처리되었습니다.' : '예약이 취소되었습니다.');
				cancelSheetOpen = false;
				selectedReservation = null;
				loadMyReservations();
				loadAvailableSlots(selectedDate);
				loadMemberPasses();
				refreshMonthIndicators();
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

	function getInstructorLabel(slot: {
		slot_type: SlotType;
		instructor_name: string | null;
	}): string {
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
		<PassSummary passes={memberPasses} loading={passesLoading} />

		<ReservationCalendar
			{selectedDate}
			{dateIndicators}
			onselect={handleDateSelect}
			onmonthchange={handleMonthChange}
		/>

		<div class="slots-content">
			{#if !passesLoading && !dateEligibility.bookable}
				<p class="slots-content__notice">{getBookingBlockMessage(dateEligibility)}</p>
			{/if}
			{#if slotsLoading}
				<div class="slots-content__loading">
					<Spinner />
				</div>
			{:else if availableSlots.length === 0}
				<p class="slots-content__empty">예약 가능한 시간이 없습니다.</p>
			{:else}
				<div class="slot-list">
					{#each availableSlots as slot (slot.slot_id)}
						{@const alreadyBooked = isSlotAlreadyBooked(slot)}
						{@const mySequence = getSequenceForSlot(slot)}
						{@const eligibility = getSlotEligibility(memberPasses, slot)}
						{@const blocked = !alreadyBooked && !eligibility.bookable}
						<Card padding="sm" onclick={() => handleSlotClick(slot)}>
							<div
								class="slot-card"
								class:slot-card--booked={alreadyBooked}
								class:slot-card--blocked={blocked}
							>
								<div class="slot-card__info">
									<span class="slot-card__time">
										{formatTimeRange(slot.start_time, slot.end_time)}
									</span>
									<span class="slot-card__instructor">
										{getInstructorLabel(slot)}
									</span>
									{#if mySequence}
										<span class="slot-card__sequence">
											내 순서 {mySequence.sequence}번째 / 총 {mySequence.slot_total_count}명
										</span>
									{/if}
									{#if slot.slot_type === 'ENSEMBLE'}
										<span class="slot-card__tag">모든 수강권 가능</span>
									{/if}
								</div>
								{#if alreadyBooked}
									<div class="slot-card__badges">
										<Badge variant="info">예약됨</Badge>
										{#if mySequence}
											<span
												class="slot-card__seq"
												aria-label="내 수업 순서 {mySequence.sequence}번째"
											>
												{mySequence.sequence}
											</span>
										{/if}
									</div>
								{:else if blocked}
									<div class="slot-card__badges">
										<Badge variant="neutral">{getBookingBlockLabel(eligibility)}</Badge>
									</div>
								{/if}
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
					{#each myReservations as reservation (reservation.reservation_id)}
						<Card padding="md">
							<div class="reservation-card">
								<div class="reservation-card__header">
									<Badge variant={getStatusVariant(reservation.status)}>
										{getStatusLabel(reservation.status)}
									</Badge>
									{#if reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'}
										{@const isSameDay = isReservationDay(reservation.slot_date)}
										<button
											type="button"
											class="reservation-card__cancel"
											onclick={() => handleCancelClick(reservation)}
										>
											{isSameDay ? '노쇼' : '취소'}
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
									{#if reservation.sequence && (reservation.slot_total_count ?? 0) > 1}
										<!-- 로테이션 수업처럼 한 시간대에 여러 명이 들어갈 때 들어가는 순서 안내 -->
										<span class="reservation-card__sequence">
											수업 순서 {reservation.sequence}번째 / 총 {reservation.slot_total_count}명
										</span>
									{/if}
									{#if reservation.pass_name}
										<span class="reservation-card__pass">
											{getPassDisplayName(reservation.pass_name, reservation.pass_category)}
											{#if getTicketValue(reservation.ticket_value) > 1}
												<span class="reservation-card__ticket"
													>({getTicketValue(reservation.ticket_value)}회 차감)</span
												>
											{/if}
										</span>
									{/if}
									{#if (reservation.status === 'CANCELLED' || reservation.status === 'NO_SHOW') && reservation.cancel_reason}
										<span class="reservation-card__reason">
											취소 사유: {reservation.cancel_reason}
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
					<span class="booking-sheet__label"
						>{selectedSlot.slot_type === 'ENSEMBLE' ? '유형' : '강사'}</span
					>
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
					{#each filteredPasses as pass (pass.id)}
						{@const passWeight = getReservationWeight(
							pass.pass_category,
							pass.ticket_value,
							selectedSlot?.slot_type
						)}
						{@const fits =
							!selectedSlot ||
							selectedSlot.slot_type === 'ENSEMBLE' ||
							selectedSlot.remaining_capacity >= passWeight}
						{@const pendingCount = getPendingCount(pass)}
						<option value={pass.id} disabled={!fits}>
							{getPassDisplayName(pass.pass_name, pass.pass_category)} (예약 가능 {getAvailableLessons(
								pass
							)}회{pendingCount > 0 ? `, 예약중 ${pendingCount}회` : ''}){getTicketValue(
								pass.ticket_value
							) > 1
								? ` [${getTicketValue(pass.ticket_value)}회 차감]`
								: ''}{!fits ? ' (마감)' : ''}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedSlot?.slot_type === 'ENSEMBLE'}
				<p class="booking-sheet__pass-notice booking-sheet__pass-notice--info">
					합주 수업은 모든 수강권으로 예약할 수 있습니다.
				</p>
			{:else if selectedSlot?.instructor_name && filteredPasses.length < getUsablePassesForDate(memberPasses, selectedSlot.slot_date).length}
				<p class="booking-sheet__pass-notice">
					{selectedSlot.instructor_name} 선생님 담당 수강권만 표시됩니다.
				</p>
			{/if}

			{#if selectedPass && getTicketValue(selectedPass.ticket_value) > 1}
				<div class="booking-sheet__ticket-notice">
					이 수강권은 1회 수업당 {getTicketValue(selectedPass.ticket_value)}회가 차감됩니다.
				</div>
			{/if}

			{#if selectedPass && getPendingCount(selectedPass) > 0}
				<p class="booking-sheet__pass-notice booking-sheet__pass-notice--info">
					잔여 {selectedPass.remaining_lessons}회 중 {getPendingCount(selectedPass)}회는 이미
					예약되어 있습니다. (수업 완료 처리 시 차감)
				</p>
			{/if}

			{#if exceedsCapacity}
				<div class="booking-sheet__capacity-warning">해당 시간은 예약이 마감되었습니다.</div>
			{/if}

			<Button
				fullWidth
				loading={submitting}
				disabled={exceedsCapacity}
				onclick={handleConfirmBooking}
			>
				{#if selectedPass && getTicketValue(selectedPass.ticket_value) > 1}
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
					<span class="cancel-sheet__label"
						>{selectedReservation.slot_type === 'ENSEMBLE' ? '유형' : '강사'}</span
					>
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
					당일 취소는 노쇼(No-Show)로 처리됩니다. 수강권이 차감되며 환불되지 않습니다.
				</div>
			{:else if getTicketValue(selectedReservation.ticket_value) > 1}
				<p class="cancel-sheet__refund-notice">
					취소 시 {getTicketValue(selectedReservation.ticket_value)}회가 환불됩니다.
				</p>
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

		// 선택한 날짜가 통째로 막힌 이유 (유효기간/홀딩/잔여) 안내
		&__notice {
			margin-bottom: var(--space-sm);
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-md);
			background: var(--color-bg);
			color: var(--color-text-secondary);
			font-size: var(--font-size-sm);
			line-height: 1.5;
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

		&--booked {
			opacity: 0.6;
		}

		// 예약할 수 없는 슬롯 — 눌러보기 전에 구분되도록 흐리게 (탭하면 사유 토스트가 뜬다)
		&--blocked {
			opacity: 0.5;
		}

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

		&__sequence {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-primary);
		}

		&__badges {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			flex-shrink: 0;
		}

		&__seq {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			width: 18px;
			height: 18px;
			border-radius: var(--radius-full);
			background: var(--color-primary);
			color: var(--color-white);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
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

		&__sequence {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
		}

		&__ticket {
			color: var(--color-warning);
			font-weight: var(--font-weight-medium);
		}

		&__reason {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
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

		&__capacity-warning {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-danger-bg);
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
