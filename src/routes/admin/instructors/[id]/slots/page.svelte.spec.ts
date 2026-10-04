import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SlotCleanupPage from './+page.svelte';
import { bulkDeleteSlots, getInstructorUpcomingSlots } from '$lib/api/reservation';
import type { InstructorUpcomingSlots, UpcomingSlot } from '$lib/types/reservation';

vi.mock('$lib/api/reservation', () => ({
	getInstructorUpcomingSlots: vi.fn(),
	bulkDeleteSlots: vi.fn()
}));
vi.mock('$lib/api/member', () => ({ deleteInstructor: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { success: vi.fn(), error: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({ page: { params: { id: '5' } } }));

const mockedUpcoming = vi.mocked(getInstructorUpcomingSlots);
const mockedBulkDelete = vi.mocked(bulkDeleteSlots);

function makeSlot(id: number, overrides: Partial<UpcomingSlot> = {}): UpcomingSlot {
	return {
		slot_id: id,
		slot_date: '2026-10-05',
		start_time: '14:00',
		end_time: '15:00',
		slot_type: 'REGULAR',
		status: 'OPEN',
		max_capacity: 1,
		current_count: 0,
		reservations: [],
		...overrides
	};
}

function response(slots: UpcomingSlot[], isWithdrawn = false) {
	const data: InstructorUpcomingSlots = {
		instructor: { instructor_id: 5, instructor_name: 'Effy', is_withdrawn: isWithdrawn },
		slots,
		total: slots.length,
		reserved_count: slots.filter((s) => s.reservations.length > 0).length
	};
	return { status: true, message: '', data };
}

const reserved = makeSlot(2, {
	start_time: '18:00',
	end_time: '19:00',
	current_count: 1,
	reservations: [{ reservation_id: 20, member_name: '홍길동', status: 'CONFIRMED' }]
});

describe('/admin/instructors/[id]/slots', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('강사의 남은 수업과 예약 회원을 보여준다', async () => {
		mockedUpcoming.mockResolvedValue(response([makeSlot(1), reserved]));

		render(SlotCleanupPage);

		expect(mockedUpcoming).toHaveBeenCalledWith(1, 5);
		await expect.element(page.getByRole('heading', { name: 'Effy' })).toBeInTheDocument();
		await expect.element(page.getByText('홍길동 예약')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '예약 없는 수업 모두 삭제 (1)' }))
			.toBeInTheDocument();
	});

	it('예약 없는 수업 모두 삭제는 빈 수업만 보내고 목록을 다시 받는다', async () => {
		mockedUpcoming
			.mockResolvedValueOnce(response([makeSlot(1), reserved]))
			.mockResolvedValueOnce(response([reserved]));
		mockedBulkDelete.mockResolvedValue({
			status: true,
			message: '',
			data: { deleted_slot_count: 1, cancelled_reservation_count: 0 }
		});

		render(SlotCleanupPage);
		await page.getByRole('button', { name: '예약 없는 수업 모두 삭제 (1)' }).click();
		await page.getByRole('button', { name: '삭제', exact: true }).click();

		await vi.waitFor(() => expect(mockedUpcoming).toHaveBeenCalledTimes(2));
		expect(mockedBulkDelete).toHaveBeenCalledWith(1, { slot_ids: [1] });
	});

	it('예약 있는 수업을 선택하면 회원 확인 후 예약 취소와 함께 삭제한다', async () => {
		mockedUpcoming.mockResolvedValue(response([reserved]));
		mockedBulkDelete.mockResolvedValue({
			status: true,
			message: '',
			data: { deleted_slot_count: 1, cancelled_reservation_count: 1 }
		});

		render(SlotCleanupPage);
		await page.getByRole('checkbox').click();
		await page.getByRole('button', { name: '선택한 수업 삭제 (1)' }).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('예약 회원 1명');
		await page.getByRole('button', { name: '예약 취소 후 삭제' }).click();

		await vi.waitFor(() =>
			expect(mockedBulkDelete).toHaveBeenCalledWith(1, {
				slot_ids: [2],
				confirmed_reservation_ids: [20]
			})
		);
	});

	it('남은 수업이 없으면 강사 탈퇴 버튼을 보여준다', async () => {
		mockedUpcoming.mockResolvedValue(response([]));

		render(SlotCleanupPage);

		await expect.element(page.getByText('정리할 수업이 없습니다.')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '강사 탈퇴' })).toBeInTheDocument();
	});

	it('이미 탈퇴한 강사는 정리만 하고 탈퇴 버튼은 없다', async () => {
		mockedUpcoming.mockResolvedValue(response([], true));

		render(SlotCleanupPage);

		await expect.element(page.getByText('탈퇴한 강사')).toBeInTheDocument();
		expect(page.getByRole('button', { name: '강사 탈퇴' }).query()).toBeNull();
	});
});
