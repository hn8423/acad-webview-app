import { describe, it, expect } from 'vitest';
import {
	addMonthsClamped,
	buildDueDates,
	buildInstallmentSchedule,
	calcFinalAmount,
	calcInstallmentAmounts,
	getDisplayInstallmentStatus,
	getDueGroup,
	getInstallmentStatusLabel,
	getInstallmentStatusVariant,
	getOverdueDays,
	getPaymentMethodLabel,
	getSubscriptionStatusLabel,
	validateDueDates,
	validatePlanAmounts,
	suggestLessonGrants,
	validateLessonGrants,
	normalizeLessonGrants,
	sumLessonGrants
} from './subscription';

describe('calcInstallmentAmounts', () => {
	it('나머지를 마지막 회차에 몰아서 계산한다', () => {
		const amounts = calcInstallmentAmounts({
			total_amount: 954000,
			installment_count: 4,
			monthly_amount: 230000
		});
		expect(amounts).toEqual([230000, 230000, 230000, 264000]);
		expect(amounts.reduce((a, b) => a + b, 0)).toBe(954000);
	});

	it('1회 납부면 월 납입액을 무시하고 전액을 넣는다', () => {
		expect(
			calcInstallmentAmounts({
				total_amount: 500000,
				installment_count: 1,
				monthly_amount: 999
			})
		).toEqual([500000]);
	});

	it('마지막 회차가 월 납입액보다 작아도 그대로 계산한다', () => {
		expect(
			calcInstallmentAmounts({
				total_amount: 800000,
				installment_count: 4,
				monthly_amount: 230000
			})
		).toEqual([230000, 230000, 230000, 110000]);
	});
});

describe('calcFinalAmount', () => {
	it('마지막 회차 금액을 반환한다', () => {
		expect(
			calcFinalAmount({ total_amount: 954000, installment_count: 4, monthly_amount: 230000 })
		).toBe(264000);
	});
});

describe('validatePlanAmounts', () => {
	const base = { total_amount: 954000, installment_count: 4, monthly_amount: 230000 };

	it('정상 조합은 null 을 반환한다', () => {
		expect(validatePlanAmounts(base)).toBeNull();
	});

	it('월 납입액 x (횟수-1) 이 총액과 같으면 거부한다 (마지막 0원)', () => {
		expect(
			validatePlanAmounts({ total_amount: 690000, installment_count: 4, monthly_amount: 230000 })
		).toContain('마지막 회차');
	});

	it('월 납입액 x (횟수-1) 이 총액을 넘으면 거부한다 (마지막 음수)', () => {
		expect(
			validatePlanAmounts({ total_amount: 500000, installment_count: 4, monthly_amount: 230000 })
		).toContain('마지막 회차');
	});

	it('횟수가 0 이면 거부한다', () => {
		expect(validatePlanAmounts({ ...base, installment_count: 0 })).toEqual(expect.any(String));
	});

	it('횟수가 36을 넘으면 거부한다', () => {
		expect(validatePlanAmounts({ ...base, installment_count: 37 })).toContain('36회');
	});

	it('총액이 0 이면 거부한다', () => {
		expect(validatePlanAmounts({ ...base, total_amount: 0 })).toEqual(expect.any(String));
	});

	it('총액이 정수가 아니면 거부한다', () => {
		expect(validatePlanAmounts({ ...base, total_amount: 954000.5 })).toEqual(expect.any(String));
	});

	it('1회 납부면 월 납입액을 검증하지 않는다', () => {
		expect(
			validatePlanAmounts({ total_amount: 500000, installment_count: 1, monthly_amount: 0 })
		).toBeNull();
	});
});

describe('addMonthsClamped', () => {
	it('같은 날짜로 개월을 더한다', () => {
		expect(addMonthsClamped('2026-03-01', 2)).toBe('2026-05-01');
	});

	it('말일은 대상 월의 말일로 보정한다', () => {
		expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
	});

	it('윤년 2월은 29일로 보정한다', () => {
		expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
	});

	it('해를 넘겨도 정확하다', () => {
		expect(addMonthsClamped('2026-11-30', 3)).toBe('2027-02-28');
	});
});

describe('buildDueDates', () => {
	it('기준일에서 매월 같은 날로 만든다', () => {
		expect(buildDueDates('2026-03-01', 4)).toEqual([
			'2026-03-01',
			'2026-04-01',
			'2026-05-01',
			'2026-06-01'
		]);
	});

	// 직전 회차를 기준으로 체인하면 1/31 -> 2/28 -> 3/28 로 굳어버린다
	it('말일 기준일도 매달 말일로 복원된다 (체인 계산이 아님)', () => {
		expect(buildDueDates('2026-01-31', 4)).toEqual([
			'2026-01-31',
			'2026-02-28',
			'2026-03-31',
			'2026-04-30'
		]);
	});

	it('기준일이 없으면 빈 배열', () => {
		expect(buildDueDates('', 4)).toEqual([]);
	});
});

describe('buildInstallmentSchedule', () => {
	it('예정일과 금액을 회차별로 묶는다', () => {
		expect(
			buildInstallmentSchedule('2026-03-01', {
				total_amount: 954000,
				installment_count: 4,
				monthly_amount: 230000
			})
		).toEqual([
			{ seq: 1, due_date: '2026-03-01', amount: 230000, lessons: 0 },
			{ seq: 2, due_date: '2026-04-01', amount: 230000, lessons: 0 },
			{ seq: 3, due_date: '2026-05-01', amount: 230000, lessons: 0 },
			{ seq: 4, due_date: '2026-06-01', amount: 264000, lessons: 0 }
		]);
	});
});

describe('validateDueDates', () => {
	it('정상 배열은 null 을 반환한다', () => {
		expect(validateDueDates(['2026-03-01', '2026-04-01', '2026-05-01'], 3)).toBeNull();
	});

	it('개수가 다르면 거부한다', () => {
		expect(validateDueDates(['2026-03-01'], 3)).toContain('3개');
	});

	it('순서가 거꾸로면 거부한다', () => {
		expect(validateDueDates(['2026-04-01', '2026-03-01'], 2)).toContain('순서');
	});

	it('같은 날짜가 겹치면 거부한다', () => {
		expect(validateDueDates(['2026-03-01', '2026-03-01'], 2)).toContain('순서');
	});

	it('비어 있는 날짜가 있으면 거부한다', () => {
		expect(validateDueDates(['2026-03-01', ''], 2)).toContain('입력');
	});

	it('과거 날짜는 허용한다 (진행 중 분납 백필)', () => {
		expect(validateDueDates(['2020-01-01', '2020-02-01'], 2)).toBeNull();
	});
});

describe('getOverdueDays', () => {
	it('예정일이 지났으면 일수를 반환한다', () => {
		expect(getOverdueDays('2026-03-05', '2026-03-10')).toBe(5);
	});

	it('예정일이 오늘이면 0', () => {
		expect(getOverdueDays('2026-03-10', '2026-03-10')).toBe(0);
	});

	it('예정일이 아직 안 지났으면 0', () => {
		expect(getOverdueDays('2026-03-20', '2026-03-10')).toBe(0);
	});

	it('ISO 문자열도 날짜부만 비교한다', () => {
		expect(getOverdueDays('2026-03-05T00:00:00.000Z', '2026-03-10')).toBe(5);
	});
});

describe('getDisplayInstallmentStatus', () => {
	it('완납은 예정일과 무관하게 PAID', () => {
		expect(
			getDisplayInstallmentStatus({ status: 'PAID', due_date: '2026-01-01' }, '2026-03-10')
		).toBe('PAID');
	});

	it('예정일이 지난 미납은 OVERDUE 로 파생한다', () => {
		expect(
			getDisplayInstallmentStatus({ status: 'UNPAID', due_date: '2026-03-05' }, '2026-03-10')
		).toBe('OVERDUE');
	});

	it('예정일이 지난 부분납도 OVERDUE', () => {
		expect(
			getDisplayInstallmentStatus({ status: 'PARTIAL', due_date: '2026-03-05' }, '2026-03-10')
		).toBe('OVERDUE');
	});

	it('아직 안 지난 미납은 UNPAID 그대로', () => {
		expect(
			getDisplayInstallmentStatus({ status: 'UNPAID', due_date: '2026-03-20' }, '2026-03-10')
		).toBe('UNPAID');
	});
});

describe('라벨/배지', () => {
	it('연체는 danger 배지로 표시한다', () => {
		expect(getInstallmentStatusVariant('OVERDUE')).toBe('danger');
		expect(getInstallmentStatusLabel('OVERDUE')).toBe('연체');
	});

	it('구독 상태 라벨을 한국어로 바꾼다', () => {
		expect(getSubscriptionStatusLabel('CANCELLED')).toBe('중단');
	});

	it('결제수단 라벨을 한국어로 바꾼다', () => {
		expect(getPaymentMethodLabel('TRANSFER')).toBe('계좌이체');
	});
});

describe('getDueGroup', () => {
	it('예정일이 지났으면 연체', () => {
		expect(getDueGroup('2026-03-05', '2026-03-10')).toBe('OVERDUE');
	});

	it('같은 달이면 이번 달', () => {
		expect(getDueGroup('2026-03-25', '2026-03-10')).toBe('THIS_MONTH');
	});

	it('다음 달 이후면 예정', () => {
		expect(getDueGroup('2026-04-01', '2026-03-10')).toBe('UPCOMING');
	});
});

// 실제 운영 가격표. 금액 규칙(월 정액 + 마지막 잔금)이 납부 횟수를 정하고,
// 회차 배분은 그 횟수에 맞춰 floor 로 나눈 뒤 나머지를 마지막 회차에 몰아준다.
describe('가격표 기반 회차 배분', () => {
	const cases: Array<[string, number, number, number, number, number[]]> = [
		['전문 1개월', 270000, 270000, 4, 1, [4]],
		['전문 3개월', 657000, 270000, 12, 3, [4, 4, 4]],
		['전문 6개월', 1194000, 270000, 24, 5, [4, 4, 4, 4, 8]],
		['전문 12개월', 2268000, 270000, 48, 9, [5, 5, 5, 5, 5, 5, 5, 5, 8]],
		['취미 1개월', 230000, 230000, 4, 1, [4]],
		['취미 3개월', 540000, 230000, 12, 3, [4, 4, 4]],
		['취미 6개월', 954000, 230000, 24, 4, [6, 6, 6, 6]],
		['취미 12개월', 1788000, 230000, 48, 8, [6, 6, 6, 6, 6, 6, 6, 6]]
	];

	it.each(cases)(
		'%s: 총 회차를 납부 횟수에 맞춰 나누고 나머지를 마지막에 준다',
		(_name, total, monthly, lessons, count, expected) => {
			const amounts = calcInstallmentAmounts({
				total_amount: total,
				installment_count: count,
				monthly_amount: monthly
			});
			expect(amounts).toHaveLength(count);
			expect(amounts.reduce((a, b) => a + b, 0)).toBe(total);

			const grants = suggestLessonGrants({
				total_lessons: lessons,
				installment_count: count
			});
			expect(grants).toEqual(expected);
			expect(sumLessonGrants(grants)).toBe(lessons);
		}
	);

	it('ceil 로 나누면 마지막 회차가 0회가 되는 조합을 floor 가 막는다', () => {
		// 전문 12개월: ceil(48/9) = 6 -> 6 * 8 = 48 -> 마지막 0회
		const grants = suggestLessonGrants({ total_lessons: 48, installment_count: 9 });
		expect(grants[grants.length - 1]).toBeGreaterThan(0);
	});
});

describe('suggestLessonGrants', () => {
	it('1회 납부면 전액을 1회차에 몰아 준다', () => {
		expect(suggestLessonGrants({ total_lessons: 12, installment_count: 1 })).toEqual([12]);
	});

	it('총 회차가 0이면 모두 0이다 (수납 장부 전용)', () => {
		expect(suggestLessonGrants({ total_lessons: 0, installment_count: 3 })).toEqual([0, 0, 0]);
	});
});

describe('validateLessonGrants', () => {
	it('합계가 총 회차와 다르면 거부한다', () => {
		expect(validateLessonGrants([4, 4, 3], 3, 12)).toContain('합계');
	});

	it('개수가 납부 횟수와 다르면 거부한다', () => {
		expect(validateLessonGrants([4, 4], 3, 12)).toContain('3개');
	});

	it('음수는 거부한다', () => {
		expect(validateLessonGrants([-1, 6, 7], 3, 12)).toContain('0 이상');
	});

	it('배열을 생략하면 통과한다 (기본 배분을 쓴다)', () => {
		expect(validateLessonGrants(undefined, 3, 12)).toBeNull();
	});

	it('총 회차가 0이면 배열이 없어도 통과한다', () => {
		expect(validateLessonGrants(undefined, 3, 0)).toBeNull();
	});

	it('총 회차가 0인데 배분이 들어오면 거부한다', () => {
		expect(validateLessonGrants([1, 0, 0], 3, 0)).toContain('모두 0');
	});

	it('원장이 마지막에 몰지 않고 균등하게 바꾼 배분도 허용한다', () => {
		// 전문 6개월 기본값 [4,4,4,4,8] 대신 [5,5,5,5,4] 로 조정
		expect(validateLessonGrants([5, 5, 5, 5, 4], 5, 24)).toBeNull();
	});
});

describe('normalizeLessonGrants', () => {
	const plan = { total_lessons: 12, installment_count: 3 };

	it('길이가 맞으면 그대로 쓴다', () => {
		expect(normalizeLessonGrants([6, 3, 3], plan)).toEqual([6, 3, 3]);
	});

	it('납부 횟수가 바뀌어 길이가 안 맞으면 기본 배분으로 되돌린다', () => {
		expect(normalizeLessonGrants([6, 6], plan)).toEqual([4, 4, 4]);
	});

	it('null 이면 기본 배분을 쓴다', () => {
		expect(normalizeLessonGrants(null, plan)).toEqual([4, 4, 4]);
	});
});

describe('buildInstallmentSchedule', () => {
	it('회차별 지급 수강 회차를 함께 내려준다', () => {
		const schedule = buildInstallmentSchedule(
			'2026-03-01',
			{ total_amount: 657000, installment_count: 3, monthly_amount: 270000 },
			[4, 4, 4]
		);
		expect(schedule.map((r) => r.lessons)).toEqual([4, 4, 4]);
		expect(schedule[2].amount).toBe(117000);
	});

	it('회차 배분을 안 주면 0으로 채운다', () => {
		const schedule = buildInstallmentSchedule('2026-03-01', {
			total_amount: 657000,
			installment_count: 3,
			monthly_amount: 270000
		});
		expect(schedule.map((r) => r.lessons)).toEqual([0, 0, 0]);
	});
});
