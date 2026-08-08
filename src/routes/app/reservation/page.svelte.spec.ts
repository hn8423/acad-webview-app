import { page as browserPage } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ReservationPage from './+page.svelte';
import { getMyPasses } from '$lib/api/member';
import {
	getAvailableSlots,
	getLessonSlotsMonthlySummary,
	getMyReservations
} from '$lib/api/reservation';
import { toastStore } from '$lib/stores/toast.svelte';
import type { MemberPass } from '$lib/types/member';
import type { AvailableSlot } from '$lib/types/reservation';

vi.mock('$lib/api/member', () => ({ getMyPasses: vi.fn() }));
vi.mock('$lib/api/reservation', () => ({
	getAvailableSlots: vi.fn(),
	getMyReservations: vi.fn(),
	getLessonSlotsMonthlySummary: vi.fn(),
	createReservation: vi.fn(),
	cancelReservation: vi.fn(),
	cancelReservationAsNoShow: vi.fn()
}));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { error: vi.fn(), success: vi.fn(), info: vi.fn() }
}));

const mockedGetMyPasses = vi.mocked(getMyPasses);
const mockedGetAvailableSlots = vi.mocked(getAvailableSlots);
const mockedGetMyReservations = vi.mocked(getMyReservations);
const mockedGetMonthlySummary = vi.mocked(getLessonSlotsMonthlySummary);
const mockedToastError = vi.mocked(toastStore.error);

// 만료 판정이 오늘 기준이라 날짜는 상대값으로 만든다
function daysFromToday(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toLocaleDateString('sv-SE');
}

function formatDot(date: string): string {
	return date.replaceAll('-', '.');
}

function makePass(overrides: Partial<MemberPass> = {}): MemberPass {
	return {
		id: 1,
		pass_name: '취미반 1개월',
		pass_category: 'ROTATION',
		ticket_value: 1,
		instructor_id: 7,
		instructor_name: 'Joe',
		start_date: daysFromToday(-27),
		end_date: daysFromToday(1),
		total_lessons: 4,
		remaining_lessons: 1,
		available_lessons: 1,
		pending_count: 0,
		status: 'ACTIVE',
		...overrides
	};
}

function makeSlot(overrides: Partial<AvailableSlot> = {}): AvailableSlot {
	return {
		slot_id: 100,
		slot_type: 'REGULAR',
		instructor_name: 'Joe',
		slot_date: daysFromToday(0),
		start_time: '21:00',
		end_time: '22:00',
		remaining_capacity: 1,
		...overrides
	};
}

function ok<T>(data: T) {
	return { status: true, message: '', data };
}

function arrange(passes: MemberPass[], slots: AvailableSlot[]) {
	mockedGetMyPasses.mockResolvedValue(ok(passes));
	mockedGetAvailableSlots.mockResolvedValue(ok(slots));
	mockedGetMyReservations.mockResolvedValue(ok([]));
	mockedGetMonthlySummary.mockResolvedValue(ok({}));
}

describe('/app/reservation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('수강권 유효기간이 지난 날짜의 슬롯은 기간 만료로 표시한다', async () => {
		arrange(
			[makePass({ end_date: daysFromToday(1) })],
			[makeSlot({ slot_date: daysFromToday(3) })]
		);

		render(ReservationPage);

		await expect.element(browserPage.getByText('기간 만료')).toBeInTheDocument();
	});

	it('기간 만료 슬롯을 누르면 유효기간 종료일을 알려준다', async () => {
		const endDate = daysFromToday(1);
		arrange([makePass({ end_date: endDate })], [makeSlot({ slot_date: daysFromToday(3) })]);

		render(ReservationPage);

		await browserPage.getByRole('button', { name: /Joe 선생님/ }).click();

		expect(mockedToastError).toHaveBeenCalledWith(
			`수강권 유효기간이 ${formatDot(endDate)}에 끝나 이 날짜는 예약할 수 없습니다.`
		);
	});

	it('선택한 날짜 전체가 막혀 있으면 목록 위에 사유를 안내한다', async () => {
		const endDate = daysFromToday(-1);
		arrange([makePass({ end_date: endDate })], [makeSlot()]);

		render(ReservationPage);

		await expect
			.element(
				browserPage.getByText(`수강권 유효기간이 ${formatDot(endDate)}에 끝나`, { exact: false })
			)
			.toBeInTheDocument();
	});

	it('잔여가 모두 예약에 묶여 있으면 잔여 없음으로 표시한다', async () => {
		arrange(
			[makePass({ remaining_lessons: 1, available_lessons: 0, pending_count: 1 })],
			[makeSlot()]
		);

		render(ReservationPage);

		await expect.element(browserPage.getByText('잔여 없음')).toBeInTheDocument();
	});

	it('예약 가능한 슬롯은 눌렀을 때 예약 확인 시트를 연다', async () => {
		arrange([makePass()], [makeSlot()]);

		render(ReservationPage);

		await browserPage.getByRole('button', { name: /Joe 선생님/ }).click();

		await expect.element(browserPage.getByText('예약 확인')).toBeInTheDocument();
		expect(mockedToastError).not.toHaveBeenCalled();
	});
});
