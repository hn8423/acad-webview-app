// 수강료 분할 납부(구독).
// 관리자가 구독 아이템(총금액/횟수/월 납입액)을 정의하고, 수강권 부여 시 적용한다.
// 1~N-1회차는 월 납입액, 마지막 회차는 나머지 전액을 몰아서 낸다.
// PG 연동은 없다 — 오프라인 결제를 관리자가 등록하는 수납 원장이다.

export type SubscriptionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// 연체(OVERDUE)는 저장되지 않는다. due_date < 오늘 이면서 PAID 가 아닌 상태로 파생한다.
export type InstallmentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export type InstallmentListState = 'OUTSTANDING' | 'OVERDUE' | 'ALL';

export interface SubscriptionPlan {
	id: number;
	plan_name: string;
	total_amount: number;
	installment_count: number;
	monthly_amount: number;
	// 서버가 계산해 내려주는 마지막 회차 금액 (총액 - 월 납입액 x (횟수-1))
	final_amount: number;
}

export interface CreateSubscriptionPlanRequest {
	plan_name: string;
	total_amount: number;
	installment_count: number;
	monthly_amount: number;
}

export type UpdateSubscriptionPlanRequest = Partial<CreateSubscriptionPlanRequest>;

export interface InstallmentPayment {
	payment_id: number;
	paid_amount: number;
	paid_at: string;
	payment_method: PaymentMethod;
	// 관리자 전용 — 학생 응답(/members/me/subscriptions)에는 포함되지 않는다
	memo: string;
}

export interface Installment {
	installment_id: number;
	seq: number;
	due_date: string;
	amount: number;
	paid_amount: number;
	remaining_amount: number;
	status: InstallmentStatus;
	// 상세/학생 화면에서만 내려온다
	payments?: InstallmentPayment[];
	days_overdue?: number;
}

export interface MemberSubscription {
	subscription_id: number;
	member_id: number;
	member_name?: string;
	member_pass_id: number;
	pass_name: string;
	plan_id: number | null;
	plan_name: string;
	total_amount: number;
	installment_count: number;
	monthly_amount: number;
	paid_total: number;
	remaining_total: number;
	unpaid_count: number;
	status: SubscriptionStatus;
	installments: Installment[];
}

// 수납 대시보드 한 줄
export interface InstallmentListItem extends Installment {
	subscription_id: number;
	member_id: number;
	member_name: string;
	pass_name: string;
	plan_name: string;
	installment_count: number;
	days_overdue: number;
}

export interface InstallmentSummary {
	overdue_count: number;
	overdue_amount: number;
	overdue_member_count: number;
	due_this_month_count: number;
	due_this_month_amount: number;
	outstanding_total_amount: number;
}

export interface InstallmentDashboard {
	// limit 과 무관하게 전체 미납 집합에서 집계된 값
	summary: InstallmentSummary;
	items: InstallmentListItem[];
	has_more: boolean;
}

// 수강권 부여 시 함께 보내는 분납 적용 정보.
// 금액은 서버가 계산하므로 보내지 않는다 — 어떤 아이템을 언제 낼지만 정한다.
export interface ApplySubscriptionRequest {
	plan_id?: number;
	// plan_id 없이 일회성 분납을 만들 때 사용
	plan_name?: string;
	total_amount?: number;
	installment_count?: number;
	monthly_amount?: number;
	due_dates: string[];
}

export interface CreatePaymentRequest {
	paid_amount: number;
	paid_at: string;
	payment_method?: PaymentMethod;
	memo?: string;
}

export interface GetInstallmentsParams {
	state?: InstallmentListState;
	member_id?: number;
	due_from?: string;
	due_to?: string;
	limit?: number;
}
