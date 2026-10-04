import { describe, expect, it } from 'vitest';
import {
	MAX_BULK_DELETE_SLOTS,
	buildBulkDeleteRequests,
	bulkDeleteSlotsSchema,
	formatDeleteResult,
	groupSlotsByDate,
	isDeletableScheduleSlot,
	splitByReservation,
	sumDeleteResults,
	toUpcomingSlot
} from './slot-cleanup';
import type { ScheduleSlot, UpcomingSlot } from '$lib/types/reservation';

function makeSlot(id: number, overrides: Partial<UpcomingSlot> = {}): UpcomingSlot {
	return {
		slot_id: id,
		slot_date: '2026-10-05',
		start_time: '14:00',
		end_time: '15:00',
		slot_type: 'REGULAR',
		status: 'OPEN',
		max_capacity: 1,
		current_count: 0,
		reservations: [],
		...overrides
	};
}

const reserved = (id: number, name = '홍길동') =>
	makeSlot(id, {
		current_count: 1,
		reservations: [{ reservation_id: id * 10, member_name: name, status: 'CONFIRMED' }]
	});

describe('splitByReservation', () => {
	it('예약 없는 수업과 예약 있는 수업을 나눈다', () => {
		const { empty, reserved: withBooking } = splitByReservation([
			makeSlot(1),
			reserved(2),
			makeSlot(3)
		]);
		expect(empty.map((s) => s.slot_id)).toEqual([1, 3]);
		expect(withBooking.map((s) => s.slot_id)).toEqual([2]);
	});
});

describe('groupSlotsByDate', () => {
	it('날짜별로 묶고 입력 순서를 유지한다', () => {
		const groups = groupSlotsByDate([
			makeSlot(1, { slot_date: '2026-10-05' }),
			makeSlot(2, { slot_date: '2026-10-06' }),
			makeSlot(3, { slot_date: '2026-10-05', start_time: '18:00' })
		]);
		expect(groups).toEqual([
			{
				date: '2026-10-05',
				slots: [expect.objectContaining({ slot_id: 1 }), expect.objectContaining({ slot_id: 3 })]
			},
			{ date: '2026-10-06', slots: [expect.objectContaining({ slot_id: 2 })] }
		]);
	});

	it('빈 목록이면 빈 배열', () => {
		expect(groupSlotsByDate([])).toEqual([]);
	});
});

describe('buildBulkDeleteRequests', () => {
	it('예약 없는 수업만이면 슬롯 id만 보내고 사유는 보내지 않는다', () => {
		expect(buildBulkDeleteRequests([makeSlot(1), makeSlot(2)], ' 강사 퇴사 ')).toEqual([
			{ slot_ids: [1, 2] }
		]);
	});

	it('예약 있는 수업이 섞이면 확인한 예약 id와 다듬은 사유를 보낸다', () => {
		expect(buildBulkDeleteRequests([makeSlot(1), reserved(2)], ' 강사 퇴사 ')).toEqual([
			{ slot_ids: [1, 2], confirmed_reservation_ids: [20], cancel_reason: '강사 퇴사' }
		]);
	});

	it('사유가 비어 있으면 서버 기본 사유를 쓰도록 보내지 않는다', () => {
		expect(buildBulkDeleteRequests([reserved(2)], '   ')).toEqual([
			{ slot_ids: [2], confirmed_reservation_ids: [20] }
		]);
	});

	it('서버 한도를 넘으면 여러 요청으로 나눈다', () => {
		const slots = Array.from({ length: MAX_BULK_DELETE_SLOTS + 5 }, (_, i) => makeSlot(i + 1));
		const requests = buildBulkDeleteRequests(slots, '');
		expect(requests).toHaveLength(2);
		expect(requests[0].slot_ids).toHaveLength(MAX_BULK_DELETE_SLOTS);
		expect(requests[1].slot_ids).toHaveLength(5);
	});

	it('빈 목록이면 요청을 만들지 않는다', () => {
		expect(buildBulkDeleteRequests([], '')).toEqual([]);
	});
});

describe('bulkDeleteSlotsSchema', () => {
	it('slot_ids 가 비었거나 양의 정수가 아니면 거부한다', () => {
		expect(bulkDeleteSlotsSchema.safeParse({ slot_ids: [] }).success).toBe(false);
		expect(bulkDeleteSlotsSchema.safeParse({ slot_ids: [0] }).success).toBe(false);
		expect(
			bulkDeleteSlotsSchema.safeParse({ slot_ids: [1], confirmed_reservation_ids: [-1] }).success
		).toBe(false);
	});

	it('사유는 500자까지', () => {
		const base = { slot_ids: [1], confirmed_reservation_ids: [10] };
		expect(
			bulkDeleteSlotsSchema.safeParse({ ...base, cancel_reason: 'a'.repeat(500) }).success
		).toBe(true);
		expect(
			bulkDeleteSlotsSchema.safeParse({ ...base, cancel_reason: 'a'.repeat(501) }).success
		).toBe(false);
	});
});

describe('sumDeleteResults / formatDeleteResult', () => {
	it('나눠 보낸 결과를 합친다', () => {
		expect(
			sumDeleteResults([
				{ deleted_slot_count: 200, cancelled_reservation_count: 1 },
				{ deleted_slot_count: 5, cancelled_reservation_count: 0 }
			])
		).toEqual({ deleted_slot_count: 205, cancelled_reservation_count: 1 });
	});

	it('취소된 예약이 있을 때만 건수를 덧붙인다', () => {
		expect(formatDeleteResult({ deleted_slot_count: 3, cancelled_reservation_count: 0 })).toBe(
			'수업 3건을 삭제했습니다.'
		);
		expect(formatDeleteResult({ deleted_slot_count: 3, cancelled_reservation_count: 2 })).toBe(
			'수업 3건을 삭제했습니다. (예약 2건 취소)'
		);
	});
});

describe('isDeletableScheduleSlot / toUpcomingSlot', () => {
	const scheduleSlot = (overrides: Partial<ScheduleSlot> = {}): ScheduleSlot => ({
		slot_id: 9,
		instructor_id: 5,
		instructor_name: 'Effy',
		slot_type: 'REGULAR',
		start_time: '14:00',
		end_time: '15:00',
		max_capacity: 1,
		current_count: 1,
		status: 'OPEN',
		reservations: [
			{
				reservation_id: 1,
				member_name: '홍길동',
				pass_category: null,
				status: 'PENDING',
				sequence: 1
			},
			{
				reservation_id: 2,
				member_name: '김철수',
				pass_category: null,
				status: 'CANCELLED',
				sequence: null
			}
		],
		...overrides
	});

	it('오늘 이후이고 출결 처리된 예약이 없을 때만 삭제할 수 있다', () => {
		expect(isDeletableScheduleSlot(scheduleSlot(), '2026-10-03', '2026-10-03')).toBe(true);
		expect(isDeletableScheduleSlot(scheduleSlot(), '2026-10-02', '2026-10-03')).toBe(false);
		const attended = scheduleSlot({
			reservations: [
				{
					reservation_id: 1,
					member_name: '홍길동',
					pass_category: null,
					status: 'COMPLETED',
					sequence: 1
				}
			]
		});
		expect(isDeletableScheduleSlot(attended, '2026-10-05', '2026-10-03')).toBe(false);
	});

	it('일정 슬롯을 정리용 슬롯으로 바꾸며 진행 전 예약만 남긴다', () => {
		expect(toUpcomingSlot(scheduleSlot(), '2026-10-05')).toEqual({
			slot_id: 9,
			slot_date: '2026-10-05',
			start_time: '14:00',
			end_time: '15:00',
			slot_type: 'REGULAR',
			status: 'OPEN',
			max_capacity: 1,
			current_count: 1,
			reservations: [{ reservation_id: 1, member_name: '홍길동', status: 'PENDING' }]
		});
	});
});
