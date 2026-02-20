export function getHoldingStatusVariant(
	status: string
): 'success' | 'warning' | 'danger' | 'neutral' {
	switch (status) {
		case 'PENDING':
			return 'warning';
		case 'APPROVED':
			return 'success';
		case 'REJECTED':
			return 'danger';
		default:
			return 'neutral';
	}
}

export function getHoldingStatusLabel(status: string): string {
	switch (status) {
		case 'PENDING':
			return '대기중';
		case 'APPROVED':
			return '승인';
		case 'REJECTED':
			return '거절';
		default:
			return status;
	}
}
