export function getPassStatusVariant(
	status: string
): 'success' | 'warning' | 'info' | 'neutral' {
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
