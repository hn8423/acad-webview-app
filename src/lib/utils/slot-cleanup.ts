import { z } from 'zod';
import type {
	BulkDeleteSlotsRequest,
	BulkDeleteSlotsResponse,
	ScheduleSlot,
	UpcomingSlot
} from '$lib/types/reservation';

// 서버 MAX_BULK_DELETE_SLOTS 와 같은 값. 이보다 많으면 나눠서 보낸다.
export const MAX_BULK_DELETE_SLOTS = 200;
export const CANCEL_REASON_MAX = 500;

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'];
// 출결이 끝난 예약이 있는 수업은 이력이라 서버가 삭제를 거부한다
const ATTENDED_STATUSES = ['COMPLETED', 'NO_SHOW'];

export const bulkDeleteSlotsSchema = z.object({
	slot_ids: z.array(z.number().int().positive()).min(1).max(MAX_BULK_DELETE_SLOTS),
	confirmed_reservation_ids: z.array(z.number().int().positive()).min(1).optional(),
	cancel_reason: z.string().trim().min(1).max(CANCEL_REASON_MAX).optional()
});

export function hasReservations(slot: UpcomingSlot): boolean {
	return slot.reservations.length > 0;
}

export function splitByReservation(slots: UpcomingSlot[]): {
	empty: UpcomingSlot[];
	reserved: UpcomingSlot[];
} {
	return {
		empty: slots.filter((s) => !hasReservations(s)),
		reserved: slots.filter(hasReservations)
	};
}

export function groupSlotsByDate(slots: UpcomingSlot[]): { date: string; slots: UpcomingSlot[] }[] {
	const dates = [...new Set(slots.map((s) => s.slot_date))];
	return dates.map((date) => ({ date, slots: slots.filter((s) => s.slot_date === date) }));
}

/**
 * 삭제 요청 본문을 만든다. 확인 모달에 보여준 예약만 confirmed_reservation_ids 로 보낸다 —
 * 그사이 들어온 예약은 이 목록에 없으므로 서버가 409로 막고, 모르는 예약이 취소되지 않는다.
 */
export function buildBulkDeleteRequests(
	slots: UpcomingSlot[],
	reason: string
): BulkDeleteSlotsRequest[] {
	const trimmed = reason.trim();
	const chunks = Array.from({ length: Math.ceil(slots.length / MAX_BULK_DELETE_SLOTS) }, (_, i) =>
		slots.slice(i * MAX_BULK_DELETE_SLOTS, (i + 1) * MAX_BULK_DELETE_SLOTS)
	);
	return chunks.map((chunk) => {
		const reservationIds = chunk.flatMap((s) => s.reservations.map((r) => r.reservation_id));
		const hasConfirmed = reservationIds.length > 0;
		return bulkDeleteSlotsSchema.parse({
			slot_ids: chunk.map((s) => s.slot_id),
			...(hasConfirmed ? { confirmed_reservation_ids: reservationIds } : {}),
			...(hasConfirmed && trimmed ? { cancel_reason: trimmed } : {})
		});
	});
}

export function sumDeleteResults(results: BulkDeleteSlotsResponse[]): BulkDeleteSlotsResponse {
	return results.reduce(
		(sum, r) => ({
			deleted_slot_count: sum.deleted_slot_count + r.deleted_slot_count,
			cancelled_reservation_count: sum.cancelled_reservation_count + r.cancelled_reservation_count
		}),
		{ deleted_slot_count: 0, cancelled_reservation_count: 0 }
	);
}

export function formatDeleteResult(result: BulkDeleteSlotsResponse): string {
	const base = `수업 ${result.deleted_slot_count}건을 삭제했습니다.`;
	return result.cancelled_reservation_count > 0
		? `${base} (예약 ${result.cancelled_reservation_count}건 취소)`
		: base;
}

// 강사 스케줄 화면에서 삭제 버튼을 보여줄지 — 지난 날짜나 출결 처리된 수업은 이력으로 남긴다
export function isDeletableScheduleSlot(slot: ScheduleSlot, date: string, today: string): boolean {
	if (date < today) return false;
	return !(slot.reservations ?? []).some((r) => ATTENDED_STATUSES.includes(r.status));
}

export function toUpcomingSlot(slot: ScheduleSlot, date: string): UpcomingSlot {
	return {
		slot_id: slot.slot_id,
		slot_date: date,
		start_time: slot.start_time,
		end_time: slot.end_time,
		slot_type: slot.slot_type,
		status: slot.status,
		max_capacity: slot.max_capacity,
		current_count: slot.current_count,
		reservations: (slot.reservations ?? [])
			.filter((r) => ACTIVE_STATUSES.includes(r.status))
			.map((r) => ({
				reservation_id: r.reservation_id,
				member_name: r.member_name,
				status: r.status
			}))
	};
}
