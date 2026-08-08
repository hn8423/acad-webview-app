import { describe, it, expect } from 'vitest';
import {
	getBookingBlockLabel,
	getBookingBlockMessage,
	getDateEligibility,
	getSlotEligibility,
	getUsablePassesForDate,
	getUsablePassesForSlot
} from './booking';
import type { MemberPass } from '$lib/types/member';
import type { AvailableSlot } from '$lib/types/reservation';

function makePass(overrides: Partial<MemberPass> = {}): MemberPass {
	return {
		id: 1,
		pass_name: '취미반 1개월',
		pass_category: 'ROTATION',
		ticket_value: 1,
		instructor_id: 7,
		instructor_name: 'Joe',
		start_date: '2026-07-11',
		end_date: '2026-08-08',
		total_lessons: 4,
		remaining_lessons: 1,
		available_lessons: 1,
		pending_count: 0,
		status: 'ACTIVE',
		...overrides
	};
}

function makeSlot(overrides: Partial<AvailableSlot> = {}): AvailableSlot {
	return {
		slot_id: 100,
		slot_type: 'REGULAR',
		instructor_name: 'Joe',
		slot_date: '2026-08-05',
		start_time: '21:00',
		end_time: '22:00',
		remaining_capacity: 1,
		...overrides
	};
}

describe('getDateEligibility', () => {
	it('should be bookable within the pass period', () => {
		expect(getDateEligibility([makePass()], '2026-08-05')).toEqual({
			bookable: true,
			reason: null
		});
	});

	it('should be bookable on the expiry date itself (inclusive)', () => {
		expect(getDateEligibility([makePass()], '2026-08-08').bookable).toBe(true);
	});

	// 제보 재현: 유효기간 2026.07.11~2026.08.08 수강권으로 08.10을 예약하려던 케이스
	it('should report EXPIRED for a date past the pass end_date', () => {
		expect(getDateEligibility([makePass()], '2026-08-10')).toEqual({
			bookable: false,
			reason: 'EXPIRED',
			refDate: '2026-08-08'
		});
	});

	it('should report NOT_STARTED before the pass start_date', () => {
		expect(getDateEligibility([makePass()], '2026-07-01')).toEqual({
			bookable: false,
			reason: 'NOT_STARTED',
			refDate: '2026-07-11'
		});
	});

	it('should report HOLDING for a date inside a holding period', () => {
		const pass = makePass({
			holdings: [{ holding_start: '2026-08-01', holding_end: '2026-08-06' }]
		});
		expect(getDateEligibility([pass], '2026-08-05')).toEqual({
			bookable: false,
			reason: 'HOLDING'
		});
	});

	it('should report NO_REMAINING when every remaining lesson is already reserved', () => {
		const pass = makePass({ remaining_lessons: 1, available_lessons: 0, pending_count: 1 });
		expect(getDateEligibility([pass], '2026-08-05')).toEqual({
			bookable: false,
			reason: 'NO_REMAINING',
			pendingCount: 1
		});
	});

	it('should report NO_PASS when the member has no passes at all', () => {
		expect(getDateEligibility([], '2026-08-05')).toEqual({ bookable: false, reason: 'NO_PASS' });
	});

	it('should be bookable when at least one of several passes works', () => {
		const expired = makePass({ id: 1, end_date: '2026-07-31' });
		const valid = makePass({ id: 2, end_date: '2026-09-30' });
		expect(getDateEligibility([expired, valid], '2026-08-05').bookable).toBe(true);
	});

	it('should prefer the most actionable reason when all passes are blocked', () => {
		const expired = makePass({ id: 1, end_date: '2026-07-31' });
		const noRemaining = makePass({ id: 2, available_lessons: 0, pending_count: 1 });
		expect(getDateEligibility([expired, noRemaining], '2026-08-05').reason).toBe('NO_REMAINING');
	});

	it('should treat an EXPIRED status pass as expired even before its end_date', () => {
		const pass = makePass({ status: 'EXPIRED' });
		expect(getDateEligibility([pass], '2026-08-05').reason).toBe('EXPIRED');
	});
});

describe('getSlotEligibility', () => {
	it('should be bookable when capacity is left', () => {
		expect(getSlotEligibility([makePass()], makeSlot()).bookable).toBe(true);
	});

	it('should report FULL when the lightest usable pass does not fit', () => {
		// 취미반(ROTATION)은 0.5 가중치라 남은 정원 0.4에는 못 들어간다
		const slot = makeSlot({ remaining_capacity: 0.4 });
		expect(getSlotEligibility([makePass()], slot)).toEqual({ bookable: false, reason: 'FULL' });
	});

	it('should fit a rotation pass into half-remaining capacity', () => {
		const slot = makeSlot({ remaining_capacity: 0.5 });
		expect(getSlotEligibility([makePass()], slot).bookable).toBe(true);
	});

	it('should skip the capacity check for ensemble slots', () => {
		const slot = makeSlot({ slot_type: 'ENSEMBLE', instructor_name: null, remaining_capacity: 0 });
		expect(getSlotEligibility([makePass()], slot).bookable).toBe(true);
	});

	it('should keep the date reason over the capacity reason', () => {
		const slot = makeSlot({ slot_date: '2026-08-10', remaining_capacity: 0 });
		expect(getSlotEligibility([makePass()], slot).reason).toBe('EXPIRED');
	});

	it('should report FULL when the member has no pass usable for the slot date', () => {
		// 날짜는 유효하지만 후보 수강권이 하나도 안 남는 경우에도 예약 불가로 떨어져야 한다
		const slot = makeSlot({ remaining_capacity: 0 });
		expect(getSlotEligibility([makePass()], slot).bookable).toBe(false);
	});
});

describe('getUsablePassesForDate', () => {
	it('should keep only passes valid on that date', () => {
		const expired = makePass({ id: 1, end_date: '2026-07-31' });
		const valid = makePass({ id: 2 });
		expect(getUsablePassesForDate([expired, valid], '2026-08-05').map((p) => p.id)).toEqual([2]);
	});
});

describe('getUsablePassesForSlot', () => {
	it('should prefer passes matching the slot instructor', () => {
		const joe = makePass({ id: 1, instructor_name: 'Joe' });
		const michael = makePass({ id: 2, instructor_name: 'Michael' });
		const slot = makeSlot({ instructor_name: 'Michael' });
		expect(getUsablePassesForSlot([joe, michael], slot).map((p) => p.id)).toEqual([2]);
	});

	it('should fall back to every usable pass when no instructor matches', () => {
		const joe = makePass({ id: 1, instructor_name: 'Joe' });
		const slot = makeSlot({ instructor_name: 'Michael' });
		expect(getUsablePassesForSlot([joe], slot).map((p) => p.id)).toEqual([1]);
	});

	it('should not narrow by instructor for ensemble slots', () => {
		const joe = makePass({ id: 1, instructor_name: 'Joe' });
		const michael = makePass({ id: 2, instructor_name: 'Michael' });
		const slot = makeSlot({ slot_type: 'ENSEMBLE', instructor_name: null });
		expect(getUsablePassesForSlot([joe, michael], slot).map((p) => p.id)).toEqual([1, 2]);
	});
});

describe('getBookingBlockMessage', () => {
	it('should name the expiry date so the real reason is obvious', () => {
		const message = getBookingBlockMessage(getDateEligibility([makePass()], '2026-08-10'));
		expect(message).toContain('2026.08.08');
	});

	it('should name the start date when the pass has not started', () => {
		const message = getBookingBlockMessage(getDateEligibility([makePass()], '2026-07-01'));
		expect(message).toContain('2026.07.11');
	});

	it('should mention the pending count when nothing is left to book', () => {
		const pass = makePass({ available_lessons: 0, pending_count: 1 });
		const message = getBookingBlockMessage(getDateEligibility([pass], '2026-08-05'));
		expect(message).toContain('예약중 1회');
	});

	it('should return an empty string when nothing is blocked', () => {
		expect(getBookingBlockMessage({ bookable: true, reason: null })).toBe('');
	});
});

describe('getBookingBlockLabel', () => {
	it('should return a short badge label per reason', () => {
		expect(getBookingBlockLabel({ bookable: false, reason: 'EXPIRED' })).toBe('기간 만료');
		expect(getBookingBlockLabel({ bookable: false, reason: 'NO_REMAINING' })).toBe('잔여 없음');
		expect(getBookingBlockLabel({ bookable: false, reason: 'FULL' })).toBe('마감');
		expect(getBookingBlockLabel({ bookable: true, reason: null })).toBe('');
	});
});
