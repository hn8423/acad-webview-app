import { describe, expect, it } from 'vitest';
import {
	MAX_RECURRING_COUNT,
	canRepeatSlot,
	formatRecurringResult,
	getAvailableSlotIds,
	getMaxRecurringCount,
	getRecurringStatusLabel,
	recurringPreviewSchema,
	recurringReservationSchema
} from './recurring';
import type { RecurringPreviewItem } from '$lib/types/reservation';

describe('getMaxRecurringCount', () => {
	it('예약 가능 횟수와 최대 12회 중 작은 값', () => {
		expect(getMaxRecurringCount({ remaining_lessons: 20, available_lessons: 5 })).toBe(5);
		expect(getMaxRecurringCount({ remaining_lessons: 30 })).toBe(MAX_RECURRING_COUNT);
	});

	it('예약 가능 횟수가 음수면 0', () => {
		expect(getMaxRecurringCount({ remaining_lessons: 1, available_lessons: -1 })).toBe(0);
	});
});

describe('canRepeatSlot', () => {
	const slot = { slot_type: 'REGULAR' as const, instructor_name: 'Joe' };
	const pass = { remaining_lessons: 4, available_lessons: 4 };

	it('강사가 지정된 정규 수업 + 2회 이상 가능할 때만 반복할 수 있다', () => {
		expect(canRepeatSlot(slot, pass)).toBe(true);
		expect(canRepeatSlot({ ...slot, slot_type: 'ENSEMBLE' }, pass)).toBe(false);
		expect(canRepeatSlot({ ...slot, instructor_name: null }, pass)).toBe(false);
		expect(canRepeatSlot(slot, { remaining_lessons: 1, available_lessons: 1 })).toBe(false);
		expect(canRepeatSlot(slot, null)).toBe(false);
	});
});

describe('getRecurringStatusLabel', () => {
	it('사유별 한글 라벨', () => {
		expect(getRecurringStatusLabel('AVAILABLE')).toBe('예약 가능');
		expect(getRecurringStatusLabel('NO_SLOT')).toBe('수업 없음');
		expect(getRecurringStatusLabel('NO_REMAINING')).toBe('잔여 부족');
		expect(getRecurringStatusLabel('HOLDING')).toBe('홀딩');
		expect(getRecurringStatusLabel('FULL')).toBe('마감');
		expect(getRecurringStatusLabel('ALREADY_BOOKED')).toBe('예약됨');
	});
});

describe('getAvailableSlotIds', () => {
	it('AVAILABLE 이면서 slot_id 가 있는 회차만', () => {
		const items: RecurringPreviewItem[] = [
			{ slot_id: 1, slot_date: '2026-10-06', status: 'AVAILABLE' },
			{ slot_id: null, slot_date: '2026-10-13', status: 'NO_SLOT' },
			{ slot_id: 3, slot_date: '2026-10-20', status: 'FULL' },
			{ slot_id: 4, slot_date: '2026-10-27', status: 'AVAILABLE' }
		];
		expect(getAvailableSlotIds(items)).toEqual([1, 4]);
	});
});

describe('formatRecurringResult', () => {
	const created = (n: number) =>
		Array.from({ length: n }, (_, i) => ({ reservation_id: i, slot_id: i, slot_date: '' }));
	const skipped = (n: number) =>
		Array.from({ length: n }, (_, i) => ({
			slot_id: i,
			slot_date: null,
			reason: 'FULL' as const
		}));

	it('제외 건이 있으면 함께 알린다', () => {
		expect(formatRecurringResult({ created: created(3), skipped: skipped(1) })).toBe(
			'3건 예약 완료 · 1건 제외'
		);
	});

	it('모두 성공', () => {
		expect(formatRecurringResult({ created: created(4), skipped: [] })).toBe('4건 예약 완료');
	});

	it('하나도 예약되지 않음', () => {
		expect(formatRecurringResult({ created: [], skipped: skipped(2) })).toBe(
			'예약 가능한 회차가 없습니다'
		);
	});
});

describe('recurringPreviewSchema', () => {
	it('count 2~12 정수만 허용', () => {
		const base = { slot_id: 1, member_pass_id: 2 };
		expect(recurringPreviewSchema.safeParse({ ...base, count: 4 }).success).toBe(true);
		expect(recurringPreviewSchema.safeParse({ ...base, count: 1 }).success).toBe(false);
		expect(recurringPreviewSchema.safeParse({ ...base, count: 13 }).success).toBe(false);
		expect(recurringPreviewSchema.safeParse({ ...base, count: 2.5 }).success).toBe(false);
	});
});

describe('recurringReservationSchema', () => {
	it('slot_ids 는 1~12개, 중복 불가', () => {
		const parse = (slot_ids: number[]) =>
			recurringReservationSchema.safeParse({ member_pass_id: 1, slot_ids }).success;
		expect(parse([1, 2])).toBe(true);
		expect(parse([])).toBe(false);
		expect(parse([1, 1])).toBe(false);
		expect(parse(Array.from({ length: 13 }, (_, i) => i + 1))).toBe(false);
	});
});
