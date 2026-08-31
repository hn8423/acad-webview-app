import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PaymentRegisterSheet from './PaymentRegisterSheet.svelte';

// 시트는 BottomSheet 안에 렌더되며 여러 테스트가 같은 페이지를 공유한다.
// 전역 `page` 로 찾으면 앞선 테스트의 시트가 먼저 잡히므로 render 가 돌려주는
// 스코프된 로케이터를 쓴다.
function renderSheet(overrides: Record<string, unknown> = {}) {
	const onsubmit = vi.fn();
	const onclose = vi.fn();
	const screen = render(PaymentRegisterSheet, {
		isOpen: true,
		installment: {
			installment_id: 50,
			seq: 2,
			installment_count: 4,
			due_date: '2026-03-05',
			amount: 230000,
			paid_amount: 0,
			remaining_amount: 230000,
			member_name: '홍길동',
			pass_name: '취미반',
			...overrides
		},
		onclose,
		onsubmit
	});
	return { screen, onsubmit, onclose };
}

describe('PaymentRegisterSheet', () => {
	it('남은 금액 전액 버튼이 잔액을 다시 채운다', async () => {
		const { screen } = renderSheet({ paid_amount: 100000, remaining_amount: 130000 });

		const input = screen.getByPlaceholder('0');
		await expect.element(input).toHaveValue(130000);
		await input.fill('50000');
		await expect.element(input).toHaveValue(50000);

		await screen.getByRole('button', { name: '남은 금액 전액' }).click();
		await expect.element(input).toHaveValue(130000);
	});

	it('열리면 잔액 전액을 기본 금액으로 채운다', async () => {
		const { screen } = renderSheet();
		await expect.element(screen.getByPlaceholder('0')).toHaveValue(230000);
	});

	it('부분납이면 기납부액과 남은 금액을 함께 보여준다', async () => {
		const { screen } = renderSheet({ paid_amount: 100000, remaining_amount: 130000 });

		await expect.element(screen.getByText('기납부')).toBeInTheDocument();
		await expect.element(screen.getByText('130,000원')).toBeInTheDocument();
	});

	// 230,000 을 2,300,000 으로 친 오타를 즉시 알려준다
	it('남은 금액보다 큰 금액을 입력하면 오류를 보여주고 등록을 막는다', async () => {
		const { screen, onsubmit } = renderSheet();

		const input = screen.getByPlaceholder('0');
		await expect.element(input).toHaveValue(230000);
		await input.fill('2300000');

		await expect.element(screen.getByText(/남은 금액.*보다 클 수 없습니다/)).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: '등록' })).toBeDisabled();
		expect(onsubmit).not.toHaveBeenCalled();
	});

	it('정상 입력이면 금액·결제일·결제수단을 담아 제출한다', async () => {
		const { screen, onsubmit } = renderSheet();

		const input = screen.getByPlaceholder('0');
		await expect.element(input).toHaveValue(230000);
		await input.fill('100000');
		await screen.getByRole('button', { name: '계좌이체' }).click();
		await screen.getByRole('button', { name: '등록' }).click();

		expect(onsubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				paid_amount: 100000,
				payment_method: 'TRANSFER',
				memo: ''
			})
		);
	});

	// 완납해야 회차가 나간다는 정책을 원장이 오해하지 않게 하는 안내.
	it('전액을 입력하면 지급될 수강 회차를 알려준다', async () => {
		const { screen } = renderSheet({ grant_lessons: 6 });

		await expect.element(screen.getByText('완납되어 수강 6회차가 지급됩니다.')).toBeInTheDocument();
	});

	it('부분 납부 금액을 넣으면 회차가 지급되지 않는다고 알린다', async () => {
		const { screen } = renderSheet({ grant_lessons: 6 });

		await screen.getByPlaceholder('0').fill('100000');

		await expect
			.element(screen.getByText('부분 납부는 수강 회차가 지급되지 않습니다. 완납해야 지급됩니다.'))
			.toBeInTheDocument();
	});

	it('회차 지급 없는 분납에는 안내를 띄우지 않는다', async () => {
		const { screen } = renderSheet({ grant_lessons: 0 });

		await screen.getByPlaceholder('0').fill('100000');

		await expect.element(screen.getByText(/수강 회차/)).not.toBeInTheDocument();
	});
});
