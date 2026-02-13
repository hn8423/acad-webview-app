import { get, patch } from './client';
import type { ApiResponse, PaginatedList } from '$lib/types/api';
import type { Notification } from '$lib/types/notification';

export function getNotifications(academyId: number, page = 1, limit = 20) {
	const params = new URLSearchParams();
	params.set('page', String(page));
	params.set('limit', String(limit));
	return get<ApiResponse<PaginatedList<Notification>>>(
		`/academic/academies/${academyId}/notifications?${params.toString()}`
	);
}

export function getUnreadCount(academyId: number) {
	return get<ApiResponse<{ unread_count: number }>>(
		`/academic/academies/${academyId}/notifications/unread-count`
	);
}

export function markAsRead(academyId: number, notificationId: number) {
	return patch<ApiResponse<null>>(
		`/academic/academies/${academyId}/notifications/${notificationId}/read`,
		{}
	);
}

export function markAllAsRead(academyId: number) {
	return patch<ApiResponse<null>>(
		`/academic/academies/${academyId}/notifications/read-all`,
		{}
	);
}
