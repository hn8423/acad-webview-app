import { get, post } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	Holding,
	HoldingStatus,
	CreateHoldingRequest,
	CreateHoldingResponse
} from '$lib/types/holding';

// 수강생 본인 수강권 홀딩 신청 — 승인 없이 즉시 적용된다
export function createMyHolding(academyId: number, passId: number, data: CreateHoldingRequest) {
	return post<ApiResponse<CreateHoldingResponse>>(
		`/academic/academies/${academyId}/members/me/passes/${passId}/holdings`,
		data
	);
}

// 관리자 — 학원 전체 홀딩 목록
export function getHoldings(academyId: number, status?: HoldingStatus) {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	const query = params.toString();
	return get<ApiResponse<Holding[]>>(
		`/academic/academies/${academyId}/holdings${query ? `?${query}` : ''}`
	);
}
