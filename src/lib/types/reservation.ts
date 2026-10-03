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
	// 홀딩 신청 시 "이 수강권의 어떤 예약이 취소되는지" 계산하는 데 쓴다
	member_pass_id?: number;
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

// Recurring reservation (매주 반복 예약)

// 서버가 회차를 예약할 수 없다고 판정한 사유 (academic-lesson BookingBlockReason 과 동일)
export type RecurringSkipReason =
	| 'NO_SLOT'
	| 'SLOT_CLOSED'
	| 'PAST'
	| 'OUT_OF_PASS_PERIOD'
	| 'HOLDING'
	| 'ALREADY_BOOKED'
	| 'NO_REMAINING'
	| 'FULL';

export type RecurringItemStatus = 'AVAILABLE' | RecurringSkipReason;

export interface RecurringPreviewRequest {
	slot_id: number;
	member_pass_id: number;
	count: number;
}

export interface RecurringPreviewItem {
	// 그 주에 같은 강사·시간 슬롯이 없으면 null
	slot_id: number | null;
	slot_date: string;
	status: RecurringItemStatus;
}

export interface RecurringPreviewResponse {
	start_time: string;
	end_time: string;
	available_count: number;
	items: RecurringPreviewItem[];
}

export interface RecurringReservationRequest {
	member_pass_id: number;
	slot_ids: number[];
}

export interface RecurringReservationResponse {
	created: { reservation_id: number; slot_id: number; slot_date: string }[];
	skipped: { slot_id: number; slot_date: string | null; reason: RecurringSkipReason }[];
}

// 강사 수업 정리 (관리자) — 오늘 이후 남은 수업과 예약 회원
export interface UpcomingSlotReservation {
	reservation_id: number;
	member_name: string;
	status: ReservationStatus;
}

export interface UpcomingSlot {
	slot_id: number;
	slot_date: string;
	start_time: string;
	end_time: string;
	slot_type: SlotType;
	status: SlotStatus;
	max_capacity: number | null;
	current_count: number;
	// PENDING/CONFIRMED 예약만 담긴다
	reservations: UpcomingSlotReservation[];
}

export interface InstructorUpcomingSlots {
	instructor: { instructor_id: number; instructor_name: string; is_withdrawn: boolean };
	slots: UpcomingSlot[];
	total: number;
	reserved_count: number;
}

export interface BulkDeleteSlotsRequest {
	slot_ids: number[];
	// 관리자가 확인 모달에서 본 예약. 이 밖의 진행 전 예약이 걸린 수업이 섞이면 서버가 409로 거부한다
	confirmed_reservation_ids?: number[];
	cancel_reason?: string;
}

export interface BulkDeleteSlotsResponse {
	deleted_slot_count: number;
	cancelled_reservation_count: number;
}
