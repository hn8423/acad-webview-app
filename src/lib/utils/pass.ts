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
			return 'neutral';
		default:
			return 'neutral';
	}
}

export function getPassStatusLabel(status: string): string {
	switch (status) {
		case 'ACTIVE':
			return '이용중';
		case 'HOLDING':
			return '환불';
		case 'USED_UP':
			return '소진';
		case 'EXPIRED':
			return '만료';
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

// 예약에 사용 가능한 수강권 판정.
// 백엔드 크론이 만료 수강권을 EXPIRED로 전환하지만, 크론 실행 전 시간창과
// stale 클라이언트 상태를 대비해 end_date도 함께 방어적으로 검사한다.
export function isPassUsable(
	pass: { status: string; remaining_lessons: number; end_date?: string },
	today: string
): boolean {
	if (pass.status !== 'ACTIVE' || pass.remaining_lessons <= 0) return false;
	if (!pass.end_date) return true;
	return pass.end_date.slice(0, 10) >= today;
}

export function isActiveReservationStatus(status: string): boolean {
	return status === 'PENDING' || status === 'CONFIRMED';
}

export function isCapacityOccupyingStatus(status: string): boolean {
	return status === 'PENDING' || status === 'CONFIRMED' || status === 'COMPLETED';
}

export type PassCategory = 'ROTATION' | 'FULL';
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const CATEGORY_LABELS: Record<PassCategory, string> = {
	ROTATION: '로테이션',
	FULL: '풀타임'
};

const CATEGORY_VARIANTS: Record<PassCategory, BadgeVariant> = {
	ROTATION: 'info',
	FULL: 'success'
};

export function getPassCategoryLabel(category: string): string {
	return CATEGORY_LABELS[category as PassCategory] ?? category;
}

// 유저(/app) 화면 전용 표시명 — DB pass_name 대신 카테고리 기반 이름으로 대체
const CATEGORY_DISPLAY_NAMES: Record<PassCategory, string> = {
	ROTATION: '취미반',
	FULL: '전문반'
};

export function getPassDisplayName(passName?: string, passCategory?: string): string {
	return CATEGORY_DISPLAY_NAMES[passCategory as PassCategory] ?? passName ?? '';
}

export function getPassCategoryVariant(category: string): BadgeVariant {
	return CATEGORY_VARIANTS[category as PassCategory] ?? 'neutral';
}

export const LOW_REMAINING_THRESHOLD = 2;

export function getPassBadgeVariant(category: string, remainingLessons: number): BadgeVariant {
	return remainingLessons <= LOW_REMAINING_THRESHOLD
		? 'danger'
		: getPassCategoryVariant(category);
}
