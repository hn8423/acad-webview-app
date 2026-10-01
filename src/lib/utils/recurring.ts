import { z } from 'zod';
import type {
	RecurringItemStatus,
	RecurringPreviewItem,
	RecurringReservationResponse,
	SlotType
} from '$lib/types/reservation';
import { getAvailableLessons } from '$lib/utils/pass';

// 서버 MAX_RECURRING_COUNT 와 같은 값. 기준 회차를 포함한 횟수다.
export const MIN_RECURRING_COUNT = 2;
export const MAX_RECURRING_COUNT = 12;

const STATUS_LABELS: Record<RecurringItemStatus, string> = {
	AVAILABLE: '예약 가능',
	NO_SLOT: '수업 없음',
	SLOT_CLOSED: '예약 불가',
	PAST: '지난 수업',
	OUT_OF_PASS_PERIOD: '기간 외',
	HOLDING: '홀딩',
	ALREADY_BOOKED: '예약됨',
	NO_REMAINING: '잔여 부족',
	FULL: '마감'
};

const idSchema = z.number().int().positive();

export const recurringPreviewSchema = z.object({
	slot_id: idSchema,
	member_pass_id: idSchema,
	count: z.number().int().min(MIN_RECURRING_COUNT).max(MAX_RECURRING_COUNT)
});

export const recurringReservationSchema = z.object({
	member_pass_id: idSchema,
	slot_ids: z
		.array(idSchema)
		.min(1)
		.max(MAX_RECURRING_COUNT)
		.refine((ids) => new Set(ids).size === ids.length, '중복된 회차가 있습니다')
});

// 이 수강권으로 한 번에 예약할 수 있는 최대 회차 수.
// 서버는 "잔여 - 미처리 예약" 만큼만 받아주므로 그 이상은 고를 수 없게 한다.
export function getMaxRecurringCount(pass: {
	remaining_lessons: number;
	available_lessons?: number;
}): number {
	return Math.max(0, Math.min(MAX_RECURRING_COUNT, getAvailableLessons(pass)));
}

// 강사가 지정된 정규 수업이고, 2회 이상 예약할 여유가 있을 때만 반복을 제안한다
export function canRepeatSlot(
	slot: { slot_type: SlotType; instructor_name: string | null },
	pass: { remaining_lessons: number; available_lessons?: number } | null
): boolean {
	if (slot.slot_type !== 'REGULAR' || !slot.instructor_name || !pass) return false;
	return getMaxRecurringCount(pass) >= MIN_RECURRING_COUNT;
}

export function getRecurringStatusLabel(status: RecurringItemStatus): string {
	return STATUS_LABELS[status];
}

export function getAvailableSlotIds(items: RecurringPreviewItem[]): number[] {
	return items
		.filter((item) => item.status === 'AVAILABLE' && item.slot_id !== null)
		.map((item) => item.slot_id as number);
}

export function formatRecurringResult(result: RecurringReservationResponse): string {
	const created = result.created.length;
	const skipped = result.skipped.length;
	if (created === 0) return '예약 가능한 회차가 없습니다';
	return skipped > 0 ? `${created}건 예약 완료 · ${skipped}건 제외` : `${created}건 예약 완료`;
}
