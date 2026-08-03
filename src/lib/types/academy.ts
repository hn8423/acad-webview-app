export interface BusinessType {
	id: number;
	type_key: string;
	type_name: string;
}

export interface Academy {
	id: number;
	academy_name: string;
	academy_address: string;
	academy_phone: string;
	academy_logo_img: string;
	business_type: BusinessType;
	status: string;
}

export interface NavFeature {
	feature_id: number;
	feature_key: string;
	feature_name: string;
	is_enabled: boolean;
}

export interface NavItem {
	nav_id: number;
	nav_label: string;
	nav_icon: string;
	nav_position: number;
	is_enabled: boolean;
	features: NavFeature[];
}

export interface AppConfig {
	app_type: string;
	nav_list: NavItem[];
}

export interface Notice {
	id: number;
	title: string;
	content: string;
	is_pinned: number;
	author_name: string;
	files: NoticeFile[];
	created_at: string;
}

export interface NoticeFile {
	file_url: string;
	file_name: string;
	file_type: string;
	file_size: number;
}

export type SuggestionStatus = 'PENDING' | 'ANSWERED';

export interface Suggestion {
	id: number;
	title: string;
	status: SuggestionStatus;
	author_name: string;
	created_at: string;
	reply_count: number;
}

export interface SuggestionDetail extends Suggestion {
	content: string;
}

/** 건의사항 작성 응답. 목록/상세와 필드 구성이 달라 별도 타입으로 둔다. */
export interface CreatedSuggestion {
	id: number;
	title: string;
	content: string;
	status: SuggestionStatus;
	created_at: string;
}

export interface SuggestionReply {
	id: number;
	author_member_id: number;
	author_name: string;
	author_role: string;
	content: string;
	created_at: string;
}

export interface CreateSuggestionReplyRequest {
	content: string;
}

export interface CalendarEvent {
	id: number;
	event_title: string;
	event_type: 'LESSON' | 'PARTY' | 'HOLIDAY' | 'PERFORMANCE' | 'OTHER' | 'RESERVATION';
	event_date: string;
	start_time: string | null;
	end_time: string | null;
	description: string;
	color: string;
	is_all_day: boolean;
}
