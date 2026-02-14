export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type SlotStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface AvailableSlot {
	slot_id: number;
	instructor_name: string;
	slot_date: string;
	start_time: string;
	end_time: string;
	remaining_capacity: number;
}

export interface MyReservation {
	reservation_id: number;
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
	status: ReservationStatus;
}

// Admin types

export interface SlotReservation {
	reservation_id: number;
	member_name: string;
	status: ReservationStatus;
}

export interface LessonSlot {
	id: number;
	instructor_name: string;
	slot_date: string;
	start_time: string;
	end_time: string;
	max_capacity: number;
	current_count: number;
	status: SlotStatus;
	reservations: SlotReservation[];
}

export interface CreateSlotRequest {
	slot_date: string;
	start_time: string;
	end_time: string;
	max_capacity?: number;
}

export interface UpdateSlotRequest {
	start_time?: string;
	end_time?: string;
	max_capacity?: number;
	status?: SlotStatus;
}

export interface UpdateReservationStatusRequest {
	status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
}
