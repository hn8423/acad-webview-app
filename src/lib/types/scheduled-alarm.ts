export type ScheduleType = 'DAILY' | 'WEEKLY' | 'MONTHLY_START' | 'MONTHLY_END';

export interface ScheduledAlarm {
	id: number;
	academy_id: number;
	title: string;
	content: string;
	schedule_type: ScheduleType;
	schedule_day: number | null;
	schedule_time: string;
	is_active: boolean;
	last_sent_at: string | null;
	next_send_at: string | null;
	created_at: string;
}

export interface CreateScheduledAlarmRequest {
	title: string;
	content: string;
	notification_type: 'SCHEDULED';
	schedule_type: ScheduleType;
	schedule_day?: number;
	schedule_time: string;
}

export interface UpdateScheduledAlarmRequest {
	title?: string;
	content?: string;
	schedule_type?: ScheduleType;
	schedule_day?: number;
	schedule_time?: string;
}
