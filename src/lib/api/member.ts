import { get, post } from './client';
import type { ApiResponse, CursorPaginatedData } from '$lib/types/api';
import type {
	Member,
	MemberListItem,
	MemberPass,
	CreatePassRequest,
	DrinkTicket,
	CreateDrinkTicketRequest,
	PassType,
	Instructor
} from '$lib/types/member';

// Membership
export function joinAcademy(academyId: number, nickname?: string) {
	return post<ApiResponse<Member>>(`/academic/academies/${academyId}/members/join`, {
		member_nickname: nickname ?? ''
	});
}

export function getMembers(academyId: number, cursor?: number, limit = 20, search?: string) {
	const params = new URLSearchParams();
	if (cursor) params.set('cursor', String(cursor));
	params.set('limit', String(limit));
	if (search) params.set('search', search);
	return get<ApiResponse<CursorPaginatedData<MemberListItem>>>(
		`/academic/academies/${academyId}/members?${params.toString()}`
	);
}

export function getMemberDetail(academyId: number, memberId: number) {
	return get<ApiResponse<MemberListItem>>(
		`/academic/academies/${academyId}/members/${memberId}`
	);
}

export function getMyMembership(academyId: number) {
	return get<ApiResponse<Member>>(`/academic/academies/${academyId}/members/me`);
}

// Instructors
export function getInstructors(academyId: number) {
	return get<ApiResponse<Instructor[]>>(`/academic/academies/${academyId}/instructors`);
}

// Pass Types
export function getPassTypes(academyId: number) {
	return get<ApiResponse<PassType[]>>(`/academic/academies/${academyId}/pass-types`);
}

// Member Passes
export function getMyPasses(academyId: number) {
	return get<ApiResponse<MemberPass[]>>(`/academic/academies/${academyId}/members/me/passes`);
}

export function getMemberPasses(academyId: number, memberId: number) {
	return get<ApiResponse<MemberPass[]>>(
		`/academic/academies/${academyId}/members/${memberId}/passes`
	);
}

export function createMemberPass(academyId: number, memberId: number, data: CreatePassRequest) {
	return post<ApiResponse<MemberPass>>(
		`/academic/academies/${academyId}/members/${memberId}/passes`,
		data
	);
}

// Drink Tickets
export function getMyDrinkTickets(academyId: number) {
	return get<ApiResponse<DrinkTicket[]>>(
		`/academic/academies/${academyId}/members/me/drink-tickets`
	);
}

export function getMemberDrinkTickets(academyId: number, memberId: number) {
	return get<ApiResponse<DrinkTicket[]>>(
		`/academic/academies/${academyId}/members/${memberId}/drink-tickets`
	);
}

export function createDrinkTicket(
	academyId: number,
	memberId: number,
	data: CreateDrinkTicketRequest
) {
	return post<ApiResponse<DrinkTicket>>(
		`/academic/academies/${academyId}/members/${memberId}/drink-tickets`,
		data
	);
}

export function useDrinkTicket(academyId: number, ticketId: number, useCount = 1) {
	return post<ApiResponse<DrinkTicket>>(
		`/academic/academies/${academyId}/members/me/drink-tickets/${ticketId}/use`,
		{ use_count: useCount }
	);
}
