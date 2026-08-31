import type {
	Installment,
	InstallmentStatus,
	PaymentMethod,
	SubscriptionStatus
} from '$lib/types/subscription';
import type { BadgeVariant } from './pass';

export const MAX_INSTALLMENT_COUNT = 36;
export const MAX_TOTAL_AMOUNT = 100_000_000;

export interface PlanAmounts {
	total_amount: number;
	installment_count: number;
	monthly_amount: number;
}

// 총액 T, 횟수 N, 월 납입액 M 일 때
//   1 ~ N-1 회차 = M,  N 회차 = T - M*(N-1)
// "나머지를 마지막 달에 몰아서" 정책을 그대로 옮긴 것이다.
// 예) 954,000 / 4회 / 230,000 -> [230000, 230000, 230000, 264000]
// 서버가 같은 계산을 다시 하므로 여기 결과는 화면 미리보기용이다.
export function calcInstallmentAmounts(plan: PlanAmounts): number[] {
	const { total_amount, installment_count, monthly_amount } = plan;
	if (installment_count <= 1) return [total_amount];
	const head = Array.from({ length: installment_count - 1 }, () => monthly_amount);
	return [...head, total_amount - monthly_amount * (installment_count - 1)];
}

export const MAX_TOTAL_LESSONS = 500;

export interface PlanLessons {
	total_lessons: number;
	installment_count: number;
}

// 회차별 지급 수강 회차의 기본 배분.
//   1 ~ N-1 회차 = floor(L / N),  N 회차 = L - floor(L/N)*(N-1)
// 금액과 같은 모양으로 "나머지를 마지막 회차에 전부" 몰아준다.
// 예) 24회차 / 5회 -> [4, 4, 4, 4, 8],  48회차 / 9회 -> [5 x 8, 8]
//
// ceil 을 쓰면 안 된다. 48회차 / 9회에서 ceil(48/9)=6 이면 6x8=48 이라
// 마지막 회차 지급이 0회가 되어 잔금을 안 내도 회차를 다 받는다.
// 서버 subscription-schedule.ts 와 같은 규칙 — 여기는 미리보기용이다.
export function suggestLessonGrants(plan: PlanLessons): number[] {
	const { total_lessons, installment_count } = plan;
	if (installment_count <= 1) return [total_lessons];
	const per = Math.floor(total_lessons / installment_count);
	const head = Array.from({ length: installment_count - 1 }, () => per);
	return [...head, total_lessons - per * (installment_count - 1)];
}

// 원장이 회차별로 직접 수정한 지급 회차 검증. 문제가 없으면 null.
// total_lessons = 0 은 "회차 지급 없음"(수납 장부 전용)이라 배열을 요구하지 않는다.
export function validateLessonGrants(
	grants: number[] | null | undefined,
	installmentCount: number,
	totalLessons: number
): string | null {
	if (!Number.isInteger(totalLessons) || totalLessons < 0)
		return '총 수강 회차는 0 이상의 정수여야 합니다';
	if (totalLessons > MAX_TOTAL_LESSONS)
		return `총 수강 회차는 최대 ${MAX_TOTAL_LESSONS}회까지 가능합니다`;

	if (totalLessons === 0) {
		if (grants && grants.some((g) => g !== 0))
			return '총 수강 회차가 0이면 회차별 지급 회차도 모두 0이어야 합니다';
		return null;
	}

	if (grants === null || grants === undefined) return null;

	if (!Array.isArray(grants) || grants.length !== installmentCount)
		return `회차별 지급 회차는 ${installmentCount}개를 모두 지정해야 합니다`;
	if (grants.some((g) => !Number.isInteger(g) || g < 0))
		return '회차별 지급 회차는 0 이상의 정수여야 합니다';

	const sum = grants.reduce((acc, v) => acc + v, 0);
	if (sum !== totalLessons)
		return `회차별 지급 회차 합계(${sum}회)가 총 수강 회차(${totalLessons}회)와 다릅니다`;

	return null;
}

// 납부 횟수가 바뀌면 기존 배열은 길이가 안 맞는다 — 그때는 기본 배분으로 되돌린다.
export function normalizeLessonGrants(
	grants: number[] | null | undefined,
	plan: PlanLessons
): number[] {
	return grants && grants.length === plan.installment_count ? grants : suggestLessonGrants(plan);
}

export function sumLessonGrants(grants: number[]): number {
	return grants.reduce((acc, v) => acc + v, 0);
}

export function calcFinalAmount(plan: PlanAmounts): number {
	const amounts = calcInstallmentAmounts(plan);
	return amounts[amounts.length - 1];
}

// 구독 아이템 금액 조합 검증. 문제가 없으면 null.
// 마지막 회차가 월 납입액보다 작아지는 조합(800,000/4회/230,000 -> 110,000)은 허용한다.
// 백엔드 validatePlanAmounts 와 같은 규칙 — 여기는 UX, 최종 판정은 서버다.
export function validatePlanAmounts(plan: PlanAmounts): string | null {
	const { total_amount, installment_count, monthly_amount } = plan;

	if (!Number.isInteger(installment_count) || installment_count < 1)
		return '납부 횟수는 1 이상의 정수여야 합니다';
	if (installment_count > MAX_INSTALLMENT_COUNT)
		return `납부 횟수는 최대 ${MAX_INSTALLMENT_COUNT}회까지 가능합니다`;
	if (!Number.isInteger(total_amount) || total_amount < 1)
		return '총 금액은 1원 이상의 정수여야 합니다';
	if (total_amount > MAX_TOTAL_AMOUNT)
		return `총 금액은 최대 ${MAX_TOTAL_AMOUNT.toLocaleString('ko-KR')}원까지 가능합니다`;

	// 1회 납부면 월 납입액은 의미가 없다 — 서버가 총액으로 덮어쓴다
	if (installment_count === 1) return null;

	if (!Number.isInteger(monthly_amount) || monthly_amount < 1)
		return '월 납입액은 1원 이상의 정수여야 합니다';
	// monthly_amount > total_amount 인 경우도 이 한 줄에 함께 걸린다
	if (monthly_amount * (installment_count - 1) >= total_amount)
		return '마지막 회차 금액이 0원 이하입니다. 월 납입액 또는 납부 횟수를 줄여주세요';

	return null;
}

// 'YYYY-MM-DD' 에 months 개월을 더한다. 말일은 대상 월의 말일로 보정한다 (1/31 + 1개월 = 2/28).
export function addMonthsClamped(ymd: string, months: number): string {
	const [year, month, day] = ymd.slice(0, 10).split('-').map(Number);
	if (!year || !month || !day) return '';
	const targetYear = year + Math.floor((month - 1 + months) / 12);
	const targetMonthIdx = (((month - 1 + months) % 12) + 12) % 12;
	// Date.UTC(y, mIdx + 1, 0) = 해당 월의 말일
	const lastDay = new Date(Date.UTC(targetYear, targetMonthIdx + 1, 0)).getUTCDate();
	const clampedDay = Math.min(day, lastDay);
	const mm = String(targetMonthIdx + 1).padStart(2, '0');
	const dd = String(clampedDay).padStart(2, '0');
	return `${targetYear}-${mm}-${dd}`;
}

// 기준일에서 매월 같은 날로 count 개의 납부 예정일을 만든다.
// 반드시 기준일에서 더한다 — 직전 회차를 기준으로 체인하면 1/31 -> 2/28 -> 3/28 로
// 굳어버리고, 기준일 기준이면 1/31, 2/28, 3/31, 4/30 으로 복원된다.
export function buildDueDates(anchor: string, count: number): string[] {
	if (!anchor || count < 1) return [];
	return Array.from({ length: count }, (_, i) => addMonthsClamped(anchor, i));
}

// 회차별 (예정일, 금액) 미리보기. 부여 화면에서 그대로 표로 그린다.
export function buildInstallmentSchedule(
	anchor: string,
	plan: PlanAmounts,
	lessonGrants?: number[]
): Array<{ seq: number; due_date: string; amount: number; lessons: number }> {
	const dates = buildDueDates(anchor, plan.installment_count);
	const amounts = calcInstallmentAmounts(plan);
	return dates.map((due_date, i) => ({
		seq: i + 1,
		due_date,
		amount: amounts[i] ?? 0,
		lessons: lessonGrants?.[i] ?? 0
	}));
}

// 관리자가 개별 수정한 납부 예정일 검증. 문제가 없으면 null.
// 과거 날짜는 허용한다 — 이미 진행 중인 분납을 뒤늦게 등록하는 경우가 있다.
export function validateDueDates(dueDates: string[], installmentCount: number): string | null {
	if (dueDates.length !== installmentCount)
		return `납부 예정일은 ${installmentCount}개를 모두 지정해야 합니다`;
	if (dueDates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d)))
		return '납부 예정일을 모두 입력해주세요';
	for (let i = 1; i < dueDates.length; i += 1) {
		// 같은 날 두 회차는 회차 순서를 무의미하게 만든다 — 중복도 거부
		if (dueDates[i] <= dueDates[i - 1]) return '납부 예정일은 회차 순서대로 점점 뒤여야 합니다';
	}
	return null;
}

// 연체 일수. 예정일이 아직 안 지났으면 0. 날짜부만 비교한다.
export function getOverdueDays(dueDate: string, today: string): number {
	const due = Date.parse(`${dueDate.slice(0, 10)}T00:00:00.000Z`);
	const now = Date.parse(`${today.slice(0, 10)}T00:00:00.000Z`);
	if (Number.isNaN(due) || Number.isNaN(now) || now <= due) return 0;
	return Math.floor((now - due) / (24 * 60 * 60 * 1000));
}

// 화면 표시용 상태. 서버는 연체를 저장하지 않으므로 여기서 파생한다.
export type DisplayInstallmentStatus = InstallmentStatus | 'OVERDUE';

export function getDisplayInstallmentStatus(
	installment: Pick<Installment, 'status' | 'due_date'>,
	today: string
): DisplayInstallmentStatus {
	if (installment.status === 'PAID') return 'PAID';
	return getOverdueDays(installment.due_date, today) > 0 ? 'OVERDUE' : installment.status;
}

const INSTALLMENT_LABELS: Record<DisplayInstallmentStatus, string> = {
	UNPAID: '미납',
	PARTIAL: '부분납',
	PAID: '완납',
	OVERDUE: '연체'
};

const INSTALLMENT_VARIANTS: Record<DisplayInstallmentStatus, BadgeVariant> = {
	UNPAID: 'neutral',
	PARTIAL: 'warning',
	PAID: 'success',
	OVERDUE: 'danger'
};

export function getInstallmentStatusLabel(status: DisplayInstallmentStatus): string {
	return INSTALLMENT_LABELS[status] ?? status;
}

export function getInstallmentStatusVariant(status: DisplayInstallmentStatus): BadgeVariant {
	return INSTALLMENT_VARIANTS[status] ?? 'neutral';
}

const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
	ACTIVE: '납부중',
	COMPLETED: '완납',
	CANCELLED: '중단'
};

const SUBSCRIPTION_VARIANTS: Record<SubscriptionStatus, BadgeVariant> = {
	ACTIVE: 'info',
	COMPLETED: 'success',
	CANCELLED: 'neutral'
};

export function getSubscriptionStatusLabel(status: string): string {
	return SUBSCRIPTION_LABELS[status as SubscriptionStatus] ?? status;
}

export function getSubscriptionStatusVariant(status: string): BadgeVariant {
	return SUBSCRIPTION_VARIANTS[status as SubscriptionStatus] ?? 'neutral';
}

export const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
	{ value: 'CASH', label: '현금' },
	{ value: 'CARD', label: '카드' },
	{ value: 'TRANSFER', label: '계좌이체' },
	{ value: 'OTHER', label: '기타' }
];

export function getPaymentMethodLabel(method: string): string {
	return PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;
}

// 대시보드 그룹핑 — 연체 / 이번 달 / 예정
export type DueGroup = 'OVERDUE' | 'THIS_MONTH' | 'UPCOMING';

export function getDueGroup(dueDate: string, today: string): DueGroup {
	if (getOverdueDays(dueDate, today) > 0) return 'OVERDUE';
	return dueDate.slice(0, 7) === today.slice(0, 7) ? 'THIS_MONTH' : 'UPCOMING';
}

export const DUE_GROUP_LABELS: Record<DueGroup, string> = {
	OVERDUE: '연체',
	THIS_MONTH: '이번 달',
	UPCOMING: '예정'
};
