import { get, post, patch, del } from './client';
import type { ApiResponse, PaginatedList } from '$lib/types/api';
import type {
	FeedbackLevel,
	FeedbackCategory,
	CreateCategoryRequest,
	UpdateCategoryRequest,
	FeedbackListItem,
	FeedbackDetail,
	FeedbackType,
	CreateWeeklyRequest,
	UpdateWeeklyRequest,
	CreateMonthlyRequest,
	UpdateMonthlyRequest
} from '$lib/types/feedback';

const BASE = (academyId: number) => `/academic/academies/${academyId}/feedback`;

// Levels (public)
export function getFeedbackLevels() {
	return get<ApiResponse<FeedbackLevel[]>>('/academic/feedback/levels', true);
}

// Categories
export function getCategories(academyId: number, instructorId?: number) {
	const params = new URLSearchParams();
	if (instructorId) params.set('instructor_id', String(instructorId));
	const query = params.toString() ? `?${params.toString()}` : '';
	return get<ApiResponse<FeedbackCategory[]>>(`${BASE(academyId)}/categories${query}`);
}

export function createCategory(academyId: number, data: CreateCategoryRequest) {
	return post<ApiResponse<FeedbackCategory>>(`${BASE(academyId)}/categories`, data);
}

export function updateCategory(academyId: number, categoryId: number, data: UpdateCategoryRequest) {
	return patch<ApiResponse<FeedbackCategory>>(`${BASE(academyId)}/categories/${categoryId}`, data);
}

export function deleteCategory(academyId: number, categoryId: number) {
	return del<ApiResponse<null>>(`${BASE(academyId)}/categories/${categoryId}`);
}

// Weekly Feedback
export function createWeeklyFeedback(academyId: number, data: CreateWeeklyRequest) {
	return post<ApiResponse<FeedbackDetail>>(`${BASE(academyId)}/weekly`, data);
}

export function updateWeeklyFeedback(
	academyId: number,
	feedbackId: number,
	data: UpdateWeeklyRequest
) {
	return patch<ApiResponse<FeedbackDetail>>(`${BASE(academyId)}/weekly/${feedbackId}`, data);
}

// Monthly Feedback
export function createMonthlyFeedback(academyId: number, data: CreateMonthlyRequest) {
	return post<ApiResponse<FeedbackDetail>>(`${BASE(academyId)}/monthly`, data);
}

export function updateMonthlyFeedback(
	academyId: number,
	feedbackId: number,
	data: UpdateMonthlyRequest
) {
	return patch<ApiResponse<FeedbackDetail>>(`${BASE(academyId)}/monthly/${feedbackId}`, data);
}

// Feedback Lists
export function getMyFeedback(academyId: number, type?: FeedbackType, page = 1, limit = 10) {
	const params = new URLSearchParams();
	if (type) params.set('type', type);
	params.set('page', String(page));
	params.set('limit', String(limit));
	return get<ApiResponse<PaginatedList<FeedbackListItem>>>(
		`${BASE(academyId)}/me?${params.toString()}`
	);
}

export function getFeedbackList(
	academyId: number,
	memberId?: number,
	type?: FeedbackType,
	page = 1,
	limit = 10
) {
	const params = new URLSearchParams();
	if (memberId) params.set('member_id', String(memberId));
	if (type) params.set('type', type);
	params.set('page', String(page));
	params.set('limit', String(limit));
	return get<ApiResponse<PaginatedList<FeedbackListItem>>>(
		`${BASE(academyId)}?${params.toString()}`
	);
}

// Feedback Detail
export function getFeedbackDetail(academyId: number, feedbackId: number) {
	return get<ApiResponse<FeedbackDetail>>(`${BASE(academyId)}/${feedbackId}`);
}

// Delete Feedback
export function deleteFeedback(academyId: number, feedbackId: number) {
	return del<ApiResponse<null>>(`${BASE(academyId)}/${feedbackId}`);
}
