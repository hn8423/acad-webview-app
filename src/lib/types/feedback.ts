export interface FeedbackLevel {
	level: number;
	name: string;
	description: string;
}

export interface FeedbackCategory {
	id: number;
	category_name: string;
	sort_order: number;
	instructor_id?: number;
}

export interface CreateCategoryRequest {
	category_name: string;
	sort_order?: number;
}

export interface UpdateCategoryRequest {
	category_name?: string;
	sort_order?: number;
}

export type FeedbackType = 'WEEKLY' | 'MONTHLY';

export interface FeedbackListItem {
	id: number;
	type: FeedbackType;
	feedback_date: string;
	instructor_name: string;
	member_name?: string;
	lesson_content: string;
	created_at: string;
}

export interface WeeklyFeedbackDetail {
	id: number;
	type: 'WEEKLY';
	feedback_date: string;
	instructor_name: string;
	member_name: string;
	lesson_content: string;
	strengths?: string;
	improvements?: string;
	notes?: string;
	video_url?: string;
	created_at?: string;
}

export interface SkillDetail {
	category_id: number;
	category_name?: string;
	score: number;
	level?: string;
	comment?: string;
}

export interface MusicInfo {
	genre?: string;
	instrument?: string;
	experience_years?: number;
}

export interface CurriculumDirection {
	next_month: string;
	long_term: string;
}

export interface MonthlyFeedbackDetail {
	id: number;
	type: 'MONTHLY';
	feedback_date: string;
	instructor_name: string;
	member_name: string;
	member_music_info?: MusicInfo;
	skill_details: SkillDetail[];
	curriculum_direction?: CurriculumDirection;
	instructor_goals?: string;
	instructor_message?: string;
	video_url?: string;
	created_at?: string;
}

export type FeedbackDetail = WeeklyFeedbackDetail | MonthlyFeedbackDetail;

export interface CreateWeeklyRequest {
	member_id: number;
	member_pass_id: number;
	feedback_date: string;
	lesson_content: string;
	strengths?: string;
	improvements?: string;
	notes?: string;
	video_url?: string;
}

export interface UpdateWeeklyRequest {
	lesson_content?: string;
	strengths?: string;
	improvements?: string;
	notes?: string;
	video_url?: string;
}

export interface CreateMonthlyRequest {
	member_id: number;
	member_pass_id: number;
	feedback_date: string;
	member_music_info?: MusicInfo;
	skill_details: { category_id: number; score: number; comment?: string }[];
	curriculum_direction?: CurriculumDirection;
	instructor_goals?: string;
	instructor_message?: string;
	video_url?: string;
}

export interface UpdateMonthlyRequest {
	member_music_info?: MusicInfo;
	skill_details?: { category_id: number; score: number; comment?: string }[];
	curriculum_direction?: CurriculumDirection;
	instructor_goals?: string;
	instructor_message?: string;
	video_url?: string;
}
