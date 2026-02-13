export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface AvailableSlot {
	slot_id: number;
	instructor_name: string;
	slot_date: string;
	start_time: string;
	end_time: string;
	remaining_capacity: number;
}

export interface MyReservation {
	id: number;
	instructor_name: string;
	slot_date: string;
	start_time: string;
	end_time: string;
	status: ReservationStatus;
	created_at: string;
}

export interface CreateReservationRequest {
	slot_id: number;
	member_pass_id: number;
}

export interface CreateReservationResponse {
	reservation_id: number;
	slot_date: string;
	start_time: string;
	end_time: string;
	instructor_name: string;
	status: ReservationStatus;
	remaining_lessons: number;
}
