export function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}.${month}.${day}`;
}

export function formatDateTime(dateStr: string): string {
	const date = new Date(dateStr);
	const dateFormatted = formatDate(dateStr);
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${dateFormatted} ${hours}:${minutes}`;
}

export function formatPhone(phone: string): string {
	if (phone.length === 11) {
		return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
	}
	if (phone.length === 10) {
		return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
	}
	return phone;
}

export function formatNumber(num: number): string {
	return num.toLocaleString('ko-KR');
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function getRelativeTime(dateStr: string): string {
	const now = Date.now();
	const target = new Date(dateStr).getTime();
	const diff = now - target;

	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return '방금 전';
	if (minutes < 60) return `${minutes}분 전`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}시간 전`;

	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}일 전`;

	return formatDate(dateStr);
}
