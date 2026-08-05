export type MemberRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
export type StudentPassStatus = 'ALL' | 'ACTIVE' | 'EXPIRED';

// HOLDING = 홀딩(일시정지), REFUNDED = 환불.
// 과거에는 환불도 HOLDING으로 저장했으나 홀딩 기능 도입과 함께 분리했다.
export type PassStatus = 'ACTIVE' | 'EXPIRED' | 'HOLDING' | 'USED_UP' | 'REFUNDED';

export interface Member {
	id: number;
	academy_id: number;
	role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
	member_nickname: string;
	user_name: string;
	user_phone: string;
	joined_at: string;
}

export interface MemberListItem {
	member_id: number;
	user_name: string;
	user_phone: string;
	member_role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
	status: string;
	active_passes: number;
	remaining_drinks: number;
	joined_at: string;
}

export interface MemberDetail {
	member_id: number;
	user_name: string;
	user_phone: string;
	member_nickname: string;
	member_role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
	status: string;
	joined_at: string;
}

export interface UpdateMemberRequest {
	member_nickname?: string;
	user_name?: string;
}

export interface PassType {
	id: number;
	pass_name: string;
	pass_category: 'ROTATION' | 'FULL';
	ticket_value: number;
	max_capacity?: number;
	duration_days: number;
	total_lessons: number;
	price: number;
	allow_duplicate_booking: number;
	// 이 종류로 부여된 수강권이 쓸 수 있는 홀딩 총 일수 (0 = 홀딩 불가)
	hold_days: number;
}

export interface MemberPass {
	id: number;
	pass_name: string;
	pass_category: string;
	ticket_value?: number;
	instructor_id?: number;
	instructor_name: string;
	start_date: string;
	end_date: string;
	total_lessons: number;
	remaining_lessons: number;
	// 아직 차감되지 않은 예약(PENDING/CONFIRMED) 수. 차감은 수업 완료/노쇼 시점에 일어난다.
	pending_count?: number;
	// remaining_lessons - pending_count. 실제로 추가 예약 가능한 횟수
	available_lessons?: number;
	// 부여 시점에 스냅샷된 홀딩 가능 일수 / 누적 사용 일수 / 잔여 일수.
	// 구버전 응답에는 없을 수 있어 optional (getRemainingHoldDays로 폴백 계산)
	hold_days?: number;
	hold_used_days?: number;
	remaining_hold_days?: number;
	// 아직 끝나지 않은 홀딩 구간. 진행 중 홀딩은 status로도 걸러지지만,
	// 시작 전 홀딩은 status가 ACTIVE라 이 구간으로 예약을 막아야 한다.
	holdings?: HoldingPeriod[];
	status: PassStatus;
}

export interface HoldingPeriod {
	holding_start: string;
	holding_end: string;
}

export interface CreatePassRequest {
	pass_type_id: number;
	instructor_id: number;
	start_date: string;
	end_date: string;
}

export interface UpdatePassRequest {
	start_date?: string;
	end_date?: string;
	total_lessons?: number;
	remaining_lessons?: number;
	status?: PassStatus;
}

export interface DrinkTicket {
	id: number;
	academy_id: number;
	member_id: number;
	total_count: number;
	remaining_count: number;
	expiry_date: string;
	is_deleted: number;
	created_at: string;
	updated_at: string;
}

export interface CreateDrinkTicketRequest {
	total_count: number;
	expiry_date: string;
}

export interface Instructor {
	id?: number;
	instructor_id?: number;
	member_id: number;
	user_name: string;
	profile_img: string;
	specialties: string;
	introduction: string;
	is_admin: number;
	user_phone?: string;
	student_count?: number;
}

export interface CreateInstructorRequest {
	member_id: number;
	specialties?: string;
	introduction?: string;
	is_admin?: number;
}

export interface UpdateInstructorRequest {
	user_name?: string;
	specialties?: string;
	introduction?: string;
	is_admin?: number;
}

export interface CategoryLessonBreakdown {
	completed: number;
	no_show: number;
}

export interface InstructorStats {
	instructor_name: string;
	year: number;
	month: number;
	total_lessons: number;
	completed_lessons: number;
	cancelled_lessons: number;
	no_show_count: number;
	total_students: number;
	lessons_by_category?: Partial<Record<'ROTATION' | 'FULL', CategoryLessonBreakdown>>;
	self_same_day_cancelled_count: number;
}

export interface CreatePassTypeRequest {
	pass_name: string;
	pass_category: 'ROTATION' | 'FULL';
	ticket_value?: number;
	duration_days?: number;
	total_lessons?: number;
	price?: number;
	allow_duplicate_booking?: number;
	hold_days?: number;
}

export interface UpdatePassTypeRequest {
	pass_name?: string;
	pass_category?: 'ROTATION' | 'FULL';
	ticket_value?: number;
	duration_days?: number;
	total_lessons?: number;
	price?: number;
	allow_duplicate_booking?: number;
	hold_days?: number;
}
