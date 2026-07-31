import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DateCalendar from './DateCalendar.svelte';

function toDateString(year: number, month: number, day: number): string {
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const now = new Date();
const thisYear = now.getFullYear();
const thisMonth = now.getMonth() + 1;
const nextYear = thisMonth === 12 ? thisYear + 1 : thisYear;
const nextMonth = thisMonth === 12 ? 1 : thisMonth + 1;

describe('DateCalendar', () => {
	it('선택 날짜가 다른 달로 바뀌면 onmonthchange를 호출한다', async () => {
		const onselect = vi.fn();
		const onmonthchange = vi.fn();
		const { rerender } = render(DateCalendar, {
			selectedDate: toDateString(thisYear, thisMonth, 10),
			onselect,
			onmonthchange
		});

		await rerender({ selectedDate: toDateString(nextYear, nextMonth, 1) });

		await vi.waitFor(() => {
			expect(onmonthchange).toHaveBeenCalledWith(nextYear, nextMonth);
		});
	});

	it('같은 달 안에서 선택 날짜가 바뀌면 onmonthchange를 호출하지 않는다', async () => {
		const onselect = vi.fn();
		const onmonthchange = vi.fn();
		const { rerender } = render(DateCalendar, {
			selectedDate: toDateString(thisYear, thisMonth, 10),
			onselect,
			onmonthchange
		});

		await rerender({ selectedDate: toDateString(thisYear, thisMonth, 15) });

		expect(onmonthchange).not.toHaveBeenCalled();
	});

	it('날짜 셀 클릭 시 해당 날짜로 onselect를 호출한다', async () => {
		const onselect = vi.fn();
		const { baseElement } = render(DateCalendar, {
			selectedDate: toDateString(thisYear, thisMonth, 10),
			onselect
		});

		const cells = baseElement.querySelectorAll<HTMLButtonElement>(
			'.date-calendar__cell:not(.date-calendar__cell--other)'
		);
		cells[14].click();

		await vi.waitFor(() => {
			expect(onselect).toHaveBeenCalledWith(toDateString(thisYear, thisMonth, 15));
		});
	});

	it('dateIndicators가 있는 날짜 셀에 마커를 표시한다', async () => {
		const targetDate = toDateString(thisYear, thisMonth, 20);
		const { baseElement } = render(DateCalendar, {
			selectedDate: toDateString(thisYear, thisMonth, 10),
			onselect: vi.fn(),
			dateIndicators: new Map([
				[targetDate, { has_confirmed: true, has_pending: true, has_available: false }]
			])
		});

		await vi.waitFor(() => {
			expect(baseElement.querySelectorAll('.date-calendar__indicator--confirmed').length).toBe(1);
			expect(baseElement.querySelectorAll('.date-calendar__indicator--pending').length).toBe(1);
			expect(baseElement.querySelectorAll('.date-calendar__indicator--open').length).toBe(0);
		});
	});
});
