<script lang="ts">
	import {
		getDaysInMonth,
		getFirstDayOfMonth,
		formatMonth,
		getTodayString
	} from '$lib/utils/format';

	interface Props {
		selectedDate: string;
		onselect: (date: string) => void;
		onmonthchange?: (year: number, month: number) => void;
	}

	let { selectedDate, onselect, onmonthchange }: Props = $props();

	const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
	const today = getTodayString();
	const now = new Date();

	let currentYear = $state(now.getFullYear());
	let currentMonth = $state(now.getMonth() + 1);
	let initialized = false;

	let monthLabel = $derived(formatMonth(currentYear, currentMonth));

	interface CalendarCell {
		date: number;
		fullDate: string;
		isCurrentMonth: boolean;
		isToday: boolean;
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
				isToday: fullDate === today
			});
		}

		for (let d = 1; d <= daysInMonth; d++) {
			const fullDate = toDateString(year, month, d);
			cells.push({
				date: d,
				fullDate,
				isCurrentMonth: true,
				isToday: fullDate === today
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
					isToday: fullDate === today
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
		onmonthchange?.(currentYear, currentMonth);
	}

	function goToNextMonth() {
		if (currentMonth === 12) {
			currentYear = currentYear + 1;
			currentMonth = 1;
		} else {
			currentMonth = currentMonth + 1;
		}
		onmonthchange?.(currentYear, currentMonth);
	}

	function goToToday() {
		const now = new Date();
		currentYear = now.getFullYear();
		currentMonth = now.getMonth() + 1;
		onselect(today);
	}

	function handleCellClick(cell: CalendarCell) {
		onselect(cell.fullDate);
	}

	// Sync calendar view with selectedDate (also handles initialization)
	$effect(() => {
		const d = new Date(selectedDate);
		const y = d.getFullYear();
		const m = d.getMonth() + 1;
		if (!initialized || y !== currentYear || m !== currentMonth) {
			currentYear = y;
			currentMonth = m;
			initialized = true;
		}
	});
</script>

<div class="date-calendar">
	<div class="date-calendar__nav">
		<button
			type="button"
			class="date-calendar__nav-btn"
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
		<span class="date-calendar__month">{monthLabel}</span>
		<button
			type="button"
			class="date-calendar__nav-btn"
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
		<button type="button" class="date-calendar__today-btn" onclick={goToToday}>오늘</button>
	</div>

	<div class="date-calendar__grid">
		{#each DAY_NAMES as day, i}
			<div
				class="date-calendar__header"
				class:date-calendar__header--weekend={i === 0 || i === 6}
			>
				{day}
			</div>
		{/each}

		{#each calendarCells as row}
			{#each row as cell}
				{@const isSelected = cell.fullDate === selectedDate}
				<button
					type="button"
					class="date-calendar__cell"
					class:date-calendar__cell--other={!cell.isCurrentMonth}
					class:date-calendar__cell--today={cell.isToday && !isSelected}
					class:date-calendar__cell--selected={isSelected}
					onclick={() => handleCellClick(cell)}
					aria-label="{cell.date}일"
				>
					<span class="date-calendar__date">{cell.date}</span>
				</button>
			{/each}
		{/each}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;
	@use '$lib/styles/mixins' as *;

	.date-calendar {
		@include toss-card;
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

			&:hover {
				background-color: var(--color-bg);
			}
		}

		&__month {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__today-btn {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-primary);
			padding: var(--space-xs) var(--space-sm);
			border: none;
			background: none;
			border-radius: var(--radius-sm);
			cursor: pointer;
			transition: background-color var(--transition-fast);

			&:hover {
				background-color: var(--color-primary-bg);
			}
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
			align-items: center;
			justify-content: center;
			border: none;
			background: none;
			border-radius: var(--radius-sm);
			cursor: pointer;
			padding: var(--space-xs) 2px;
			min-height: 44px;
			transition: background var(--transition-fast);

			&--other {
				.date-calendar__date {
					color: var(--color-text-disabled);
				}
			}

			&--today {
				background: var(--color-primary-bg);

				.date-calendar__date {
					color: var(--color-primary);
					font-weight: var(--font-weight-bold);
				}
			}

			&--selected {
				background: var(--color-primary);

				.date-calendar__date {
					color: var(--color-white);
					font-weight: var(--font-weight-bold);
				}
			}
		}

		&__date {
			font-size: var(--font-size-sm);
			line-height: 1;
		}
	}
</style>
