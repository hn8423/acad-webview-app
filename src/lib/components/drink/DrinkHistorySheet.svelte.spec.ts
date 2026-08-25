import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import DrinkHistorySheet from './DrinkHistorySheet.svelte';
import type { DrinkTicket } from '$lib/types/member';

const TODAY = '2026-08-25';

function makeTicket(id: number, expiry: string, remaining: number, total = 10): DrinkTicket {
	return {
		id,
		academy_id: 1,
		member_id: 32,
		total_count: total,
		remaining_count: remaining,
		expiry_date: `${expiry}T00:00:00.000Z`,
		is_deleted: 0,
		created_at: `${expiry}T00:00:00.000Z`,
		updated_at: `${expiry}T00:00:00.000Z`
	};
}

function renderSheet(tickets: DrinkTicket[]) {
	return render(DrinkHistorySheet, {
		isOpen: true,
		tickets,
		today: TODAY,
		onclose: vi.fn()
	});
}

describe('DrinkHistorySheet', () => {
	it('만료된 음료권은 만료 뱃지로 구분해 보여준다', async () => {
		renderSheet([makeTicket(1, '2026-12-31', 10), makeTicket(2, '2026-06-30', 1, 5)]);

		await expect.element(page.getByText('만료', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('사용가능')).toBeInTheDocument();
	});

	it('사용 가능 잔수에서 만료분을 제외하고 만료분은 따로 표시한다', async () => {
		renderSheet([makeTicket(1, '2026-12-31', 10), makeTicket(2, '2026-06-30', 1, 5)]);

		// 요약줄의 사용 가능 잔수 — 티켓 행의 '10/10잔'과 구분하기 위해 완전 일치로 찾는다
		await expect.element(page.getByText('10잔', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('· 만료 1잔')).toBeInTheDocument();
	});

	it('만료된 음료권이 있으면 사용할 수 없다는 안내를 노출한다', async () => {
		renderSheet([makeTicket(1, '2026-06-30', 3, 5)]);

		await expect
			.element(page.getByText('유효기간이 지난 음료권은 사용할 수 없습니다.', { exact: false }))
			.toBeInTheDocument();
	});

	it('만료된 음료권이 없으면 안내를 노출하지 않는다', async () => {
		renderSheet([makeTicket(1, '2026-12-31', 10)]);

		await expect
			.element(page.getByText('유효기간이 지난 음료권은 사용할 수 없습니다.', { exact: false }))
			.not.toBeInTheDocument();
	});

	it('만료가 임박한 음료권은 D-day 뱃지로 알린다', async () => {
		renderSheet([makeTicket(1, '2026-08-28', 4)]);

		await expect.element(page.getByText('D-3 만료 임박')).toBeInTheDocument();
	});

	it('만료일 당일 음료권은 사용 가능 잔수에 포함한다', async () => {
		renderSheet([makeTicket(1, TODAY, 4)]);

		await expect.element(page.getByText('4잔', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('오늘 만료')).toBeInTheDocument();
	});

	it('음료권이 없으면 빈 상태를 보여준다', async () => {
		renderSheet([]);

		await expect.element(page.getByText('등록된 음료권이 없습니다.')).toBeInTheDocument();
	});
});
