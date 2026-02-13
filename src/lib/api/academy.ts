import { get, post, patch, del } from './client';
import type { ApiResponse, PaginatedData } from '$lib/types/api';
import type { Academy, AppConfig, Notice, NoticeDetail, CalendarEvent } from '$lib/types/academy';

export function getAcademies() {
	return get<ApiResponse<Academy[]>>('/academic/academies');
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
	return get<ApiResponse<CalendarEvent[]>>(
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
	return get<ApiResponse<PaginatedData<Notice>>>(
		`/academic/academies/${academyId}/notices?page=${page}&limit=${limit}`
	);
}

export function getNoticeDetail(academyId: number, noticeId: number) {
	return get<ApiResponse<NoticeDetail>>(`/academic/academies/${academyId}/notices/${noticeId}`);
}

export function getRecentNotices(academyId: number) {
	return get<ApiResponse<Notice[]>>(`/academic/academies/${academyId}/notices/recent`);
}

export function createNotice(academyId: number, formData: FormData) {
	return post<ApiResponse<NoticeDetail>>(`/academic/academies/${academyId}/notices`, formData);
}

export function updateNotice(academyId: number, noticeId: number, formData: FormData) {
	return patch<ApiResponse<NoticeDetail>>(
		`/academic/academies/${academyId}/notices/${noticeId}`,
		formData
	);
}

export function deleteNotice(academyId: number, noticeId: number) {
	return del<ApiResponse<null>>(`/academic/academies/${academyId}/notices/${noticeId}`);
}
