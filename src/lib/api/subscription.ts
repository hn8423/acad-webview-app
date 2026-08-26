import { get, post, patch, del } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	ApplySubscriptionRequest,
	CreatePaymentRequest,
	CreateSubscriptionPlanRequest,
	GetInstallmentsParams,
	InstallmentDashboard,
	MemberSubscription,
	SubscriptionPlan,
	SubscriptionStatus,
	UpdateSubscriptionPlanRequest
} from '$lib/types/subscription';

// ===== 구독 아이템 (ADMIN) =====

export function getSubscriptionPlans(academyId: number) {
	return get<ApiResponse<SubscriptionPlan[]>>(
		`/academic/academies/${academyId}/subscription-plans`
	);
}

export function createSubscriptionPlan(academyId: number, data: CreateSubscriptionPlanRequest) {
	return post<ApiResponse<SubscriptionPlan>>(
		`/academic/academies/${academyId}/subscription-plans`,
		data
	);
}

export function updateSubscriptionPlan(
	academyId: number,
	planId: number,
	data: UpdateSubscriptionPlanRequest
) {
	return patch<ApiResponse<SubscriptionPlan>>(
		`/academic/academies/${academyId}/subscription-plans/${planId}`,
		data
	);
}

export function deleteSubscriptionPlan(academyId: number, planId: number) {
	return del<ApiResponse<null>>(`/academic/academies/${academyId}/subscription-plans/${planId}`);
}

// ===== 구독 (ADMIN) =====

// 수강권 부여 시 빠뜨린 경우 뒤늦게 붙이는 경로
export function attachSubscriptionToPass(
	academyId: number,
	passId: number,
	data: ApplySubscriptionRequest
) {
	return post<ApiResponse<{ subscription_id: number }>>(
		`/academic/academies/${academyId}/passes/${passId}/subscription`,
		data
	);
}

export function getSubscriptions(
	academyId: number,
	params: { member_id?: number; status?: SubscriptionStatus } = {}
) {
	const query = new URLSearchParams();
	if (params.member_id) query.set('member_id', String(params.member_id));
	if (params.status) query.set('status', params.status);
	const suffix = query.toString() ? `?${query}` : '';
	return get<ApiResponse<MemberSubscription[]>>(
		`/academic/academies/${academyId}/subscriptions${suffix}`
	);
}

export function getSubscriptionDetail(academyId: number, subscriptionId: number) {
	return get<ApiResponse<MemberSubscription>>(
		`/academic/academies/${academyId}/subscriptions/${subscriptionId}`
	);
}

// 미납 회차만 제거하고 결제 이력은 남긴다
export function cancelSubscription(academyId: number, subscriptionId: number) {
	return del<ApiResponse<null>>(`/academic/academies/${academyId}/subscriptions/${subscriptionId}`);
}

// ===== 수납 대시보드 (ADMIN) =====

export function getInstallmentDashboard(academyId: number, params: GetInstallmentsParams = {}) {
	const query = new URLSearchParams();
	if (params.state) query.set('state', params.state);
	if (params.member_id) query.set('member_id', String(params.member_id));
	if (params.due_from) query.set('due_from', params.due_from);
	if (params.due_to) query.set('due_to', params.due_to);
	if (params.limit) query.set('limit', String(params.limit));
	const suffix = query.toString() ? `?${query}` : '';
	return get<ApiResponse<InstallmentDashboard>>(
		`/academic/academies/${academyId}/subscription-installments${suffix}`
	);
}

// 미납 회차만 변경 가능. 금액은 바꿀 수 없다 (총액 불변식).
export function updateInstallmentDueDate(
	academyId: number,
	installmentId: number,
	dueDate: string
) {
	return patch<ApiResponse<null>>(
		`/academic/academies/${academyId}/subscription-installments/${installmentId}`,
		{ due_date: dueDate }
	);
}

export function createInstallmentPayment(
	academyId: number,
	installmentId: number,
	data: CreatePaymentRequest
) {
	return post<ApiResponse<{ payment_id: number }>>(
		`/academic/academies/${academyId}/subscription-installments/${installmentId}/payments`,
		data
	);
}

export function deleteInstallmentPayment(academyId: number, paymentId: number) {
	return del<ApiResponse<null>>(
		`/academic/academies/${academyId}/subscription-payments/${paymentId}`
	);
}

// ===== 학생 본인 =====

export function getMySubscriptions(academyId: number) {
	return get<ApiResponse<MemberSubscription[]>>(
		`/academic/academies/${academyId}/members/me/subscriptions`
	);
}
