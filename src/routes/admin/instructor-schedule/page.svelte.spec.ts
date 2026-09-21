import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InstructorSchedulePage from './+page.svelte';
import { getInstructorSchedule, updateReservationStatus } from '$lib/api/reservation';
import { getInstructors } from '$lib/api/member';
import type {
	InstructorScheduleData,
	ReservationStatus,
	ScheduleSlotReservation
} from '$lib/types/reservation';
import { getTodayString } from '$lib/utils/format';

vi.mock('$lib/api/reservation', () => ({
	getInstructorSchedule: vi.fn(),
	updateReservationStatus: vi.fn()
}));
vi.mock('$lib/api/member', () => ({ getInstructors: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { error: vi.fn(), success: vi.fn(), info: vi.fn() }
}));

const mockedGetSchedule = vi.mocked(getInstructorSchedule);
const mockedGetInstructors = vi.mocked(getInstructors);
const mockedUpdate = vi.mocked(updateReservationStatus);

function makeReservation(
	id: number,
	name: string,
	status: ReservationStatus
): ScheduleSlotReservation {
	return { reservation_id: id, member_name: name, pass_category: null, status, sequence: id };
}

function makeSchedule(reservations: ScheduleSlotReservation[]): InstructorScheduleData {
	return {
		instructors: [{ instructor_id: 3, instructor_name: 'Joe' }],
		days: {
			[getTodayString()]: [
				{
					slot_id: 9,
					instructor_id: 3,
					instructor_name: 'Joe',
					slot_type: 'REGULAR',
					start_time: '19:00',
					end_time: '20:00',
					max_capacity: 4,
					current_count: reservations.length,
					status: 'OPEN',
					reservations
				}
			]
		}
	};
}

function ok<T>(data: T) {
	return { status: true, message: '', data };
}

describe('/admin/instructor-schedule', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedGetInstructors.mockResolvedValue(ok([]) as never);
	});

	it('PENDING/CONFIRMED 예약에만 취소 버튼을 보여준다', async () => {
		mockedGetSchedule.mockResolvedValue(
			ok(
				makeSchedule([
					makeReservation(1, '대기학생', 'PENDING'),
					makeReservation(2, '확정학생', 'CONFIRMED'),
					makeReservation(3, '완료학생', 'COMPLETED')
				])
			)
		);
		render(InstructorSchedulePage);

		await expect.element(page.getByText('완료학생')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '대기학생 예약 취소' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '확정학생 예약 취소' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '완료학생 예약 취소' }))
			.not.toBeInTheDocument();
	});

	it('취소가 끝나면 캐시를 비우고 해당 월 스케줄을 다시 조회한다', async () => {
		mockedGetSchedule
			.mockResolvedValueOnce(ok(makeSchedule([makeReservation(2, '확정학생', 'CONFIRMED')])))
			.mockResolvedValueOnce(ok(makeSchedule([])));
		mockedUpdate.mockResolvedValue({ status: true, message: '', data: undefined });
		render(InstructorSchedulePage);

		await page.getByRole('button', { name: '확정학생 예약 취소' }).click();
		await page.getByLabelText('취소 사유').fill('강사 사정');
		await page.getByRole('button', { name: '예약 취소', exact: true }).click();

		await vi.waitFor(() => expect(mockedGetSchedule).toHaveBeenCalledTimes(2));
		expect(mockedUpdate).toHaveBeenCalledWith(1, 2, {
			status: 'CANCELLED',
			cancel_reason: '강사 사정'
		});
		await expect.element(page.getByText('확정학생')).not.toBeInTheDocument();
	});

	it('재조회가 실패해도 취소한 학생은 명단에서 바로 빠진다', async () => {
		mockedGetSchedule
			.mockResolvedValueOnce(ok(makeSchedule([makeReservation(2, '확정학생', 'CONFIRMED')])))
			.mockRejectedValueOnce(new Error('network'));
		mockedUpdate.mockResolvedValue({ status: true, message: '', data: undefined });
		render(InstructorSchedulePage);

		await page.getByRole('button', { name: '확정학생 예약 취소' }).click();
		await page.getByLabelText('취소 사유').fill('강사 사정');
		await page.getByRole('button', { name: '예약 취소', exact: true }).click();

		await expect.element(page.getByText('확정학생')).not.toBeInTheDocument();
		await vi.waitFor(() => expect(mockedGetSchedule).toHaveBeenCalledTimes(2));
	});
});
