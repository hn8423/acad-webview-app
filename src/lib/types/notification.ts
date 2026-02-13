export interface Notification {
	id: number;
	title: string;
	content: string;
	notification_type: string;
	is_read: number;
	created_at: string;
}

export interface SendNotificationRequest {
	recipient_member_ids?: number[];
	title: string;
	content: string;
	notification_type: string;
}
