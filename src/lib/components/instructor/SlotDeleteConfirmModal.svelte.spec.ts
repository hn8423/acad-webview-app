import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SlotDeleteConfirmModal from './SlotDeleteConfirmModal.svelte';
import { bulkDeleteSlots } from '$lib/api/reservation';
import { toastStore } from '$lib/stores/toast.svelte';
import { ApiError } from '$lib/types/api';
import type { UpcomingSlot } from '$lib/types/reservation';

vi.mock('$lib/api/reservation', () => ({ bulkDeleteSlots: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

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

const reservedSlot = makeSlot(2, {
	current_count: 1,
	reservations: [{ reservation_id: 20, member_name: '홍길동', status: 'CONFIRMED' }]
});

function ok(deleted: number, cancelled: number) {
	return {
		status: true,
		message: '',
		data: { deleted_slot_count: deleted, cancelled_reservation_count: cancelled }
	};
}

describe('SlotDeleteConfirmModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('예약 없는 수업만이면 경고 없이 슬롯 id만 보내 삭제한다', async () => {
		mockedBulkDelete.mockResolvedValue(ok(2, 0));
		const ondone = vi.fn();
		render(SlotDeleteConfirmModal, {
			isOpen: true,
			slots: [makeSlot(1), makeSlot(3)],
			onclose: vi.fn(),
			ondone
		});

		await expect.element(page.getByText('예약이 없는 수업만 삭제됩니다.')).toBeInTheDocument();
		await page.getByRole('button', { name: '삭제', exact: true }).click();

		await vi.waitFor(() => expect(ondone).toHaveBeenCalled());
		expect(mockedBulkDelete).toHaveBeenCalledWith(1, {
			slot_ids: [1, 3]
		});
		expect(toastStore.success).toHaveBeenCalledWith('수업 2건을 삭제했습니다.');
		expect(ondone).toHaveBeenCalledWith({ deleted_slot_count: 2, cancelled_reservation_count: 0 });
	});

	it('예약 있는 수업은 회원 이름을 보여주고 사유와 함께 예약을 취소한다', async () => {
		mockedBulkDelete.mockResolvedValue(ok(1, 1));
		const ondone = vi.fn();
		render(SlotDeleteConfirmModal, {
			isOpen: true,
			slots: [reservedSlot],
			onclose: vi.fn(),
			ondone
		});

		await expect.element(page.getByText('홍길동')).toBeInTheDocument();
		await expect.element(page.getByRole('alert')).toHaveTextContent('예약 회원 1명');
		await page.getByLabelText('취소 사유 (선택)').fill('강사 퇴사');
		await page.getByRole('button', { name: '예약 취소 후 삭제' }).click();

		await vi.waitFor(() => expect(ondone).toHaveBeenCalled());
		expect(mockedBulkDelete).toHaveBeenCalledWith(1, {
			slot_ids: [2],
			confirmed_reservation_ids: [20],
			cancel_reason: '강사 퇴사'
		});
		expect(toastStore.success).toHaveBeenCalledWith('수업 1건을 삭제했습니다. (예약 1건 취소)');
	});

	it('그사이 예약이 들어와 409가 나면 null 로 알려 목록을 다시 받게 한다', async () => {
		mockedBulkDelete.mockRejectedValue(new ApiError(409, '예약이 있는 수업이 포함되어 있습니다.'));
		const ondone = vi.fn();
		render(SlotDeleteConfirmModal, {
			isOpen: true,
			slots: [makeSlot(1)],
			onclose: vi.fn(),
			ondone
		});

		await page.getByRole('button', { name: '삭제', exact: true }).click();

		await vi.waitFor(() => expect(ondone).toHaveBeenCalledWith(null));
		expect(toastStore.success).not.toHaveBeenCalled();
	});

	it('200 실패 응답이면 메시지를 토스트로 띄운다', async () => {
		mockedBulkDelete.mockResolvedValue({
			status: false,
			message: '삭제할 수 없는 수업이 포함되어 있습니다.',
			data: { deleted_slot_count: 0, cancelled_reservation_count: 0 }
		});
		const ondone = vi.fn();
		render(SlotDeleteConfirmModal, {
			isOpen: true,
			slots: [makeSlot(1)],
			onclose: vi.fn(),
			ondone
		});

		await page.getByRole('button', { name: '삭제', exact: true }).click();

		await vi.waitFor(() => expect(ondone).toHaveBeenCalledWith(null));
		expect(toastStore.error).toHaveBeenCalledWith('삭제할 수 없는 수업이 포함되어 있습니다.');
	});

	it('나눠 보내다 실패하면 이미 지운 건수를 알리고 null 로 끝낸다', async () => {
		const slots = Array.from({ length: 201 }, (_, i) => makeSlot(i + 1));
		mockedBulkDelete
			.mockResolvedValueOnce(ok(200, 0))
			.mockRejectedValueOnce(new ApiError(409, '그사이 수업 상태가 바뀌었습니다.'));
		const ondone = vi.fn();
		render(SlotDeleteConfirmModal, { isOpen: true, slots, onclose: vi.fn(), ondone });

		await page.getByRole('button', { name: '삭제', exact: true }).click();

		await vi.waitFor(() => expect(ondone).toHaveBeenCalledWith(null));
		expect(mockedBulkDelete).toHaveBeenCalledTimes(2);
		expect(toastStore.info).toHaveBeenCalledWith(
			'일부만 처리되었습니다. 수업 200건을 삭제했습니다.'
		);
		expect(toastStore.success).not.toHaveBeenCalled();
	});
});
