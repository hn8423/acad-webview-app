import { get, post, patch, del } from './client';
import type { ApiResponse, PaginatedList } from '$lib/types/api';
import type {
	ScheduledAlarm,
	CreateScheduledAlarmRequest,
	UpdateScheduledAlarmRequest
} from '$lib/types/scheduled-alarm';

const BASE = (academyId: number) => `/academic/academies/${academyId}/scheduled-alarms`;

export function getScheduledAlarms(
	academyId: number,
	page = 1,
	limit = 20,
	isActive?: boolean
) {
	const params = new URLSearchParams();
	params.set('page', String(page));
	params.set('limit', String(limit));
	if (isActive !== undefined) params.set('is_active', isActive ? '1' : '0');
	return get<ApiResponse<PaginatedList<ScheduledAlarm>>>(
		`${BASE(academyId)}?${params.toString()}`
	);
}

export function getScheduledAlarmDetail(academyId: number, alarmId: number) {
	return get<ApiResponse<ScheduledAlarm>>(`${BASE(academyId)}/${alarmId}`);
}

export function createScheduledAlarm(academyId: number, data: CreateScheduledAlarmRequest) {
	return post<ApiResponse<ScheduledAlarm>>(BASE(academyId), data);
}

export function updateScheduledAlarm(
	academyId: number,
	alarmId: number,
	data: UpdateScheduledAlarmRequest
) {
	return patch<ApiResponse<ScheduledAlarm>>(`${BASE(academyId)}/${alarmId}`, data);
}

export function toggleScheduledAlarm(academyId: number, alarmId: number) {
	return patch<ApiResponse<{ is_active: boolean }>>(`${BASE(academyId)}/${alarmId}/toggle`, {});
}

export function deleteScheduledAlarm(academyId: number, alarmId: number) {
	return del<ApiResponse<null>>(`${BASE(academyId)}/${alarmId}`);
}
