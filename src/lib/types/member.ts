export interface Member {
	member_id: number;
	academy_id: number;
	member_role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
	member_nickname: string;
	status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
	joined_at: string;
}

export interface MemberListItem {
	member_id: number;
	user_name: string;
	user_phone: string;
	member_role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
	status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
	active_passes: number;
	remaining_drinks: number;
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
	allow_duplicate_booking: boolean;
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
	status: 'ACTIVE' | 'EXPIRED' | 'HOLDING' | 'COMPLETED';
}

export interface CreatePassRequest {
	pass_type_id: number;
	instructor_id: number;
	start_date: string;
	total_lessons: number;
}

export interface DrinkTicket {
	id: number;
	total_count: number;
	remaining_count: number;
	expiry_date: string;
}

export interface CreateDrinkTicketRequest {
	total_count: number;
	expiry_date: string;
}

export interface Instructor {
	instructor_id: number;
	member_id: number;
	user_name: string;
	specialties: string;
	introduction: string;
	profile_img: string;
}
