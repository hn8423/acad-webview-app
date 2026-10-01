import { page as browserPage } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ReservationPage from './+page.svelte';
import { getMyPasses } from '$lib/api/member';
import {
	createRecurringReservation,
	createReservation,
	getAvailableSlots,
	getLessonSlotsMonthlySummary,
	getMyReservations,
	previewRecurringReservation
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
	previewRecurringReservation: vi.fn(),
	createRecurringReservation: vi.fn(),
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
const mockedToastSuccess = vi.mocked(toastStore.success);
const mockedPreview = vi.mocked(previewRecurringReservation);
const mockedCreateRecurring = vi.mocked(createRecurringReservation);
const mockedCreateReservation = vi.mocked(createReservation);

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

	describe('매주 반복 예약', () => {
		const pass = () =>
			makePass({ remaining_lessons: 10, available_lessons: 10, end_date: daysFromToday(60) });

		function arrangeRecurring() {
			arrange([pass()], [makeSlot()]);
			mockedPreview.mockResolvedValue(
				ok({
					start_time: '21:00',
					end_time: '22:00',
					available_count: 3,
					items: [
						{ slot_id: 100, slot_date: daysFromToday(0), status: 'AVAILABLE' as const },
						{ slot_id: 101, slot_date: daysFromToday(7), status: 'FULL' as const },
						{ slot_id: 102, slot_date: daysFromToday(14), status: 'AVAILABLE' as const },
						{ slot_id: 103, slot_date: daysFromToday(21), status: 'AVAILABLE' as const }
					]
				})
			);
		}

		async function openRecurring() {
			render(ReservationPage);
			await browserPage.getByRole('button', { name: /Joe 선생님/ }).click();
			await browserPage.getByRole('switch', { name: '매주 반복' }).click();
			await expect.element(browserPage.getByRole('button', { name: '3회 예약하기' })).toBeEnabled();
		}

		it('선택한 회차를 한 번에 예약하고 결과를 알린다', async () => {
			arrangeRecurring();
			mockedCreateRecurring.mockResolvedValue(
				ok({
					created: [
						{ reservation_id: 1, slot_id: 100, slot_date: daysFromToday(0) },
						{ reservation_id: 2, slot_id: 102, slot_date: daysFromToday(14) }
					],
					skipped: [{ slot_id: 103, slot_date: daysFromToday(21), reason: 'FULL' as const }]
				})
			);
			await openRecurring();

			await browserPage.getByRole('button', { name: '3회 예약하기' }).click();

			await vi.waitFor(() =>
				expect(mockedCreateRecurring).toHaveBeenCalledWith(1, {
					member_pass_id: 1,
					slot_ids: [100, 102, 103]
				})
			);
			expect(mockedCreateReservation).not.toHaveBeenCalled();
			await vi.waitFor(() =>
				expect(mockedToastSuccess).toHaveBeenCalledWith('2건 예약 완료 · 1건 제외')
			);
		});

		it('하나도 예약되지 않으면 에러로 알린다', async () => {
			arrangeRecurring();
			mockedCreateRecurring.mockResolvedValue(
				ok({
					created: [],
					skipped: [{ slot_id: 100, slot_date: daysFromToday(0), reason: 'FULL' as const }]
				})
			);
			await openRecurring();

			await browserPage.getByRole('button', { name: '3회 예약하기' }).click();

			await vi.waitFor(() =>
				expect(mockedToastError).toHaveBeenCalledWith('예약 가능한 회차가 없습니다')
			);
		});

		it('반복 예약을 마친 뒤 같은 슬롯을 다시 열면 단건 예약 상태로 시작한다', async () => {
			arrangeRecurring();
			mockedCreateRecurring.mockResolvedValue(
				ok({
					created: [],
					skipped: [{ slot_id: 100, slot_date: daysFromToday(0), reason: 'FULL' as const }]
				})
			);
			await openRecurring();
			await browserPage.getByRole('button', { name: '3회 예약하기' }).click();
			await vi.waitFor(() => expect(mockedToastError).toHaveBeenCalled());

			await browserPage.getByRole('button', { name: /Joe 선생님/ }).click();

			await expect
				.element(
					browserPage.getByRole('dialog').getByRole('button', { name: '예약하기', exact: true })
				)
				.toBeInTheDocument();
		});

		it('반복을 끄면 단건 예약으로 돌아간다', async () => {
			arrangeRecurring();
			mockedCreateReservation.mockResolvedValue(
				ok({ reservation_id: 9, status: 'PENDING' as const })
			);
			await openRecurring();

			await browserPage.getByRole('switch', { name: '매주 반복' }).click();
			// 탭 버튼도 '예약하기'라서 시트(dialog) 안의 버튼으로 좁힌다
			await browserPage
				.getByRole('dialog')
				.getByRole('button', { name: '예약하기', exact: true })
				.click();

			await vi.waitFor(() =>
				expect(mockedCreateReservation).toHaveBeenCalledWith(1, {
					slot_id: 100,
					member_pass_id: 1
				})
			);
			expect(mockedCreateRecurring).not.toHaveBeenCalled();
		});
	});
});
