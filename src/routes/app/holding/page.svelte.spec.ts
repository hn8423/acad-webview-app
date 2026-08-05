import { page as browserPage } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HoldingPage from './+page.svelte';
import { getMyPasses } from '$lib/api/member';
import { getMyReservations } from '$lib/api/reservation';
import { createMyHolding } from '$lib/api/holding';
import type { MemberPass } from '$lib/types/member';
import type { MyReservation } from '$lib/types/reservation';

vi.mock('$lib/api/member', () => ({ getMyPasses: vi.fn() }));
vi.mock('$lib/api/reservation', () => ({ getMyReservations: vi.fn() }));
vi.mock('$lib/api/holding', () => ({ createMyHolding: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/app/holding') }
}));

const mockedGetMyPasses = vi.mocked(getMyPasses);
const mockedGetMyReservations = vi.mocked(getMyReservations);
const mockedCreateMyHolding = vi.mocked(createMyHolding);

// 오늘 이후만 신청 가능하므로 날짜는 오늘 기준 상대값으로 만든다
function daysFromToday(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toLocaleDateString('sv-SE');
}

function makePass(overrides: Partial<MemberPass> = {}): MemberPass {
	return {
		id: 12,
		pass_name: '취미반 4회',
		pass_category: 'ROTATION',
		instructor_name: '김강사',
		start_date: daysFromToday(-10),
		end_date: daysFromToday(60),
		total_lessons: 8,
		remaining_lessons: 5,
		hold_days: 30,
		hold_used_days: 0,
		remaining_hold_days: 30,
		status: 'ACTIVE',
		...overrides
	};
}

function makeReservation(overrides: Partial<MyReservation> = {}): MyReservation {
	return {
		reservation_id: 1,
		member_pass_id: 12,
		slot_type: 'REGULAR',
		instructor_name: '김강사',
		slot_date: daysFromToday(5),
		start_time: '19:00',
		end_time: '20:00',
		status: 'CONFIRMED',
		created_at: daysFromToday(-1),
		...overrides
	};
}

function ok<T>(data: T) {
	return { status: true, message: '', data };
}

function arrange(passes: MemberPass[], reservations: MyReservation[] = []) {
	mockedGetMyPasses.mockResolvedValue(ok(passes));
	mockedGetMyReservations.mockResolvedValue(ok(reservations));
}

describe('/app/holding', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('홀딩 가능한 수강권이 없으면 안내 문구를 보여준다', async () => {
		arrange([makePass({ hold_days: 0, remaining_hold_days: 0 })]);

		render(HoldingPage);

		await expect
			.element(browserPage.getByText('홀딩할 수 있는 수강권이 없습니다.'))
			.toBeInTheDocument();
	});

	it('이미 홀딩 중인 수강권은 신청 대상에서 제외한다', async () => {
		arrange([makePass({ status: 'HOLDING' })]);

		render(HoldingPage);

		await expect
			.element(browserPage.getByText('홀딩할 수 있는 수강권이 없습니다.'))
			.toBeInTheDocument();
	});

	it('선택한 수강권의 잔여 홀딩 일수를 보여준다', async () => {
		arrange([makePass({ remaining_hold_days: 21 })]);

		render(HoldingPage);

		await expect.element(browserPage.getByTestId('remaining-hold-days')).toHaveTextContent('21일');
	});

	it('기간을 고르면 홀딩 일수를 종료일 포함으로 계산해 보여준다', async () => {
		arrange([makePass()]);

		render(HoldingPage);

		await browserPage.getByLabelText('시작일').fill(daysFromToday(1));
		await browserPage.getByLabelText('종료일').fill(daysFromToday(7));

		await expect.element(browserPage.getByTestId('holding-days')).toHaveTextContent('7일');
		await expect.element(browserPage.getByText('만료일 연장')).toBeInTheDocument();
	});

	it('잔여 홀딩 일수를 초과하면 사유를 안내하고 신청을 막는다', async () => {
		arrange([makePass({ hold_days: 5, hold_used_days: 0, remaining_hold_days: 5 })]);

		render(HoldingPage);

		await browserPage.getByLabelText('시작일').fill(daysFromToday(1));
		await browserPage.getByLabelText('종료일').fill(daysFromToday(20));

		await expect.element(browserPage.getByText(/잔여 홀딩 일수가 부족합니다/)).toBeInTheDocument();
		await expect.element(browserPage.getByRole('button', { name: '홀딩 신청' })).toBeDisabled();
		expect(mockedCreateMyHolding).not.toHaveBeenCalled();
	});

	it('홀딩 구간에 걸린 예약 건수를 미리 보여준다', async () => {
		arrange([makePass()], [makeReservation({ slot_date: daysFromToday(3) })]);

		render(HoldingPage);

		await browserPage.getByLabelText('시작일').fill(daysFromToday(1));
		await browserPage.getByLabelText('종료일').fill(daysFromToday(7));

		await expect
			.element(browserPage.getByText('이 기간의 예약 1건이 취소됩니다.'))
			.toBeInTheDocument();
	});

	it('홀딩 구간 밖의 예약은 취소 대상에 넣지 않는다', async () => {
		arrange([makePass()], [makeReservation({ slot_date: daysFromToday(30) })]);

		render(HoldingPage);

		await browserPage.getByLabelText('시작일').fill(daysFromToday(1));
		await browserPage.getByLabelText('종료일').fill(daysFromToday(7));

		await expect.element(browserPage.getByText('만료일 연장')).toBeInTheDocument();
		await expect(browserPage.getByText(/이 기간의 예약 .*건이 취소됩니다/).elements()).toHaveLength(
			0
		);
	});

	it('다른 수강권의 예약은 취소 대상에 넣지 않는다', async () => {
		arrange([makePass()], [makeReservation({ member_pass_id: 999, slot_date: daysFromToday(3) })]);

		render(HoldingPage);

		await browserPage.getByLabelText('시작일').fill(daysFromToday(1));
		await browserPage.getByLabelText('종료일').fill(daysFromToday(7));

		await expect(browserPage.getByText(/이 기간의 예약 .*건이 취소됩니다/).elements()).toHaveLength(
			0
		);
	});

	it('이미 취소된 예약은 취소 대상에 넣지 않는다', async () => {
		arrange([makePass()], [makeReservation({ status: 'CANCELLED', slot_date: daysFromToday(3) })]);

		render(HoldingPage);

		await browserPage.getByLabelText('시작일').fill(daysFromToday(1));
		await browserPage.getByLabelText('종료일').fill(daysFromToday(7));

		await expect(browserPage.getByText(/이 기간의 예약 .*건이 취소됩니다/).elements()).toHaveLength(
			0
		);
	});

	it('확인 시트에서 승인하면 홀딩을 신청한다', async () => {
		arrange([makePass()]);
		mockedCreateMyHolding.mockResolvedValue(
			ok({
				holding_id: 1,
				holding_start: daysFromToday(1),
				holding_end: daysFromToday(7),
				holding_days: 7,
				end_date: daysFromToday(67),
				remaining_hold_days: 23,
				cancelled_reservation_count: 0
			})
		);

		render(HoldingPage);

		const start = daysFromToday(1);
		const end = daysFromToday(7);
		await browserPage.getByLabelText('시작일').fill(start);
		await browserPage.getByLabelText('종료일').fill(end);

		// 폼의 신청 버튼 -> 확인 시트 -> 시트의 신청 버튼
		await browserPage.getByRole('button', { name: '홀딩 신청' }).first().click();
		await expect.element(browserPage.getByText('홀딩 신청 확인')).toBeInTheDocument();
		await browserPage.getByRole('button', { name: '홀딩 신청' }).last().click();

		await vi.waitFor(() => {
			expect(mockedCreateMyHolding).toHaveBeenCalledWith(1, 12, {
				holding_start: start,
				holding_end: end
			});
		});
	});

	it('서버가 거절하면 에러 메시지를 노출하고 시트를 닫는다', async () => {
		arrange([makePass()]);
		mockedCreateMyHolding.mockResolvedValue({
			status: false,
			message: '이미 홀딩이 신청된 기간입니다',
			data: undefined as never
		});

		render(HoldingPage);

		await browserPage.getByLabelText('시작일').fill(daysFromToday(1));
		await browserPage.getByLabelText('종료일').fill(daysFromToday(7));
		await browserPage.getByRole('button', { name: '홀딩 신청' }).first().click();
		await browserPage.getByRole('button', { name: '홀딩 신청' }).last().click();

		await expect
			.element(browserPage.getByText('이미 홀딩이 신청된 기간입니다'))
			.toBeInTheDocument();
	});
});
