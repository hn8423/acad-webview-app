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
	operating_hours_start: string;
	operating_hours_end: string;
	status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface NavFeature {
	feature_id: number;
	feature_key: string;
	feature_name: string;
	is_enabled: boolean;
}

export interface NavItem {
	nav_id: number;
	nav_position: number;
	nav_label: string;
	nav_icon: string;
	is_enabled: boolean;
	features: NavFeature[];
}

export interface AppConfig {
	app_type: 'USER' | 'ADMIN';
	nav_list: NavItem[];
}

export interface Notice {
	id: number;
	title: string;
	is_pinned: boolean;
	view_count: number;
	author_name: string;
	created_at: string;
}

export interface NoticeDetail extends Notice {
	content: string;
	files: NoticeFile[];
}

export interface NoticeFile {
	id: number;
	file_url: string;
	file_name: string;
	file_type: string;
	file_size: number;
}

export interface CalendarEvent {
	id: number;
	event_title: string;
	event_type: 'LESSON' | 'PARTY' | 'HOLIDAY' | 'PERFORMANCE' | 'OTHER';
	event_date: string;
	start_time: string | null;
	end_time: string | null;
	description: string;
	color: string;
	is_all_day: boolean;
}
