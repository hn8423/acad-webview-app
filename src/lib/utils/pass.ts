import type { SlotType } from '$lib/types/reservation';

export function getPassStatusVariant(status: string): 'success' | 'warning' | 'info' | 'neutral' {
	switch (status) {
		case 'ACTIVE':
			return 'success';
		case 'HOLDING':
			return 'warning';
		case 'USED_UP':
			return 'info';
		case 'EXPIRED':
		case 'REFUNDED':
			return 'neutral';
		default:
			return 'neutral';
	}
}

// HOLDING은 홀딩(일시정지), REFUNDED는 환불이다.
// 홀딩 기능 도입 전에는 HOLDING을 환불 용도로 써서 '환불'로 표시했었다.
export function getPassStatusLabel(status: string): string {
	switch (status) {
		case 'ACTIVE':
			return '이용중';
		case 'HOLDING':
			return '홀딩';
		case 'USED_UP':
			return '소진';
		case 'EXPIRED':
			return '만료';
		case 'REFUNDED':
			return '환불';
		default:
			return status;
	}
}

export function getTicketValue(ticketValue?: number): number {
	return ticketValue && ticketValue > 0 ? ticketValue : 1;
}

export function getCapacityWeight(passCategory?: string, slotType?: SlotType): number {
	if (slotType === 'ENSEMBLE') return 1;
	switch (passCategory) {
		case 'FULL':
			return 1;
		case 'ROTATION':
			return 0.5;
		default:
			return 1;
	}
}

export function getReservationWeight(
	passCategory?: string,
	ticketValue?: number,
	slotType?: SlotType
): number {
	if (slotType === 'ENSEMBLE') return 1;
	return getCapacityWeight(passCategory) * getTicketValue(ticketValue);
}

// 추가 예약이 가능한 잔여 횟수.
// remaining_lessons는 수업 완료/노쇼 전환 시점에만 줄어들기 때문에, 아직 처리되지 않은
// 예약(PENDING/CONFIRMED)이 그대로 포함돼 있다. 서버가 보류분을 반영한 available_lessons를
// 내려주면 그것을 쓰고, 아직 내려주지 않는 응답(구버전)은 remaining_lessons로 폴백한다.
export function getAvailableLessons(pass: {
	remaining_lessons: number;
	available_lessons?: number;
}): number {
	return pass.available_lessons ?? pass.remaining_lessons;
}

// 아직 차감되지 않은 예약(보류)이 몇 건인지. 서버가 안 내려주면 0으로 본다.
export function getPendingCount(pass: { pending_count?: number }): number {
	return pass.pending_count ?? 0;
}

// targetDate 날짜에 사용 가능한 수강권 판정 (유효기간 양끝 포함).
// 백엔드 크론이 만료 수강권을 EXPIRED로 전환하지만, 크론 실행 전 시간창과
// stale 클라이언트 상태를 대비해 start_date/end_date도 함께 방어적으로 검사한다.
// 날짜는 UTC ISO 문자열('YYYY-MM-DD...' 형태) 전제 — slice(0, 10)으로 날짜부만 비교.
export function isPassUsable(
	pass: {
		status: string;
		remaining_lessons: number;
		// 보류분은 여기서 보지 않는다 (예약 가능 판정은 isPassBookable)
		available_lessons?: number;
		start_date?: string;
		end_date?: string;
	},
	targetDate: string
): boolean {
	if (pass.status !== 'ACTIVE' || pass.remaining_lessons <= 0) return false;
	const date = targetDate.slice(0, 10);
	if (pass.start_date && pass.start_date.slice(0, 10) > date) return false;
	return !pass.end_date || pass.end_date.slice(0, 10) >= date;
}

// 추가 예약을 걸 수 있는지 판정 — 유효한 수강권이면서 보류분을 뺀 잔여가 남아 있어야 한다.
// isPassUsable과 분리한 이유: 잔여가 전부 예약으로 묶인 수강권도 '유효한 수강권'이므로
// 목록에서는 이용 가능으로 보여야 하고, 예약 화면에서만 선택 불가로 막아야 한다.
export function isPassBookable(
	pass: {
		status: string;
		remaining_lessons: number;
		available_lessons?: number;
		start_date?: string;
		end_date?: string;
	},
	targetDate: string
): boolean {
	return isPassUsable(pass, targetDate) && getAvailableLessons(pass) > 0;
}

// ===== 홀딩 =====

const DAY_MS = 24 * 60 * 60 * 1000;

// 홀딩 일수는 종료일을 포함한다 (2/15~2/28 = 14일) — 만료일 연장 일수와 일치시키기 위함.
// 백엔드 validateHoldingPeriod와 같은 규칙. 형식이 잘못됐거나 종료일이 앞서면 0.
export function calcHoldingDays(start: string, end: string): number {
	if (!start || !end) return 0;
	const startMs = Date.parse(`${start.slice(0, 10)}T00:00:00.000Z`);
	const endMs = Date.parse(`${end.slice(0, 10)}T00:00:00.000Z`);
	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return 0;
	return Math.round((endMs - startMs) / DAY_MS) + 1;
}

// 'YYYY-MM-DD'에 일수를 더한 날짜 문자열. UTC 기준이라 서버 날짜 계산과 어긋나지 않는다.
export function addDays(date: string, days: number): string {
	const ms = Date.parse(`${date.slice(0, 10)}T00:00:00.000Z`);
	if (Number.isNaN(ms)) return '';
	return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

// 서버가 remaining_hold_days를 안 내려주는 구버전 응답을 위한 폴백 계산
export function getRemainingHoldDays(pass: {
	hold_days?: number;
	hold_used_days?: number;
	remaining_hold_days?: number;
}): number {
	if (pass.remaining_hold_days !== undefined) return Math.max(0, pass.remaining_hold_days);
	return Math.max(0, (pass.hold_days ?? 0) - (pass.hold_used_days ?? 0));
}

// 해당 날짜가 이 수강권의 홀딩 구간(양끝 포함)에 걸리는지.
// 진행 중 홀딩은 status로 이미 걸러지지만, 시작 전 홀딩은 status가 ACTIVE라 여기서 막아야 한다.
// 서버도 createReservation에서 같은 검사를 하므로 이건 UX 보조다.
export function isDateInHolding(
	pass: { holdings?: Array<{ holding_start: string; holding_end: string }> },
	targetDate: string
): boolean {
	if (!pass.holdings?.length) return false;
	const date = targetDate.slice(0, 10);
	return pass.holdings.some(
		(h) => h.holding_start.slice(0, 10) <= date && h.holding_end.slice(0, 10) >= date
	);
}

// 홀딩을 신청할 수 있는 수강권인지 — 이용 중이고 잔여 홀딩 일수가 남아 있어야 한다
export function isHoldable(pass: {
	status: string;
	hold_days?: number;
	hold_used_days?: number;
	remaining_hold_days?: number;
}): boolean {
	return pass.status === 'ACTIVE' && getRemainingHoldDays(pass) > 0;
}

// 관리자 수강권 수정에서 만료 '전환' 판정 — EXPIRED로 새로 바뀔 때만 true
// (백엔드가 이 전환 시 미처리 예약을 자동 취소하므로 확인 모달 노출 기준으로 사용)
export function isExpireTransition(oldStatus: string, newStatus: string): boolean {
	return newStatus === 'EXPIRED' && oldStatus !== 'EXPIRED';
}

// 표시용 상태 — status가 ACTIVE라도 기간이 지났으면 만료로 취급 (크론 실행 전 시간창 방어)
export function getEffectivePassStatus(
	pass: { status: string; end_date?: string },
	today: string
): string {
	if (
		pass.status === 'ACTIVE' &&
		pass.end_date &&
		pass.end_date.slice(0, 10) < today.slice(0, 10)
	) {
		return 'EXPIRED';
	}
	return pass.status;
}

export function isActiveReservationStatus(status: string): boolean {
	return status === 'PENDING' || status === 'CONFIRMED';
}

export function isCapacityOccupyingStatus(status: string): boolean {
	return status === 'PENDING' || status === 'CONFIRMED' || status === 'COMPLETED';
}

export type PassCategory = 'ROTATION' | 'FULL';
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// 표시명은 수강생/강사/관리자 화면 전부 동일하다.
// DB에 저장되는 값(ROTATION/FULL)은 정원 가중치 계산에 쓰이므로 그대로 두고 라벨만 바꾼다.
const CATEGORY_LABELS: Record<PassCategory, string> = {
	ROTATION: '취미반',
	FULL: '전문반'
};

const CATEGORY_VARIANTS: Record<PassCategory, BadgeVariant> = {
	ROTATION: 'info',
	FULL: 'success'
};

export function getPassCategoryLabel(category: string): string {
	return CATEGORY_LABELS[category as PassCategory] ?? category;
}

// 카테고리를 알 수 없을 때만 DB의 pass_name으로 대체한다.
export function getPassDisplayName(passName?: string, passCategory?: string): string {
	return CATEGORY_LABELS[passCategory as PassCategory] ?? passName ?? '';
}

export function getPassCategoryVariant(category: string): BadgeVariant {
	return CATEGORY_VARIANTS[category as PassCategory] ?? 'neutral';
}

export const LOW_REMAINING_THRESHOLD = 2;

export function getPassBadgeVariant(category: string, remainingLessons: number): BadgeVariant {
	return remainingLessons <= LOW_REMAINING_THRESHOLD ? 'danger' : getPassCategoryVariant(category);
}
