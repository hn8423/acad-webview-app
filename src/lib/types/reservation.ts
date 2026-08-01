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
	pass_category?: string;
	cancel_reason?: string | null;
	created_at: string;
	// 같은 슬롯에서의 선착순 순번(1부터). 활성 예약이 아니면 null
	sequence?: number | null;
	// 같은 슬롯의 활성 예약 총 인원
	slot_total_count?: number;
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
	pass_category?: string;
	// 서버가 매기는 선착순 순번. 취소/노쇼는 null
	sequence?: number | null;
}

export interface LessonSlot {
	id: number;
	slot_type: SlotType;
	instructor_id: number | null;
	instructor_name: string | null;
	slot_date: string;
	start_time: string;
	end_time: string;
	max_capacity: number;
	min_capacity?: number;
	current_count: number;
	status: SlotStatus;
	reservations: SlotReservation[];
}

export interface CreateSlotRequest {
	slot_date: string;
	start_time: string;
	end_time: string;
	max_capacity?: number;
	min_capacity?: number;
	slot_type?: SlotType;
	instructor_id?: number;
}

export interface UpdateSlotRequest {
	start_time?: string;
	end_time?: string;
	max_capacity?: number;
	min_capacity?: number;
	status?: SlotStatus;
}

export interface UpdateReservationStatusRequest {
	status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
	cancel_reason?: string;
}

export interface BulkCreateSlotRequest {
	start_date: string;
	end_date: string;
	days_of_week: number[];
	start_time: string;
	end_time: string;
	slot_type?: SlotType;
	max_capacity?: number;
	min_capacity?: number;
	instructor_id?: number;
}

export interface BulkCreateSlotResponse {
	created_count: number;
	skipped_count: number;
	skipped_dates: string[];
}

export interface ScheduleSlotReservation {
	reservation_id: number;
	member_name: string;
	pass_category: string | null;
	status: ReservationStatus;
	// 선착순 순번. 취소/노쇼는 null
	sequence: number | null;
}

export interface ScheduleSlot {
	slot_id: number;
	instructor_id: number | null;
	instructor_name: string | null;
	slot_type: SlotType;
	start_time: string;
	end_time: string;
	max_capacity: number | null;
	current_count: number;
	status: SlotStatus;
	reservations?: ScheduleSlotReservation[];
}

export interface ScheduleInstructor {
	instructor_id: number;
	instructor_name: string;
}

export interface InstructorScheduleData {
	instructors: ScheduleInstructor[];
	days: Record<string, ScheduleSlot[]>;
}

export interface DateIndicators {
	has_confirmed: boolean;
	has_pending: boolean;
	has_available: boolean;
}

export type MonthlySummaryData = Record<string, DateIndicators>;
