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
			return 2;
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
