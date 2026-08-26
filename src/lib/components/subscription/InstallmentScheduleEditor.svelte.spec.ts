import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InstallmentScheduleEditor from './InstallmentScheduleEditor.svelte';

const AMOUNTS = [230000, 230000, 230000, 264000];
const DUE_DATES = ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'];

describe('InstallmentScheduleEditor', () => {
	it('회차별 금액과 합계를 보여준다', async () => {
		render(InstallmentScheduleEditor, { dueDates: [...DUE_DATES], amounts: AMOUNTS });

		// 마지막 회차에 나머지가 몰린다
		await expect.element(page.getByText('264,000원')).toBeInTheDocument();
		await expect.element(page.getByText('954,000원')).toBeInTheDocument();
	});

	it('회차 수만큼 날짜 입력을 렌더링한다', async () => {
		render(InstallmentScheduleEditor, { dueDates: [...DUE_DATES], amounts: AMOUNTS });

		for (let i = 1; i <= AMOUNTS.length; i += 1) {
			await expect.element(page.getByLabelText(`${i}회차 납부 예정일`)).toBeInTheDocument();
		}
	});

	// 3회차만 바꿔도 나머지 회차 날짜는 그대로여야 한다 (배열 불변 갱신)
	it('한 회차의 날짜만 바꿔도 다른 회차는 유지된다', async () => {
		const props = $state({ dueDates: [...DUE_DATES], amounts: AMOUNTS });
		render(InstallmentScheduleEditor, props);

		const third = page.getByLabelText('3회차 납부 예정일');
		await third.fill('2026-05-15');

		expect(props.dueDates).toEqual(['2026-03-01', '2026-04-01', '2026-05-15', '2026-06-01']);
	});

	it('검증 오류를 그대로 노출한다', async () => {
		render(InstallmentScheduleEditor, {
			dueDates: [...DUE_DATES],
			amounts: AMOUNTS,
			error: '납부 예정일은 회차 순서대로 점점 뒤여야 합니다'
		});

		await expect
			.element(page.getByText('납부 예정일은 회차 순서대로 점점 뒤여야 합니다'))
			.toBeInTheDocument();
	});
});
