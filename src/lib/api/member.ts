import { get, post, patch, del } from './client';
import type { ApiResponse, CursorPaginatedList } from '$lib/types/api';
import type {
	Member,
	MemberListItem,
	MemberDetail,
	MemberPass,
	CreatePassRequest,
	UpdatePassRequest,
	DrinkTicket,
	CreateDrinkTicketRequest,
	PassType,
	CreatePassTypeRequest,
	UpdatePassTypeRequest,
	Instructor,
	CreateInstructorRequest,
	UpdateInstructorRequest,
	InstructorStats
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
	return get<ApiResponse<CursorPaginatedList<MemberListItem>>>(
		`/academic/academies/${academyId}/members?${params.toString()}`
	);
}

export function getMemberDetail(academyId: number, memberId: number) {
	return get<ApiResponse<MemberDetail>>(
		`/academic/academies/${academyId}/members/${memberId}`
	);
}

export function getMyMembership(academyId: number) {
	return get<ApiResponse<Member>>(`/academic/academies/${academyId}/members/me`);
}

// Instructors
export function getInstructors(academyId: number) {
	return get<ApiResponse<Instructor[] | { instructors: Instructor[] }>>(
		`/academic/academies/${academyId}/instructors`
	);
}

export function getInstructorDetail(academyId: number, instructorId: number) {
	return get<ApiResponse<Instructor>>(
		`/academic/academies/${academyId}/instructors/${instructorId}`
	);
}

export function createInstructor(academyId: number, data: CreateInstructorRequest) {
	return post<ApiResponse<Instructor>>(`/academic/academies/${academyId}/instructors`, data);
}

export function updateInstructor(
	academyId: number,
	instructorId: number,
	data: UpdateInstructorRequest
) {
	return patch<ApiResponse<Instructor>>(
		`/academic/academies/${academyId}/instructors/${instructorId}`,
		data
	);
}

export function getInstructorStats(
	academyId: number,
	instructorId: number,
	year: number,
	month: number
) {
	return get<ApiResponse<InstructorStats>>(
		`/academic/academies/${academyId}/instructors/${instructorId}/stats?year=${year}&month=${month}`
	);
}

// Pass Types
export function getPassTypes(academyId: number) {
	return get<ApiResponse<{ pass_types: PassType[] }>>(
		`/academic/academies/${academyId}/pass-types`
	);
}

export function createPassType(academyId: number, data: CreatePassTypeRequest) {
	return post<ApiResponse<PassType>>(`/academic/academies/${academyId}/pass-types`, data);
}

export function updatePassType(
	academyId: number,
	passTypeId: number,
	data: UpdatePassTypeRequest
) {
	return patch<ApiResponse<PassType>>(
		`/academic/academies/${academyId}/pass-types/${passTypeId}`,
		data
	);
}

export function deletePassType(academyId: number, passTypeId: number) {
	return del<ApiResponse<null>>(`/academic/academies/${academyId}/pass-types/${passTypeId}`);
}

// Member Passes
export function getMyPasses(academyId: number) {
	return get<ApiResponse<MemberPass[]>>(
		`/academic/academies/${academyId}/members/me/passes`
	);
}

export function getMemberPasses(academyId: number, memberId: number) {
	return get<ApiResponse<{ passes: MemberPass[] }>>(
		`/academic/academies/${academyId}/members/${memberId}/passes`
	);
}

export function createMemberPass(academyId: number, memberId: number, data: CreatePassRequest) {
	return post<ApiResponse<MemberPass>>(
		`/academic/academies/${academyId}/members/${memberId}/passes`,
		data
	);
}

export function updateMemberPass(
	academyId: number,
	memberId: number,
	passId: number,
	data: UpdatePassRequest
) {
	return patch<ApiResponse<MemberPass>>(
		`/academic/academies/${academyId}/members/${memberId}/passes/${passId}`,
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
	return get<ApiResponse<{ drink_tickets: DrinkTicket[] }>>(
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
	return post<ApiResponse<{ remaining_count: number }>>(
		`/academic/academies/${academyId}/members/me/drink-tickets/${ticketId}/use`,
		{ use_count: useCount }
	);
}
