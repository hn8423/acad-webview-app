export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type SlotStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export type SlotType = 'REGULAR' | 'ENSEMBLE';

export interface AvailableSlot {
	slot_id: number;
	slot_type: SlotType;
	instructor_name: string | null;
	slot_date: string;
	start_time: string;
	end_time: string;
	remaining_capacity: number;
}

export interface MyReservation {
	reservation_id: number;
	slot_type: SlotType;
	instructor_name: string | null;
	slot_date: string;
	start_time: string;
	end_time: string;
	status: ReservationStatus;
	ticket_value?: number;
	pass_name?: string;
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
	ticket_value?: number;
	pass_name?: string;
}

export interface LessonSlot {
	id: number;
	slot_type: SlotType;
	instructor_name: string | null;
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
	slot_type?: SlotType;
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
