import type {
	DateIndicators,
	LessonSlot,
	MyReservation,
	ReservationStatus,
	ScheduleSlot,
	SlotType
} from '$lib/types/reservation';
import { getTodayString, toLocalDateString } from '$lib/utils/format';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

// 자리를 차지하고 있는(= 아직 살아 있는) 예약 상태
const ACTIVE_STATUSES: ReadonlySet<ReservationStatus> = new Set(['PENDING', 'CONFIRMED']);

interface SlotIdentity {
	slot_date: string;
	start_time: string;
	end_time: string;
	slot_type: SlotType;
	instructor_name: string | null;
}

// 예약 목록 API는 slot_id를 내려주지 않으므로 날짜/시간/유형/강사 조합으로 슬롯과 매칭한다
export function buildSlotKey(slot: SlotIdentity): string {
	return [
		slot.slot_date,
		slot.start_time,
		slot.end_time,
		slot.slot_type,
		slot.instructor_name ?? ''
	].join('|');
}

export function buildActiveReservationMap(
	reservations: MyReservation[]
): Map<string, MyReservation> {
	const map = new Map<string, MyReservation>();
	for (const reservation of reservations) {
		if (!ACTIVE_STATUSES.has(reservation.status)) continue;
		const key = buildSlotKey(reservation);
		// 같은 슬롯에 활성 예약이 둘일 수는 없지만, 방어적으로 먼저 온 건을 유지한다
		if (!map.has(key)) map.set(key, reservation);
	}
	return map;
}

// 혼자 쓰는 시간대에는 "1번째 / 총 1명"이 의미 없으므로 2명 이상일 때만 순번을 노출한다
export function hasVisibleSequence(reservation: MyReservation | null | undefined): boolean {
	if (!reservation) return false;
	if (reservation.sequence == null) return false;
	return (reservation.slot_total_count ?? 0) > 1;
}

export function countSlotDates(startDate: string, endDate: string, daysOfWeek: number[]): number {
	if (daysOfWeek.length === 0) return 0;
	const start = new Date(startDate);
	const end = new Date(endDate);
	if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

	const daySet = new Set(daysOfWeek);
	let count = 0;
	const current = new Date(start);
	while (current <= end) {
		if (daySet.has(current.getDay())) count++;
		current.setDate(current.getDate() + 1);
	}
	return count;
}

export function formatDayLabels(daysOfWeek: number[]): string {
	const sorted = [...daysOfWeek].sort((a, b) => a - b);
	return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

export function isReservationDay(slotDate: string): boolean {
	return toLocalDateString(slotDate) <= getTodayString();
}

// 정원이 다 찬 슬롯인지. slot.status는 정원이 차도 OPEN으로 남아 있어서 그것만 보면
// 마감된 시간이 '예약 가능'으로 표시된다. current_count는 취미반 0.5 가중치가 반영된 값이다.
export function isScheduleSlotFull(
	slot: Pick<ScheduleSlot, 'max_capacity' | 'current_count'>
): boolean {
	if (slot.max_capacity === null) return false;
	return slot.current_count >= slot.max_capacity;
}

export function hasActionNeeded(slot: LessonSlot, today: string): boolean {
	return slot.reservations.some((rv) => {
		if (rv.status === 'CONFIRMED' && toLocalDateString(slot.slot_date) <= today) return true;
		return false;
	});
}

export function filterActionDates(
	slotsByDate: Map<string, LessonSlot[]>,
	today: string
): Set<string> {
	const actionDates = new Set<string>();
	for (const [date, slots] of slotsByDate) {
		if (slots.some((slot) => hasActionNeeded(slot, today))) {
			actionDates.add(date);
		}
	}
	return actionDates;
}

export function buildDateIndicators(
	slotsByDate: Map<string, LessonSlot[]>
): Map<string, DateIndicators> {
	const result = new Map<string, DateIndicators>();

	for (const [date, slots] of slotsByDate) {
		let hasConfirmed = false;
		let hasPending = false;
		let hasAvailable = false;

		for (const slot of slots) {
			if (slot.status === 'CANCELLED') continue;

			const hasConfirmedOrCompleted = slot.reservations.some(
				(rv) => rv.status === 'CONFIRMED' || rv.status === 'COMPLETED'
			);
			const hasPendingReservation = slot.reservations.some((rv) => rv.status === 'PENDING');
			const hasActiveReservation = hasConfirmedOrCompleted || hasPendingReservation;

			if (hasConfirmedOrCompleted) hasConfirmed = true;
			if (hasPendingReservation) hasPending = true;
			if (!hasActiveReservation) hasAvailable = true;
		}

		if (hasConfirmed || hasPending || hasAvailable) {
			result.set(date, {
				has_confirmed: hasConfirmed,
				has_pending: hasPending,
				has_available: hasAvailable
			});
		}
	}

	return result;
}
