import { get, post } from './client';
import type { ApiResponse, PaginatedList } from '$lib/types/api';
import type { Suggestion, SuggestionDetail } from '$lib/types/academy';

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
	return post<ApiResponse<Omit<SuggestionDetail, 'author_name'>>>(
		`/academic/academies/${academyId}/suggestions`,
		data
	);
}
