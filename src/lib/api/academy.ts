import { get, post, patch, del } from './client';
import type { ApiResponse, PaginatedList } from '$lib/types/api';
import type { Academy, AppConfig, Notice, NoticeFile, CalendarEvent } from '$lib/types/academy';

export function getAcademies(search?: string, page = 1, limit = 10) {
	const params = new URLSearchParams();
	if (search) params.set('search', search);
	params.set('page', String(page));
	params.set('limit', String(limit));
	return get<ApiResponse<PaginatedList<Academy>>>(
		`/academic/academies?${params.toString()}`
	);
}

export function getAcademy(academyId: number) {
	return get<ApiResponse<Academy>>(`/academic/academies/${academyId}`);
}

export function getAppConfig(academyId: number, appType: 'USER' | 'ADMIN') {
	return get<ApiResponse<AppConfig>>(
		`/academic/academies/${academyId}/app-config?app_type=${appType}`
	);
}

// Calendar
export function getCalendarEvents(academyId: number, year: number, month: number) {
	return get<ApiResponse<{ events: CalendarEvent[] }>>(
		`/academic/academies/${academyId}/calendar?year=${year}&month=${month}`
	);
}

export function createCalendarEvent(academyId: number, data: Omit<CalendarEvent, 'id'>) {
	return post<ApiResponse<CalendarEvent>>(`/academic/academies/${academyId}/calendar`, data);
}

export function updateCalendarEvent(
	academyId: number,
	eventId: number,
	data: Partial<CalendarEvent>
) {
	return patch<ApiResponse<CalendarEvent>>(
		`/academic/academies/${academyId}/calendar/${eventId}`,
		data
	);
}

export function deleteCalendarEvent(academyId: number, eventId: number) {
	return del<ApiResponse<null>>(`/academic/academies/${academyId}/calendar/${eventId}`);
}

// Notices
export function getNotices(academyId: number, page = 1, limit = 10) {
	return get<ApiResponse<PaginatedList<Notice>>>(
		`/academic/academies/${academyId}/notices?page=${page}&limit=${limit}`
	);
}

export function getNoticeDetail(academyId: number, noticeId: number) {
	return get<ApiResponse<Notice>>(`/academic/academies/${academyId}/notices/${noticeId}`);
}

export function getRecentNotices(academyId: number) {
	return get<ApiResponse<Notice[]>>(
		`/academic/academies/${academyId}/notices/recent`
	);
}

export function createNotice(
	academyId: number,
	data: {
		title: string;
		content: string;
		is_pinned: number;
		files?: NoticeFile[];
	}
) {
	return post<ApiResponse<Notice>>(`/academic/academies/${academyId}/notices`, data);
}

export function updateNotice(
	academyId: number,
	noticeId: number,
	data: {
		title?: string;
		content?: string;
		is_pinned?: number;
		files?: NoticeFile[];
	}
) {
	return patch<ApiResponse<Notice>>(
		`/academic/academies/${academyId}/notices/${noticeId}`,
		data
	);
}

export function deleteNotice(academyId: number, noticeId: number) {
	return del<ApiResponse<null>>(`/academic/academies/${academyId}/notices/${noticeId}`);
}
