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

	// 총 회차가 0인 분납(수납 장부 전용)에는 지급 회차 열이 없어야 한다
	it('총 회차가 0이면 지급 회차 열을 숨긴다', async () => {
		render(InstallmentScheduleEditor, {
			dueDates: [...DUE_DATES],
			amounts: AMOUNTS,
			lessons: [0, 0, 0, 0],
			totalLessons: 0
		});

		await expect.element(page.getByText('지급 회차')).not.toBeInTheDocument();
	});

	it('총 회차가 있으면 회차별 지급 수를 보여준다', async () => {
		render(InstallmentScheduleEditor, {
			dueDates: [...DUE_DATES],
			amounts: AMOUNTS,
			lessons: [6, 6, 6, 6],
			totalLessons: 24
		});

		await expect.element(page.getByText('지급 회차')).toBeInTheDocument();
		await expect.element(page.getByText('24회 / 24회')).toBeInTheDocument();
	});

	it('편집 모드에서 한 회차만 바꿔도 다른 회차는 유지된다', async () => {
		const props = $state({
			dueDates: [...DUE_DATES],
			amounts: AMOUNTS,
			lessons: [6, 6, 6, 6],
			totalLessons: 24,
			editableLessons: true
		});
		render(InstallmentScheduleEditor, props);

		await page.getByLabelText('2회차 지급 수강 회차').fill('4');

		expect(props.lessons).toEqual([6, 4, 6, 6]);
	});

	// 합계가 계약 총 회차와 어긋나면 저장 전에 눈으로 잡아야 한다
	it('지급 회차 합계가 총 회차와 다르면 합계를 그대로 보여준다', async () => {
		render(InstallmentScheduleEditor, {
			dueDates: [...DUE_DATES],
			amounts: AMOUNTS,
			lessons: [6, 6, 6, 4],
			totalLessons: 24
		});

		await expect.element(page.getByText('22회 / 24회')).toBeInTheDocument();
	});

	it('구독 아이템 화면에서는 날짜 열을 숨긴다', async () => {
		render(InstallmentScheduleEditor, {
			dueDates: [],
			amounts: AMOUNTS,
			lessons: [6, 6, 6, 6],
			totalLessons: 24,
			showDueDates: false
		});

		await expect.element(page.getByText('납부 예정일')).not.toBeInTheDocument();
		await expect.element(page.getByText('지급 회차')).toBeInTheDocument();
	});
});
