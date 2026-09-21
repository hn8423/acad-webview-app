import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ReservationCancelModal from './ReservationCancelModal.svelte';
import { updateReservationStatus } from '$lib/api/reservation';
import { toastStore } from '$lib/stores/toast.svelte';
import type { ScheduleSlot, ScheduleSlotReservation } from '$lib/types/reservation';

vi.mock('$lib/api/reservation', () => ({ updateReservationStatus: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { error: vi.fn(), success: vi.fn(), info: vi.fn() }
}));

const mockedUpdate = vi.mocked(updateReservationStatus);

const reservation: ScheduleSlotReservation = {
	reservation_id: 55,
	member_name: '김학생',
	pass_category: null,
	status: 'CONFIRMED',
	sequence: 1
};

const slot: ScheduleSlot = {
	slot_id: 9,
	instructor_id: 3,
	instructor_name: 'Joe',
	slot_type: 'REGULAR',
	start_time: '19:00',
	end_time: '20:00',
	max_capacity: 1,
	current_count: 1,
	status: 'OPEN',
	reservations: [reservation]
};

function renderModal() {
	const onclose = vi.fn();
	const oncancelled = vi.fn();
	render(ReservationCancelModal, {
		isOpen: true,
		reservation,
		slot,
		date: '2026-09-21',
		onclose,
		oncancelled
	});
	return { onclose, oncancelled };
}

describe('ReservationCancelModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('학생 이름과 수업 정보를 보여준다', async () => {
		renderModal();
		await expect.element(page.getByText('김학생', { exact: false })).toBeInTheDocument();
		await expect.element(page.getByText('Joe', { exact: false })).toBeInTheDocument();
	});

	it('사유가 비어 있으면 취소 버튼이 비활성화된다', async () => {
		renderModal();
		const button = page.getByRole('button', { name: '예약 취소' });
		await expect.element(button).toBeDisabled();
		await page.getByLabelText('취소 사유').fill('   ');
		await expect.element(button).toBeDisabled();
	});

	it('사유를 입력하고 제출하면 CANCELLED로 상태를 변경한다', async () => {
		mockedUpdate.mockResolvedValue({ status: true, message: '', data: undefined });
		const { oncancelled } = renderModal();

		await page.getByLabelText('취소 사유').fill('  강사 사정  ');
		await page.getByRole('button', { name: '예약 취소' }).click();

		await vi.waitFor(() => expect(oncancelled).toHaveBeenCalledTimes(1));
		expect(mockedUpdate).toHaveBeenCalledWith(1, 55, {
			status: 'CANCELLED',
			cancel_reason: '강사 사정'
		});
		expect(toastStore.success).toHaveBeenCalledWith('예약이 취소되었습니다');
	});

	it('API가 실패 응답을 주면 oncancelled를 호출하지 않는다', async () => {
		mockedUpdate.mockResolvedValue({
			status: false,
			message: '이미 처리된 예약입니다',
			data: undefined
		});
		const { oncancelled } = renderModal();

		await page.getByLabelText('취소 사유').fill('사유');
		await page.getByRole('button', { name: '예약 취소' }).click();

		await vi.waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
		expect(oncancelled).not.toHaveBeenCalled();
		expect(toastStore.error).toHaveBeenCalledWith('이미 처리된 예약입니다');
	});

	it('취소 사유 입력란은 필수 항목으로 표시된다', async () => {
		renderModal();
		await expect.element(page.getByLabelText('취소 사유')).toBeRequired();
	});

	it('요청이 예외를 던지면 oncancelled를 호출하지 않는다', async () => {
		mockedUpdate.mockRejectedValue(new Error('409'));
		const { oncancelled } = renderModal();

		await page.getByLabelText('취소 사유').fill('사유');
		await page.getByRole('button', { name: '예약 취소' }).click();

		await vi.waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
		expect(oncancelled).not.toHaveBeenCalled();
	});
});
