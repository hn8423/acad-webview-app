import { get, post, patch, del } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	AvailableSlot,
	CreateReservationRequest,
	CreateReservationResponse,
	CreateSlotRequest,
	LessonSlot,
	MyReservation,
	ReservationStatus,
	UpdateReservationStatusRequest,
	UpdateSlotRequest
} from '$lib/types/reservation';

export function getAvailableSlots(academyId: number, date: string) {
	const params = new URLSearchParams({ date });
	return get<ApiResponse<{ slots: AvailableSlot[] }>>(
		`/academic/academies/${academyId}/reservations/available?${params.toString()}`
	);
}

export function createReservation(academyId: number, data: CreateReservationRequest) {
	return post<ApiResponse<CreateReservationResponse>>(
		`/academic/academies/${academyId}/reservations`,
		data
	);
}

export function getMyReservations(academyId: number, status?: ReservationStatus) {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	const query = params.size > 0 ? `?${params.toString()}` : '';
	return get<ApiResponse<{ reservations: MyReservation[] }>>(
		`/academic/academies/${academyId}/reservations/me${query}`
	);
}

export function cancelReservation(academyId: number, reservationId: number) {
	return del<ApiResponse<void>>(
		`/academic/academies/${academyId}/reservations/${reservationId}`
	);
}

// Admin: Lesson Slot CRUD

export function getLessonSlots(academyId: number, date: string, instructorId?: number) {
	const params = new URLSearchParams({ date });
	if (instructorId) params.set('instructor_id', String(instructorId));
	return get<ApiResponse<LessonSlot[]>>(
		`/academic/academies/${academyId}/lesson-slots?${params.toString()}`
	);
}

export function createLessonSlot(academyId: number, data: CreateSlotRequest) {
	return post<ApiResponse<LessonSlot>>(
		`/academic/academies/${academyId}/lesson-slots`,
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
	return del<ApiResponse<void>>(
		`/academic/academies/${academyId}/lesson-slots/${slotId}`
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
