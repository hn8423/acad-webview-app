import { get, post, patch } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	Holding,
	CreateHoldingRequest,
	UpdateHoldingRequest,
	AdminCreateHoldingRequest
} from '$lib/types/holding';

export function createHolding(academyId: number, passId: number, data: CreateHoldingRequest) {
	return post<ApiResponse<Holding>>(
		`/academic/academies/${academyId}/members/me/passes/${passId}/holdings`,
		data
	);
}

export function getHoldings(academyId: number, status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	const query = params.toString() ? `?${params.toString()}` : '';
	return get<ApiResponse<Holding[] | { holdings: Holding[] }>>(
		`/academic/academies/${academyId}/holdings${query}`
	);
}

export function adminCreateHolding(academyId: number, data: AdminCreateHoldingRequest) {
	return post<ApiResponse<Holding>>(`/academic/academies/${academyId}/holdings`, data);
}

export function updateHolding(
	academyId: number,
	holdingId: number,
	data: UpdateHoldingRequest
) {
	return patch<ApiResponse<Holding>>(
		`/academic/academies/${academyId}/holdings/${holdingId}`,
		data
	);
}
