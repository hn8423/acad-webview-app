import { get, post, del } from './client';
import type { ApiResponse, PaginatedList } from '$lib/types/api';
import type {
	CreatedSuggestion,
	CreateSuggestionReplyRequest,
	Suggestion,
	SuggestionDetail,
	SuggestionReply
} from '$lib/types/academy';

export function getSuggestions(academyId: number, page = 1, limit = 10) {
	return get<ApiResponse<PaginatedList<Suggestion>>>(
		`/academic/academies/${academyId}/suggestions?page=${page}&limit=${limit}`
	);
}

export function getSuggestionDetail(academyId: number, suggestionId: number) {
	return get<ApiResponse<SuggestionDetail>>(
		`/academic/academies/${academyId}/suggestions/${suggestionId}`
	);
}

export function createSuggestion(academyId: number, data: { title: string; content: string }) {
	return post<ApiResponse<CreatedSuggestion>>(`/academic/academies/${academyId}/suggestions`, data);
}

export function getSuggestionReplies(academyId: number, suggestionId: number) {
	return get<ApiResponse<SuggestionReply[]>>(
		`/academic/academies/${academyId}/suggestions/${suggestionId}/replies`
	);
}

export function createSuggestionReply(
	academyId: number,
	suggestionId: number,
	data: CreateSuggestionReplyRequest
) {
	return post<ApiResponse<SuggestionReply>>(
		`/academic/academies/${academyId}/suggestions/${suggestionId}/replies`,
		data
	);
}

export function deleteSuggestionReply(academyId: number, suggestionId: number, replyId: number) {
	return del<ApiResponse<null>>(
		`/academic/academies/${academyId}/suggestions/${suggestionId}/replies/${replyId}`
	);
}
