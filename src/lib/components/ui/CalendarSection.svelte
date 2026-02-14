<script lang="ts">
	import { getCalendarEvents } from '$lib/api/academy';
	import {
		formatMonth,
		formatTime,
		formatTimeRange,
		getDaysInMonth,
		getFirstDayOfMonth,
		getTodayString
	} from '$lib/utils/format';
	import type { CalendarEvent } from '$lib/types/academy';
	import Spinner from './Spinner.svelte';

	interface Props {
		academyId: number;
	}

	let { academyId }: Props = $props();

	const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

	const EVENT_TYPE_COLORS: Record<CalendarEvent['event_type'], string> = {
		LESSON: '#6c5ce7',
		PARTY: '#f59e0b',
		HOLIDAY: '#ef4444',
		PERFORMANCE: '#10b981',
		OTHER: '#6b7280'
	};

	const EVENT_TYPE_LABELS: Record<CalendarEvent['event_type'], string> = {
		LESSON: '수업',
		PARTY: '파티',
		HOLIDAY: '휴일',
		PERFORMANCE: '공연',
		OTHER: '기타'
	};

	const MAX_EVENT_DOTS = 3;
	const today = getTodayString();
	const now = new Date();

	let currentYear = $state(now.getFullYear());
	let currentMonth = $state(now.getMonth() + 1);
	let selectedDate = $state(today);
	let events = $state<CalendarEvent[]>([]);
	let loading = $state(true);
	let errorMessage = $state<string | null>(null);

	let monthLabel = $derived(formatMonth(currentYear, currentMonth));

	let calendarCells = $derived(buildCalendarCells(currentYear, currentMonth, events));

	let selectedEvents = $derived(
		events
			.filter((e) => e.event_date === selectedDate)
			.sort((a, b) => {
				const aAllDay = a.is_all_day === 1;
				const bAllDay = b.is_all_day === 1;
				if (aAllDay && !bAllDay) return -1;
				if (!aAllDay && bAllDay) return 1;
				return (a.start_time ?? '').localeCompare(b.start_time ?? '');
			})
	);

	interface CalendarCell {
		date: number;
		fullDate: string;
		isCurrentMonth: boolean;
		isToday: boolean;
		events: CalendarEvent[];
	}

	function indexEventsByDate(monthEvents: CalendarEvent[]): Map<string, CalendarEvent[]> {
		const map = new Map<string, CalendarEvent[]>();
		for (const event of monthEvents) {
			const existing = map.get(event.event_date);
			if (existing) {
				map.set(event.event_date, [...existing, event]);
			} else {
				map.set(event.event_date, [event]);
			}
		}
		return map;
	}

	function buildCalendarCells(
		year: number,
		month: number,
		monthEvents: CalendarEvent[]
	): CalendarCell[][] {
		const daysInMonth = getDaysInMonth(year, month);
		const firstDay = getFirstDayOfMonth(year, month);
		const eventsByDate = indexEventsByDate(monthEvents);

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
				events: eventsByDate.get(fullDate) ?? []
			});
		}

		for (let d = 1; d <= daysInMonth; d++) {
			const fullDate = toDateString(year, month, d);
			cells.push({
				date: d,
				fullDate,
				isCurrentMonth: true,
				isToday: fullDate === today,
				events: eventsByDate.get(fullDate) ?? []
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
					events: eventsByDate.get(fullDate) ?? []
				});
			}
		}

		const rows: CalendarCell[][] = [];
		for (let i = 0; i < cells.length; i += 7) {
			rows.push(cells.slice(i, i + 7));
		}
		return rows;
	}

	function toDateString(year: number, month: number, day: number): string {
		return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	function getEventColor(event: CalendarEvent): string {
		return event.color || EVENT_TYPE_COLORS[event.event_type] || '#6b7280';
	}

	function goToPreviousMonth() {
		if (currentMonth === 1) {
			currentYear = currentYear - 1;
			currentMonth = 12;
		} else {
			currentMonth = currentMonth - 1;
		}
	}

	function goToNextMonth() {
		if (currentMonth === 12) {
			currentYear = currentYear + 1;
			currentMonth = 1;
		} else {
			currentMonth = currentMonth + 1;
		}
	}

	function selectDate(fullDate: string) {
		selectedDate = fullDate;
	}

	async function fetchEvents(year: number, month: number) {
		loading = true;
		errorMessage = null;
		try {
			const res = await getCalendarEvents(academyId, year, month);
			if (res.status && res.data) {
				events = res.data.events;
			} else {
				events = [];
				errorMessage = '일정을 불러올 수 없습니다.';
			}
		} catch (err) {
			events = [];
			errorMessage = '일정 조회 중 오류가 발생했습니다.';
			console.error('캘린더 일정 조회 실패:', err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchEvents(currentYear, currentMonth);
	});
</script>

<div class="section-card">
	<h2 class="section-title">캘린더 조회</h2>

	{#if loading}
		<div class="calendar-loading">
			<Spinner size="sm" />
		</div>
	{:else if errorMessage}
		<p class="empty-text">{errorMessage}</p>
	{:else}
		<div class="calendar-nav">
			<button type="button" class="nav-btn" onclick={goToPreviousMonth} aria-label="이전 달">
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
			<span class="month-label">{monthLabel}</span>
			<button type="button" class="nav-btn" onclick={goToNextMonth} aria-label="다음 달">
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

		<div class="calendar-grid">
			{#each DAY_NAMES as day, i}
				<div class="calendar-header" class:calendar-header--weekend={i === 0 || i === 6}>
					{day}
				</div>
			{/each}

			{#each calendarCells as row}
				{#each row as cell}
					<button
						type="button"
						class="calendar-cell"
						class:calendar-cell--other={!cell.isCurrentMonth}
						class:calendar-cell--today={cell.isToday}
						class:calendar-cell--selected={cell.fullDate === selectedDate}
						onclick={() => selectDate(cell.fullDate)}
					>
						<span class="calendar-cell__date">{cell.date}</span>
						{#if cell.events.length > 0}
							<div class="event-dots">
								{#each cell.events.slice(0, MAX_EVENT_DOTS) as event}
									<span class="event-dot" style="background-color: {getEventColor(event)}"></span>
								{/each}
							</div>
						{/if}
					</button>
				{/each}
			{/each}
		</div>

		<div class="event-list">
			<h3 class="event-list__title">
				{selectedDate.split('-')[1]}월 {selectedDate.split('-')[2]}일 일정
			</h3>
			{#if selectedEvents.length === 0}
				<p class="empty-text">등록된 일정이 없습니다.</p>
			{:else}
				{#each selectedEvents as event}
					<div class="event-item" style="--event-color: {getEventColor(event)}">
						<div class="event-item__header">
							<span class="event-item__title">{event.event_title}</span>
							<span
								class="event-type-badge"
								style="background-color: {getEventColor(event)}20; color: {getEventColor(event)}"
							>
								{EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
							</span>
						</div>
						<div class="event-item__time">
							{#if event.is_all_day === 1}
								종일
							{:else if event.start_time && event.end_time}
								{formatTimeRange(event.start_time, event.end_time)}
							{:else if event.start_time}
								{formatTime(event.start_time)}
							{/if}
						</div>
						{#if event.description}
							<p class="event-item__desc">{event.description}</p>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.section-card {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-xl) var(--space-lg);
	}

	.section-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		margin-bottom: var(--space-md);
		letter-spacing: var(--letter-spacing-tight);
	}

	.calendar-loading {
		display: flex;
		justify-content: center;
		padding: var(--space-xl);
	}

	.calendar-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		background: none;
		color: var(--color-text-secondary);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);

		&:active {
			background: var(--color-bg);
			opacity: 0.6;
		}
	}

	.month-label {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		letter-spacing: var(--letter-spacing-tight);
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		margin-bottom: var(--space-lg);
	}

	.calendar-header {
		text-align: center;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
		padding: var(--space-sm) 0;

		&--weekend {
			color: var(--color-danger);
		}
	}

	.calendar-cell {
		aspect-ratio: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border: none;
		background: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		position: relative;
		padding: 2px;
		transition: background var(--transition-fast);

		&:active {
			background: var(--color-bg);
		}

		&--other {
			.calendar-cell__date {
				color: var(--color-text-disabled);
			}
		}

		&--today {
			background: var(--color-primary-bg);

			.calendar-cell__date {
				color: var(--color-primary);
				font-weight: var(--font-weight-bold);
			}
		}

		&--selected {
			background: var(--color-primary);

			.calendar-cell__date {
				color: var(--color-white);
				font-weight: var(--font-weight-bold);
			}

			.event-dot {
				background-color: var(--color-white) !important;
			}
		}

		&__date {
			font-size: var(--font-size-sm);
			line-height: 1;
		}
	}

	.event-dots {
		display: flex;
		gap: 2px;
		margin-top: 2px;
	}

	.event-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.event-list {
		border-top: 1px solid var(--color-divider);
		padding-top: var(--space-md);

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-sm);
		}
	}

	.empty-text {
		text-align: center;
		color: var(--color-text-muted);
		padding: var(--space-md) 0;
		font-size: var(--font-size-sm);
	}

	.event-item {
		border-left: 3px solid var(--event-color);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		margin-bottom: var(--space-sm);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-sm);
			margin-bottom: 2px;
		}

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
		}

		&__time {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__desc {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-top: 2px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.event-type-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 10px;
		font-weight: var(--font-weight-semibold);
		white-space: nowrap;
		flex-shrink: 0;
	}
</style>
