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
	is_enabled: number;
}

export interface NavItem {
	nav_id: number;
	nav_name: string;
	nav_icon: string;
	sort_order: number;
	features: NavFeature[];
}

export interface AppConfig {
	nav_items: NavItem[];
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

export interface CalendarEvent {
	id: number;
	event_title: string;
	event_type: 'LESSON' | 'PARTY' | 'HOLIDAY' | 'PERFORMANCE' | 'OTHER';
	event_date: string;
	start_time: string | null;
	end_time: string | null;
	description: string;
	color: string;
	is_all_day: number;
}
