import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InstructorWithdrawModal from './InstructorWithdrawModal.svelte';
import { deleteInstructor } from '$lib/api/member';
import { getInstructorUpcomingSlots } from '$lib/api/reservation';
import { goto } from '$app/navigation';
import { ApiError } from '$lib/types/api';
import type { InstructorUpcomingSlots } from '$lib/types/reservation';

vi.mock('$lib/api/member', () => ({ deleteInstructor: vi.fn() }));
vi.mock('$lib/api/reservation', () => ({ getInstructorUpcomingSlots: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { success: vi.fn(), error: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const mockedUpcoming = vi.mocked(getInstructorUpcomingSlots);
const mockedDelete = vi.mocked(deleteInstructor);

function upcoming(total: number, reserved: number) {
	const data: InstructorUpcomingSlots = {
		instructor: { instructor_id: 5, instructor_name: 'Effy', is_withdrawn: false },
		slots: [],
		total,
		reserved_count: reserved
	};
	return { status: true, message: '', data };
}

const instructor = { id: 5, name: 'Effy' };

describe('InstructorWithdrawModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('남은 수업이 있으면 탈퇴 대신 수업 정리로 안내한다', async () => {
		mockedUpcoming.mockResolvedValue(upcoming(11, 2));
		const onclose = vi.fn();
		render(InstructorWithdrawModal, { isOpen: true, instructor, onclose, onwithdrawn: vi.fn() });

		await expect.element(page.getByText('11건')).toBeInTheDocument();
		expect(page.getByRole('button', { name: '탈퇴', exact: true }).query()).toBeNull();

		await page.getByRole('button', { name: '수업 정리하기' }).click();
		expect(onclose).toHaveBeenCalled();
		expect(goto).toHaveBeenCalledWith('/admin/instructors/5/slots');
	});

	it('남은 수업이 없으면 탈퇴를 진행한다', async () => {
		mockedUpcoming.mockResolvedValue(upcoming(0, 0));
		mockedDelete.mockResolvedValue({ status: true, message: '', data: null });
		const onwithdrawn = vi.fn();
		render(InstructorWithdrawModal, { isOpen: true, instructor, onclose: vi.fn(), onwithdrawn });

		await page.getByRole('button', { name: '탈퇴', exact: true }).click();

		await vi.waitFor(() => expect(onwithdrawn).toHaveBeenCalled());
		expect(mockedDelete).toHaveBeenCalledWith(1, 5);
	});

	it('탈퇴가 409로 막히면 남은 수업을 다시 확인해 안내한다', async () => {
		mockedUpcoming.mockResolvedValueOnce(upcoming(0, 0)).mockResolvedValueOnce(upcoming(1, 0));
		mockedDelete.mockRejectedValue(new ApiError(409, '예정된 수업 1건(예약 0건)이 남아 있습니다.'));
		const onwithdrawn = vi.fn();
		render(InstructorWithdrawModal, { isOpen: true, instructor, onclose: vi.fn(), onwithdrawn });

		await page.getByRole('button', { name: '탈퇴', exact: true }).click();

		await expect.element(page.getByRole('button', { name: '수업 정리하기' })).toBeInTheDocument();
		expect(onwithdrawn).not.toHaveBeenCalled();
		expect(mockedUpcoming).toHaveBeenCalledTimes(2);
	});

	it('다른 강사로 다시 열리면 이전 강사의 늦은 응답은 무시한다', async () => {
		let resolveFirst: (value: ReturnType<typeof upcoming>) => void = () => {};
		mockedUpcoming
			.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce(upcoming(3, 0));
		const { rerender } = render(InstructorWithdrawModal, {
			isOpen: true,
			instructor,
			onclose: vi.fn(),
			onwithdrawn: vi.fn()
		});

		await rerender({ instructor: { id: 6, name: 'Joe' } });
		await expect.element(page.getByText('3건')).toBeInTheDocument();
		resolveFirst(upcoming(0, 0));

		await expect.element(page.getByRole('button', { name: '수업 정리하기' })).toBeInTheDocument();
		expect(page.getByRole('button', { name: '탈퇴', exact: true }).query()).toBeNull();
	});
});
