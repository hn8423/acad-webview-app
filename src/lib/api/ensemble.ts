import { get, post, patch, del } from './client';
import type { ApiResponse, PaginatedList } from '$lib/types/api';
import type {
	EnsembleListItem,
	MyEnsembleListItem,
	EnsembleDetail,
	EnsembleComment,
	EnsembleMessage,
	EnsembleStatus,
	CreateEnsembleRequest,
	ApplyEnsembleRequest,
	AcceptMemberRequest,
	CreateCommentRequest
} from '$lib/types/ensemble';

const base = (academyId: number) => `/academic/academies/${academyId}/ensembles`;

export function getEnsembles(academyId: number, status?: EnsembleStatus, page = 1, limit = 10) {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	params.set('page', String(page));
	params.set('limit', String(limit));
	return get<ApiResponse<PaginatedList<EnsembleListItem>>>(
		`${base(academyId)}?${params.toString()}`
	);
}

export function getMyEnsembles(academyId: number) {
	return get<ApiResponse<MyEnsembleListItem[]>>(`${base(academyId)}/me`);
}

export function getEnsembleDetail(academyId: number, groupId: number) {
	return get<ApiResponse<EnsembleDetail>>(`${base(academyId)}/${groupId}`);
}

export function createEnsemble(academyId: number, data: CreateEnsembleRequest) {
	return post<ApiResponse<EnsembleDetail>>(base(academyId), data);
}

export function updateEnsemble(
	academyId: number,
	groupId: number,
	data: Partial<CreateEnsembleRequest>
) {
	return patch<ApiResponse<EnsembleDetail>>(`${base(academyId)}/${groupId}`, data);
}

export function deleteEnsemble(academyId: number, groupId: number) {
	return del<ApiResponse<null>>(`${base(academyId)}/${groupId}`);
}

export function applyToEnsemble(academyId: number, groupId: number, data: ApplyEnsembleRequest) {
	return post<ApiResponse<null>>(`${base(academyId)}/${groupId}/apply`, data);
}

export function acceptMember(
	academyId: number,
	groupId: number,
	memberId: number,
	data: AcceptMemberRequest
) {
	return post<ApiResponse<null>>(
		`${base(academyId)}/${groupId}/members/${memberId}/accept`,
		data
	);
}

export function rejectMember(academyId: number, groupId: number, memberId: number) {
	return post<ApiResponse<null>>(`${base(academyId)}/${groupId}/members/${memberId}/reject`);
}

export function leaveEnsemble(academyId: number, groupId: number) {
	return post<ApiResponse<null>>(`${base(academyId)}/${groupId}/leave`);
}

export function getComments(academyId: number, groupId: number) {
	return get<ApiResponse<EnsembleComment[]>>(
		`${base(academyId)}/${groupId}/comments`
	);
}

export function createComment(academyId: number, groupId: number, data: CreateCommentRequest) {
	return post<ApiResponse<EnsembleComment>>(`${base(academyId)}/${groupId}/comments`, data);
}

export function deleteComment(academyId: number, groupId: number, commentId: number) {
	return del<ApiResponse<null>>(`${base(academyId)}/${groupId}/comments/${commentId}`);
}

export function getMessages(academyId: number, groupId: number, page = 1, limit = 50) {
	const params = new URLSearchParams({ page: String(page), limit: String(limit) });
	return get<ApiResponse<PaginatedList<EnsembleMessage>>>(
		`${base(academyId)}/${groupId}/messages?${params}`
	);
}
