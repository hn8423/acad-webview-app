import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RecurringBookingOptions from './RecurringBookingOptions.svelte';
import { previewRecurringReservation } from '$lib/api/reservation';
import type { MemberPass } from '$lib/types/member';
import type { AvailableSlot, RecurringPreviewResponse } from '$lib/types/reservation';

vi.mock('$lib/api/reservation', () => ({ previewRecurringReservation: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));

const mockedPreview = vi.mocked(previewRecurringReservation);

const slot: AvailableSlot = {
	slot_id: 100,
	slot_type: 'REGULAR',
	instructor_name: 'Joe',
	slot_date: '2026-10-06',
	start_time: '19:00',
	end_time: '20:00',
	remaining_capacity: 1
};

function makePass(overrides: Partial<MemberPass> = {}): MemberPass {
	return {
		id: 30,
		pass_name: '정규반',
		pass_category: 'FULL',
		ticket_value: 1,
		instructor_id: 7,
		instructor_name: 'Joe',
		start_date: '2026-10-01',
		end_date: '2026-12-31',
		total_lessons: 12,
		remaining_lessons: 10,
		available_lessons: 10,
		pending_count: 0,
		status: 'ACTIVE',
		...overrides
	};
}

const preview: RecurringPreviewResponse = {
	start_time: '19:00',
	end_time: '20:00',
	available_count: 3,
	items: [
		{ slot_id: 100, slot_date: '2026-10-06', status: 'AVAILABLE' },
		{ slot_id: null, slot_date: '2026-10-13', status: 'NO_SLOT' },
		{ slot_id: 102, slot_date: '2026-10-20', status: 'AVAILABLE' },
		{ slot_id: 103, slot_date: '2026-10-27', status: 'AVAILABLE' }
	]
};

describe('RecurringBookingOptions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedPreview.mockResolvedValue({ status: true, message: '', data: preview });
	});

	it('합주 수업이면 반복 토글을 보여주지 않는다', async () => {
		render(RecurringBookingOptions, {
			slot: { ...slot, slot_type: 'ENSEMBLE' },
			pass: makePass(),
			onselectionchange: vi.fn()
		});
		await expect.element(page.getByText('매주 반복')).not.toBeInTheDocument();
	});

	it('예약 가능 횟수가 1회면 반복 토글을 보여주지 않는다', async () => {
		render(RecurringBookingOptions, {
			slot,
			pass: makePass({ available_lessons: 1 }),
			onselectionchange: vi.fn()
		});
		await expect.element(page.getByText('매주 반복')).not.toBeInTheDocument();
	});

	it('켜면 기본 4회로 미리보기를 요청하고 회차별 상태를 보여준다', async () => {
		const onselectionchange = vi.fn();
		render(RecurringBookingOptions, { slot, pass: makePass(), onselectionchange });

		await page.getByRole('switch', { name: '매주 반복' }).click();

		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();
		expect(mockedPreview).toHaveBeenCalledWith(1, {
			slot_id: 100,
			member_pass_id: 30,
			count: 4
		});
		await expect.element(page.getByText('매주 화 19:00 · Joe 선생님')).toBeInTheDocument();
		await expect.element(page.getByRole('checkbox', { name: /2026.10.13/ })).toBeDisabled();
		expect(onselectionchange).toHaveBeenLastCalledWith([100, 102, 103]);
	});

	it('회차 체크를 해제하면 선택에서 빠진다', async () => {
		const onselectionchange = vi.fn();
		render(RecurringBookingOptions, { slot, pass: makePass(), onselectionchange });
		await page.getByRole('switch', { name: '매주 반복' }).click();
		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();

		await page.getByRole('checkbox', { name: /2026.10.20/ }).click();

		expect(onselectionchange).toHaveBeenLastCalledWith([100, 103]);
	});

	it('횟수는 예약 가능 횟수를 넘길 수 없다', async () => {
		render(RecurringBookingOptions, {
			slot,
			pass: makePass({ available_lessons: 3 }),
			onselectionchange: vi.fn()
		});
		await page.getByRole('switch', { name: '매주 반복' }).click();

		await expect.element(page.getByText('3회', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '횟수 늘리기' })).toBeDisabled();
	});

	it('끄면 선택을 null 로 알린다', async () => {
		const onselectionchange = vi.fn();
		render(RecurringBookingOptions, { slot, pass: makePass(), onselectionchange });
		const toggle = page.getByRole('switch', { name: '매주 반복' });
		await toggle.click();
		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();

		await toggle.click();

		expect(onselectionchange).toHaveBeenLastCalledWith(null);
		await expect.element(page.getByText('수업 없음')).not.toBeInTheDocument();
	});

	it('켜는 즉시 빈 선택을 알려 미리보기 전 단건 예약을 막는다', async () => {
		mockedPreview.mockReturnValue(new Promise(() => {}));
		const onselectionchange = vi.fn();
		render(RecurringBookingOptions, { slot, pass: makePass(), onselectionchange });

		await page.getByRole('switch', { name: '매주 반복' }).click();

		expect(onselectionchange).toHaveBeenLastCalledWith([]);
	});

	it('반복할 수 없는 수강권으로 바뀌면 반복을 끄고 null 을 알린다', async () => {
		const onselectionchange = vi.fn();
		const { rerender } = render(RecurringBookingOptions, {
			slot,
			pass: makePass(),
			onselectionchange
		});
		await page.getByRole('switch', { name: '매주 반복' }).click();
		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();

		await rerender({ slot, pass: makePass({ id: 31, available_lessons: 1 }), onselectionchange });

		await vi.waitFor(() => expect(onselectionchange).toHaveBeenLastCalledWith(null));
	});

	it('횟수를 바꾸면 늦게 도착한 이전 응답은 무시한다', async () => {
		let resolveFirst: (v: unknown) => void = () => {};
		mockedPreview
			.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)) as never)
			.mockResolvedValue({
				status: true,
				message: '',
				data: { ...preview, items: preview.items.slice(0, 3) }
			});
		const onselectionchange = vi.fn();
		render(RecurringBookingOptions, { slot, pass: makePass(), onselectionchange });
		await page.getByRole('switch', { name: '매주 반복' }).click();
		await vi.waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(1));

		await page.getByRole('button', { name: '횟수 줄이기' }).click();
		await vi.waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(2));
		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();
		resolveFirst({ status: true, message: '', data: preview });
		await new Promise((r) => setTimeout(r, 50));

		expect(onselectionchange).toHaveBeenLastCalledWith([100, 102]);
	});

	it('해제했다 다시 체크해도 날짜 순서를 유지한다', async () => {
		const onselectionchange = vi.fn();
		render(RecurringBookingOptions, { slot, pass: makePass(), onselectionchange });
		await page.getByRole('switch', { name: '매주 반복' }).click();
		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();
		const week3 = page.getByRole('checkbox', { name: /2026.10.20/ });

		await week3.click();
		await week3.click();

		expect(onselectionchange).toHaveBeenLastCalledWith([100, 102, 103]);
	});

	it('미리보기 실패 시 안내와 다시 시도 버튼을 보여준다', async () => {
		mockedPreview.mockRejectedValueOnce(new Error('network'));
		render(RecurringBookingOptions, { slot, pass: makePass(), onselectionchange: vi.fn() });
		await page.getByRole('switch', { name: '매주 반복' }).click();

		await expect.element(page.getByText('미리보기를 불러오지 못했습니다')).toBeInTheDocument();
		await page.getByRole('button', { name: '다시 시도' }).click();
		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();
	});

	it('사라질 때 선택 해제(null)를 알린다', async () => {
		const onselectionchange = vi.fn();
		const { unmount } = render(RecurringBookingOptions, {
			slot,
			pass: makePass(),
			onselectionchange
		});
		await page.getByRole('switch', { name: '매주 반복' }).click();
		await expect.element(page.getByText('수업 없음')).toBeInTheDocument();

		unmount();

		expect(onselectionchange).toHaveBeenLastCalledWith(null);
	});
});
