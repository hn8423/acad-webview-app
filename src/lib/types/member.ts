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

export interface PassType {
	id: number;
	pass_name: string;
	pass_category: 'ROTATION' | 'FULL' | 'ENSEMBLE' | 'PT' | 'GROUP';
	ticket_value: number;
	max_capacity: number;
	duration_days: number;
	total_lessons: number;
	price: number;
	allow_duplicate_booking: number;
}

export interface MemberPass {
	id: number;
	pass_name: string;
	pass_category: string;
	instructor_name: string;
	start_date: string;
	end_date: string;
	total_lessons: number;
	remaining_lessons: number;
	status: 'ACTIVE' | 'EXPIRED' | 'PAUSED';
}

export interface CreatePassRequest {
	pass_type_id: number;
	instructor_id: number;
	start_date: string;
	total_lessons?: number;
}

export interface UpdatePassRequest {
	start_date?: string;
	end_date?: string;
	total_lessons?: number;
	remaining_lessons?: number;
	status?: 'ACTIVE' | 'EXPIRED' | 'PAUSED';
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
}

export interface CreateInstructorRequest {
	member_id: number;
	specialties?: string;
	introduction?: string;
	is_admin?: number;
}

export interface UpdateInstructorRequest {
	specialties?: string;
	introduction?: string;
	is_admin?: number;
}

export interface InstructorStats {
	total_lessons: number;
	completed_lessons: number;
	cancelled_lessons: number;
	no_show_lessons: number;
	student_count: number;
	reservation_rate: number;
}

export interface CreatePassTypeRequest {
	pass_name: string;
	pass_category: 'ROTATION' | 'FULL' | 'ENSEMBLE' | 'PT' | 'GROUP';
	ticket_value?: number;
	max_capacity?: number;
	duration_days?: number;
	total_lessons?: number;
	price?: number;
	allow_duplicate_booking?: number;
}

export interface UpdatePassTypeRequest {
	pass_name?: string;
	pass_category?: 'ROTATION' | 'FULL' | 'ENSEMBLE' | 'PT' | 'GROUP';
	ticket_value?: number;
	max_capacity?: number;
	duration_days?: number;
	total_lessons?: number;
	price?: number;
	allow_duplicate_booking?: number;
}
