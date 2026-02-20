export type NotificationType = 'GENERAL' | 'RESERVATION' | 'FEEDBACK';
export type ReferenceType = 'LESSON' | 'FEEDBACK';

export interface Notification {
	id: number;
	title: string;
	content: string;
	notification_type: NotificationType;
	is_read: boolean;
	reference_id: number | null;
	reference_type: ReferenceType | null;
	created_at: string;
}

export interface SendNotificationRequest {
	recipient_member_ids?: number[];
	title: string;
	content: string;
	notification_type: NotificationType;
}

export interface SendNotificationResponse {
	sent_count: number;
}

export interface PushToken {
	id: number;
	user_id: number;
	device_token: string;
	device_type: 'IOS' | 'ANDROID';
	is_active: number;
	created_at: string;
	updated_at: string;
}

export interface RegisterPushTokenRequest {
	device_token: string;
	device_type: 'IOS' | 'ANDROID';
}
