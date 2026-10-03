import { get, post, patch, del } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	AvailableSlot,
	BulkCreateSlotRequest,
	BulkCreateSlotResponse,
	BulkDeleteSlotsRequest,
	BulkDeleteSlotsResponse,
	CreateReservationRequest,
	CreateReservationResponse,
	CreateSlotRequest,
	InstructorScheduleData,
	InstructorUpcomingSlots,
	LessonSlot,
	MyReservation,
	ReservationStatus,
	SlotType,
	MonthlySummaryData,
	RecurringPreviewRequest,
	RecurringPreviewResponse,
	RecurringReservationRequest,
	RecurringReservationResponse,
	UpdateReservationStatusRequest,
	UpdateSlotRequest
} from '$lib/types/reservation';

export function getAvailableSlots(academyId: number, date: string) {
	const params = new URLSearchParams({ date });
	return get<ApiResponse<AvailableSlot[]>>(
		`/academic/academies/${academyId}/reservations/available?${params.toString()}`
	);
}

export function createReservation(academyId: number, data: CreateReservationRequest) {
	return post<ApiResponse<CreateReservationResponse>>(
		`/academic/academies/${academyId}/reservations`,
		data
	);
}

export function previewRecurringReservation(academyId: number, data: RecurringPreviewRequest) {
	return post<ApiResponse<RecurringPreviewResponse>>(
		`/academic/academies/${academyId}/reservations/recurring/preview`,
		data
	);
}

export function createRecurringReservation(academyId: number, data: RecurringReservationRequest) {
	return post<ApiResponse<RecurringReservationResponse>>(
		`/academic/academies/${academyId}/reservations/recurring`,
		data
	);
}

export function getMyReservations(academyId: number, status?: ReservationStatus) {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	const query = params.size > 0 ? `?${params.toString()}` : '';
	return get<ApiResponse<MyReservation[]>>(
		`/academic/academies/${academyId}/reservations/me${query}`
	);
}

export function cancelReservation(academyId: number, reservationId: number) {
	return del<ApiResponse<void>>(`/academic/academies/${academyId}/reservations/${reservationId}`);
}

export function cancelReservationAsNoShow(academyId: number, reservationId: number) {
	return patch<ApiResponse<void>>(
		`/academic/academies/${academyId}/reservations/${reservationId}`,
		{
			status: 'NO_SHOW'
		}
	);
}

// Admin: Lesson Slot Monthly Summary

export function getLessonSlotsMonthlySummary(
	academyId: number,
	year: number,
	month: number,
	instructorId?: number
) {
	const params = new URLSearchParams({
		year: String(year),
		month: String(month)
	});
	if (instructorId) params.set('instructor_id', String(instructorId));
	return get<ApiResponse<MonthlySummaryData>>(
		`/academic/academies/${academyId}/lesson-slots/monthly-summary?${params.toString()}`
	);
}

// Admin: Instructor Schedule (monthly)

export function getInstructorSchedule(
	academyId: number,
	year: number,
	month: number,
	instructorId?: number
) {
	const params = new URLSearchParams({
		year: String(year),
		month: String(month)
	});
	if (instructorId) params.set('instructor_id', String(instructorId));
	return get<ApiResponse<InstructorScheduleData>>(
		`/academic/academies/${academyId}/lesson-slots/schedule?${params.toString()}`
	);
}

// Admin: Lesson Slot CRUD

export function getLessonSlots(
	academyId: number,
	date: string,
	instructorId?: number,
	slotType?: SlotType
) {
	const params = new URLSearchParams({ date });
	if (instructorId) params.set('instructor_id', String(instructorId));
	if (slotType) params.set('slot_type', slotType);
	return get<ApiResponse<LessonSlot[]>>(
		`/academic/academies/${academyId}/lesson-slots?${params.toString()}`
	);
}

export function createLessonSlot(academyId: number, data: CreateSlotRequest) {
	return post<ApiResponse<LessonSlot>>(`/academic/academies/${academyId}/lesson-slots`, data);
}

export function createBulkLessonSlots(academyId: number, data: BulkCreateSlotRequest) {
	return post<ApiResponse<BulkCreateSlotResponse>>(
		`/academic/academies/${academyId}/lesson-slots/bulk`,
		data
	);
}

export function updateLessonSlot(academyId: number, slotId: number, data: UpdateSlotRequest) {
	return patch<ApiResponse<LessonSlot>>(
		`/academic/academies/${academyId}/lesson-slots/${slotId}`,
		data
	);
}

export function deleteLessonSlot(academyId: number, slotId: number) {
	return del<ApiResponse<void>>(`/academic/academies/${academyId}/lesson-slots/${slotId}`);
}

// Admin: 강사 수업 정리 — 탈퇴한 강사도 조회된다
export function getInstructorUpcomingSlots(academyId: number, instructorId: number) {
	return get<ApiResponse<InstructorUpcomingSlots>>(
		`/academic/academies/${academyId}/instructors/${instructorId}/upcoming-slots`
	);
}

// 확인하지 않은 예약이나 그사이 바뀐 수업이 섞이면 409 (client.ts 가 토스트 후 ApiError)
export function bulkDeleteSlots(academyId: number, data: BulkDeleteSlotsRequest) {
	return post<ApiResponse<BulkDeleteSlotsResponse>>(
		`/academic/academies/${academyId}/lesson-slots/bulk-delete`,
		data
	);
}

// Admin: Reservation Status Management

export function updateReservationStatus(
	academyId: number,
	reservationId: number,
	data: UpdateReservationStatusRequest
) {
	return patch<ApiResponse<void>>(
		`/academic/academies/${academyId}/reservations/${reservationId}`,
		data
	);
}
