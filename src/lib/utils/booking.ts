import type { MemberPass } from '$lib/types/member';
import type { AvailableSlot } from '$lib/types/reservation';
import { formatDate } from '$lib/utils/format';
import {
	getPendingCount,
	getReservationWeight,
	isDateInHolding,
	isPassBookable
} from '$lib/utils/pass';

// 예약이 막히는 이유. 서버(createReservation)가 던지는 PASS_PERIOD_INVALID / HOLDING_PERIOD /
// PASS_NO_REMAINING / SLOT_FULL 과 1:1로 대응한다 — 누르기 전에 같은 판정을 미리 보여주기 위함.
export type BookingBlockReason =
	| 'NO_PASS'
	| 'NOT_STARTED'
	| 'EXPIRED'
	| 'HOLDING'
	| 'NO_REMAINING'
	| 'FULL';

export interface BookingEligibility {
	bookable: boolean;
	reason: BookingBlockReason | null;
	// 안내 문구에 쓰는 기준 날짜 — EXPIRED는 end_date, NOT_STARTED는 start_date
	refDate?: string;
	// NO_REMAINING 안내에 쓰는 미처리 예약 건수
	pendingCount?: number;
}

// 여러 수강권이 각각 다른 이유로 막혔을 때 "예약에 가장 가까운" 사유를 고르기 위한 순위.
// 기간은 멀쩡한데 잔여만 없는 쪽이 더 실행 가능한 안내라서 앞에 둔다.
const REASON_PRIORITY: Record<BookingBlockReason, number> = {
	NO_REMAINING: 0,
	HOLDING: 1,
	NOT_STARTED: 2,
	EXPIRED: 3,
	FULL: 4,
	NO_PASS: 5
};

const BLOCK_LABELS: Record<BookingBlockReason, string> = {
	NO_PASS: '수강권 없음',
	NOT_STARTED: '시작 전',
	EXPIRED: '기간 만료',
	HOLDING: '홀딩',
	NO_REMAINING: '잔여 없음',
	FULL: '마감'
};

// 수강권 하나가 그 날짜에 왜 못 쓰이는지. 쓸 수 있으면 null.
// 통과 판정은 isPassBookable + isDateInHolding 그대로 쓰고, 사유만 추가로 분류한다.
function getPassBlockReason(pass: MemberPass, date: string): BookingBlockReason | null {
	if (isPassBookable(pass, date) && !isDateInHolding(pass, date)) return null;

	const target = date.slice(0, 10);
	if (pass.start_date && pass.start_date.slice(0, 10) > target) return 'NOT_STARTED';
	if (pass.status === 'EXPIRED') return 'EXPIRED';
	if (pass.end_date && pass.end_date.slice(0, 10) < target) return 'EXPIRED';
	if (pass.status === 'HOLDING' || isDateInHolding(pass, date)) return 'HOLDING';
	return 'NO_REMAINING';
}

function toEligibility(pass: MemberPass, reason: BookingBlockReason): BookingEligibility {
	if (reason === 'NOT_STARTED') return { bookable: false, reason, refDate: pass.start_date };
	if (reason === 'EXPIRED') return { bookable: false, reason, refDate: pass.end_date };
	if (reason === 'NO_REMAINING') {
		return { bookable: false, reason, pendingCount: getPendingCount(pass) };
	}
	return { bookable: false, reason };
}

// 해당 날짜에 쓸 수 있는 수강권 목록
export function getUsablePassesForDate(passes: MemberPass[], date: string): MemberPass[] {
	return passes.filter((pass) => getPassBlockReason(pass, date) === null);
}

// 강사가 지정된 레슨은 그 강사 담당 수강권을 우선 노출하되, 없으면 전체로 폴백한다.
// (서버가 강사 일치를 검증하지 않으므로 폴백해도 예약 자체는 성립한다)
export function getUsablePassesForSlot(
	passes: MemberPass[],
	slot: Pick<AvailableSlot, 'slot_date' | 'slot_type' | 'instructor_name'>
): MemberPass[] {
	const usable = getUsablePassesForDate(passes, slot.slot_date);
	if (slot.slot_type === 'ENSEMBLE' || !slot.instructor_name) return usable;
	const matched = usable.filter((pass) => pass.instructor_name === slot.instructor_name);
	return matched.length > 0 ? matched : usable;
}

// 날짜만 보는 판정 — 달력 점, 날짜 단위 안내 배너용
export function getDateEligibility(passes: MemberPass[], date: string): BookingEligibility {
	if (passes.length === 0) return { bookable: false, reason: 'NO_PASS' };

	let blocked: BookingEligibility | null = null;
	for (const pass of passes) {
		const reason = getPassBlockReason(pass, date);
		if (reason === null) return { bookable: true, reason: null };

		const candidate = toEligibility(pass, reason);
		const currentReason = blocked?.reason;
		if (!currentReason || REASON_PRIORITY[reason] < REASON_PRIORITY[currentReason]) {
			blocked = candidate;
		}
	}
	return blocked ?? { bookable: false, reason: 'NO_PASS' };
}

// 슬롯까지 보는 판정 — 슬롯 카드 배지, 클릭 시 토스트용. 정원 검사를 포함한다.
export function getSlotEligibility(
	passes: MemberPass[],
	slot: Pick<AvailableSlot, 'slot_date' | 'slot_type' | 'instructor_name' | 'remaining_capacity'>
): BookingEligibility {
	const byDate = getDateEligibility(passes, slot.slot_date);
	if (!byDate.bookable) return byDate;
	if (slot.slot_type === 'ENSEMBLE') return byDate;

	// 실제 예약에 쓰일 후보(강사 매칭 포함) 중 가장 가벼운 수강권도 못 들어가면 마감
	const candidates = getUsablePassesForSlot(passes, slot);
	const minWeight = candidates.reduce(
		(min, pass) =>
			Math.min(min, getReservationWeight(pass.pass_category, pass.ticket_value, slot.slot_type)),
		Number.POSITIVE_INFINITY
	);
	if (slot.remaining_capacity < minWeight) return { bookable: false, reason: 'FULL' };
	return byDate;
}

export function getBookingBlockMessage(eligibility: BookingEligibility): string {
	switch (eligibility.reason) {
		case 'NO_PASS':
			return '등록된 수강권이 없습니다.';
		case 'NOT_STARTED':
			return eligibility.refDate
				? `수강권 시작일(${formatDate(eligibility.refDate)}) 이후부터 예약할 수 있습니다.`
				: '수강권 시작일 이후부터 예약할 수 있습니다.';
		case 'EXPIRED':
			return eligibility.refDate
				? `수강권 유효기간이 ${formatDate(eligibility.refDate)}에 끝나 이 날짜는 예약할 수 없습니다.`
				: '수강권 유효기간이 지나 이 날짜는 예약할 수 없습니다.';
		case 'HOLDING':
			return '홀딩 기간에는 예약할 수 없습니다.';
		case 'NO_REMAINING':
			return eligibility.pendingCount
				? `남은 횟수를 이미 모두 예약했습니다. (예약중 ${eligibility.pendingCount}회)`
				: '예약 가능한 잔여 횟수가 없습니다.';
		case 'FULL':
			return '해당 시간은 예약이 마감되었습니다.';
		default:
			return '';
	}
}

export function getBookingBlockLabel(eligibility: BookingEligibility): string {
	return eligibility.reason ? BLOCK_LABELS[eligibility.reason] : '';
}
