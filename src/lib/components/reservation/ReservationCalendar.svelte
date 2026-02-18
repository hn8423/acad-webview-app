<script lang="ts">
	import {
		getDaysInMonth,
		getFirstDayOfMonth,
		formatMonth,
		getTodayString
	} from '$lib/utils/format';

	interface Props {
		selectedDate: string;
		slotCountMap: Record<string, number>;
		countsLoading?: boolean;
		onselect: (date: string) => void;
		onmonthchange: (year: number, month: number) => void;
	}

	let {
		selectedDate,
		slotCountMap,
		countsLoading = false,
		onselect,
		onmonthchange
	}: Props = $props();

	const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
	const today = getTodayString();
	const now = new Date();

	let currentYear = $state(now.getFullYear());
	let currentMonth = $state(now.getMonth() + 1);

	let monthLabel = $derived(formatMonth(currentYear, currentMonth));

	interface CalendarCell {
		date: number;
		fullDate: string;
		isCurrentMonth: boolean;
		isToday: boolean;
		isPast: boolean;
	}

	let calendarCells = $derived(buildCalendarCells(currentYear, currentMonth));

	function toDateString(year: number, month: number, day: number): string {
		return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	function buildCalendarCells(year: number, month: number): CalendarCell[][] {
		const daysInMonth = getDaysInMonth(year, month);
		const firstDay = getFirstDayOfMonth(year, month);

		const prevMonth = month === 1 ? 12 : month - 1;
		const prevYear = month === 1 ? year - 1 : year;
		const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

		const cells: CalendarCell[] = [];

		for (let i = firstDay - 1; i >= 0; i--) {
			const d = daysInPrevMonth - i;
			const fullDate = toDateString(prevYear, prevMonth, d);
			cells.push({
				date: d,
				fullDate,
				isCurrentMonth: false,
				isToday: fullDate === today,
				isPast: fullDate < today
			});
		}

		for (let d = 1; d <= daysInMonth; d++) {
			const fullDate = toDateString(year, month, d);
			cells.push({
				date: d,
				fullDate,
				isCurrentMonth: true,
				isToday: fullDate === today,
				isPast: fullDate < today
			});
		}

		const remaining = 7 - (cells.length % 7);
		if (remaining < 7) {
			const nextMonth = month === 12 ? 1 : month + 1;
			const nextYear = month === 12 ? year + 1 : year;
			for (let d = 1; d <= remaining; d++) {
				const fullDate = toDateString(nextYear, nextMonth, d);
				cells.push({
					date: d,
					fullDate,
					isCurrentMonth: false,
					isToday: fullDate === today,
					isPast: fullDate < today
				});
			}
		}

		const rows: CalendarCell[][] = [];
		for (let i = 0; i < cells.length; i += 7) {
			rows.push(cells.slice(i, i + 7));
		}
		return rows;
	}

	function goToPreviousMonth() {
		if (currentMonth === 1) {
			currentYear = currentYear - 1;
			currentMonth = 12;
		} else {
			currentMonth = currentMonth - 1;
		}
		onmonthchange(currentYear, currentMonth);
	}

	function goToNextMonth() {
		if (currentMonth === 12) {
			currentYear = currentYear + 1;
			currentMonth = 1;
		} else {
			currentMonth = currentMonth + 1;
		}
		onmonthchange(currentYear, currentMonth);
	}

	function handleCellClick(cell: CalendarCell) {
		if (cell.isPast) return;
		onselect(cell.fullDate);
	}
</script>

<div class="reservation-calendar">
	<div class="reservation-calendar__nav">
		<button
			type="button"
			class="reservation-calendar__nav-btn"
			onclick={goToPreviousMonth}
			aria-label="이전 달"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="15 18 9 12 15 6" />
			</svg>
		</button>
		<span class="reservation-calendar__month">{monthLabel}</span>
		<button
			type="button"
			class="reservation-calendar__nav-btn"
			onclick={goToNextMonth}
			aria-label="다음 달"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="9 18 15 12 9 6" />
			</svg>
		</button>
	</div>

	<div class="reservation-calendar__grid">
		{#each DAY_NAMES as day, i}
			<div
				class="reservation-calendar__header"
				class:reservation-calendar__header--weekend={i === 0 || i === 6}
			>
				{day}
			</div>
		{/each}

		{#each calendarCells as row}
			{#each row as cell}
				{@const count = slotCountMap[cell.fullDate] ?? 0}
				{@const isSelected = cell.fullDate === selectedDate}
				<button
					type="button"
					class="reservation-calendar__cell"
					class:reservation-calendar__cell--other={!cell.isCurrentMonth}
					class:reservation-calendar__cell--today={cell.isToday}
					class:reservation-calendar__cell--selected={isSelected}
					class:reservation-calendar__cell--past={cell.isPast}
					disabled={cell.isPast}
					onclick={() => handleCellClick(cell)}
					aria-label="{cell.date}일{count > 0 ? `, ${count}개 예약 가능` : ''}"
				>
					<span class="reservation-calendar__date">{cell.date}</span>
					{#if count > 0 && !cell.isPast}
						<span
							class="reservation-calendar__count"
							class:reservation-calendar__count--selected={isSelected}
						>
							{count}건
						</span>
					{/if}
				</button>
			{/each}
		{/each}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;
	@use '$lib/styles/mixins' as *;

	.reservation-calendar {
		background: var(--color-white);
		padding: var(--space-md) var(--space-md) var(--space-sm);

		&__nav {
			@include flex-between;
			margin-bottom: var(--space-md);
		}

		&__nav-btn {
			@include flex-center;
			@include press-scale;
			width: 36px;
			height: 36px;
			border: none;
			background: none;
			color: var(--color-text-secondary);
			border-radius: var(--radius-sm);
			cursor: pointer;
			transition: all var(--transition-fast);
		}

		&__month {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__grid {
			display: grid;
			grid-template-columns: repeat(7, 1fr);
			gap: 2px;
		}

		&__header {
			text-align: center;
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-muted);
			padding: var(--space-sm) 0;

			&--weekend {
				color: var(--color-danger);
			}
		}

		&__cell {
			@include press-scale;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			border: none;
			background: none;
			border-radius: var(--radius-sm);
			cursor: pointer;
			position: relative;
			padding: var(--space-xs) 2px;
			min-height: 48px;
			transition: background var(--transition-fast);

			&--other {
				.reservation-calendar__date {
					color: var(--color-text-disabled);
				}
			}

			&--today {
				background: var(--color-primary-bg);

				.reservation-calendar__date {
					color: var(--color-primary);
					font-weight: var(--font-weight-bold);
				}
			}

			&--selected {
				background: var(--color-primary);

				.reservation-calendar__date {
					color: var(--color-on-primary);
					font-weight: var(--font-weight-bold);
				}
			}

			&--past {
				cursor: default;
				opacity: 0.35;
				transform: none !important;
			}
		}

		&__date {
			font-size: var(--font-size-sm);
			line-height: 1;
			color: var(--color-text);
		}

		&__count {
			font-size: 10px;
			font-weight: var(--font-weight-semibold);
			color: var(--color-primary);
			margin-top: 2px;
			line-height: 1;

			&--selected {
				color: var(--color-on-primary);
			}
		}
	}
</style>
