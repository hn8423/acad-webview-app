import { get, post, del } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	AvailableSlot,
	CreateReservationRequest,
	MyReservation,
	ReservationStatus
} from '$lib/types/reservation';

export function getAvailableSlots(academyId: number, date: string) {
	const params = new URLSearchParams({ date });
	return get<ApiResponse<AvailableSlot[]>>(
		`/academic/academies/${academyId}/reservations/available?${params.toString()}`
	);
}

export function createReservation(academyId: number, data: CreateReservationRequest) {
	return post<ApiResponse<{ reservation_id: number; status: ReservationStatus }>>(
		`/academic/academies/${academyId}/reservations`,
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
	return del<ApiResponse<void>>(
		`/academic/academies/${academyId}/reservations/${reservationId}`
	);
}
