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
			return '홀딩';
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

export function getCapacityWeight(passCategory?: string): number {
	switch (passCategory) {
		case 'FULL':
			return 1;
		case 'ROTATION':
			return 0.5;
		default:
			return 1;
	}
}

export function getReservationWeight(passCategory?: string, ticketValue?: number): number {
	return getCapacityWeight(passCategory) * getTicketValue(ticketValue);
}

export function isActiveReservationStatus(status: string): boolean {
	return status === 'PENDING' || status === 'CONFIRMED';
}

export type PassCategory = 'ROTATION' | 'FULL';
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

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

export function getPassCategoryVariant(category: string): BadgeVariant {
	return CATEGORY_VARIANTS[category as PassCategory] ?? 'neutral';
}
