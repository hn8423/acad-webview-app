<script lang="ts">
	import { getCalendarEvents } from '$lib/api/academy';
	import {
		formatMonth,
		formatTime,
		formatTimeRange,
		getDaysInMonth,
		getFirstDayOfMonth,
		getTodayString,
		toLocalDateString
	} from '$lib/utils/format';
	import type { CalendarEvent } from '$lib/types/academy';
	import type { MyReservation, ReservationStatus } from '$lib/types/reservation';
	import { isReservationDay } from '$lib/utils/reservation';
	import Spinner from './Spinner.svelte';

	interface Props {
		academyId: number;
		reservations?: MyReservation[];
		oncancelreservation?: (reservationId: number) => void;
	}

	let { academyId, reservations = [], oncancelreservation }: Props = $props();

	const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

	const EVENT_TYPE_COLORS: Record<CalendarEvent['event_type'], string> = {
		LESSON: '#8b5cf6',
		PARTY: '#fbbf24',
		HOLIDAY: '#f87171',
		PERFORMANCE: '#34d399',
		OTHER: '#94a3b8',
		RESERVATION: '#a78bfa'
	};

	const EVENT_TYPE_LABELS: Record<CalendarEvent['event_type'], string> = {
		LESSON: '수업',
		PARTY: '파티',
		HOLIDAY: '휴일',
		PERFORMANCE: '공연',
		OTHER: '기타',
		RESERVATION: '내 예약'
	};

	const MAX_EVENT_DOTS = 3;
	const today = getTodayString();
	const now = new Date();
	const VISIBLE_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];

	let currentYear = $state(now.getFullYear());
	let currentMonth = $state(now.getMonth() + 1);
	let selectedDate = $state(today);
	let events = $state<CalendarEvent[]>([]);
	let loading = $state(true);
	let errorMessage = $state<string | null>(null);

	const RESERVATION_STATUS_COLORS: Record<string, string> = {
		PENDING: '#fbbf24',
		CONFIRMED: '#34d399',
		COMPLETED: '#60a5fa'
	};

	function reservationToCalendarEvent(r: MyReservation): CalendarEvent {
		return {
			id: r.reservation_id,
			event_title: r.instructor_name ? `${r.instructor_name} 수업` : '레슨 예약',
			event_type: 'RESERVATION',
			event_date: toLocalDateString(r.slot_date),
			start_time: r.start_time,
			end_time: r.end_time,
			description: '',
			color: RESERVATION_STATUS_COLORS[r.status] ?? '#a78bfa',
			is_all_day: false
		};
	}

	function getReservationLabel(reservation: MyReservation): string {
		if (reservation.slot_type === 'ENSEMBLE') return '합주 수업';
		return reservation.instructor_name
			? `${reservation.instructor_name} 선생님`
			: '강사 미지정';
	}

	function getStatusLabel(status: ReservationStatus): string {
		switch (status) {
			case 'PENDING':
				return '대기중';
			case 'CONFIRMED':
				return '확정';
			case 'COMPLETED':
				return '완료';
			default:
				return status;
		}
	}

	let visibleReservations = $derived(
		reservations.filter((r) => VISIBLE_STATUSES.includes(r.status))
	);

	let reservationCountMap = $derived(
		visibleReservations.reduce<Record<string, number>>((map, r) => {
			const date = toLocalDateString(r.slot_date);
			return { ...map, [date]: (map[date] ?? 0) + 1 };
		}, {})
	);

	let reservationEvents = $derived(visibleReservations.map(reservationToCalendarEvent));

	let allEvents = $derived([...events, ...reservationEvents]);

	let monthLabel = $derived(formatMonth(currentYear, currentMonth));

	let calendarCells = $derived(buildCalendarCells(currentYear, currentMonth, allEvents));

	let selectedReservations = $derived(
		visibleReservations
			.filter((r) => toLocalDateString(r.slot_date) === selectedDate)
			.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
	);

	let selectedOtherEvents = $derived(
		events
			.filter((e) => e.event_date === selectedDate)
			.sort((a, b) => {
				if (a.is_all_day && !b.is_all_day) return -1;
				if (!a.is_all_day && b.is_all_day) return 1;
				return (a.start_time ?? '').localeCompare(b.start_time ?? '');
			})
	);

	let hasSelectedContent = $derived(
		selectedReservations.length > 0 || selectedOtherEvents.length > 0
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
		return event.color || EVENT_TYPE_COLORS[event.event_type] || '#94a3b8';
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
				events = res.data.map((event) => ({
					...event,
					event_date: toLocalDateString(event.event_date)
				}));
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
	<h2 class="section-title">캘린더</h2>

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
					{#if (reservationCountMap[cell.fullDate] ?? 0) > 0}
						<span
							class="calendar-cell__count"
							class:calendar-cell__count--selected={cell.fullDate === selectedDate}
						>
							{reservationCountMap[cell.fullDate]}건
						</span>
					{/if}
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
		{#if loading}
			<div class="calendar-loading">
				<Spinner size="sm" />
			</div>
		{:else if errorMessage}
			<p class="empty-text">{errorMessage}</p>
		{:else if !hasSelectedContent}
			<p class="empty-text">등록된 일정이 없습니다.</p>
		{:else}
			{#if selectedReservations.length > 0}
				<div class="reservation-cards">
					{#each selectedReservations as reservation}
						{@const canCancel = reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'}
					{@const isSameDay = canCancel && isReservationDay(reservation.slot_date)}
						<div class="reservation-card">
							<div class="reservation-card__header">
								<span
									class="reservation-card__badge"
									class:reservation-card__badge--pending={reservation.status === 'PENDING'}
									class:reservation-card__badge--confirmed={reservation.status === 'CONFIRMED'}
									class:reservation-card__badge--completed={reservation.status === 'COMPLETED'}
								>
									{getStatusLabel(reservation.status)}
								</span>
								{#if oncancelreservation && canCancel}
									<button
										type="button"
										class="reservation-card__cancel"
										onclick={() => oncancelreservation(reservation.reservation_id)}
									>
										{isSameDay ? '노쇼' : '취소'}
									</button>
								{/if}
							</div>
							<div class="reservation-card__time">
								{formatTimeRange(reservation.start_time, reservation.end_time)}
							</div>
							<div class="reservation-card__instructor">
								{getReservationLabel(reservation)}
							</div>
							{#if reservation.pass_name}
								<div class="reservation-card__pass">
									{reservation.pass_name}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if selectedOtherEvents.length > 0}
				<div class="other-events">
					{#each selectedOtherEvents as event}
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
								{#if event.is_all_day}
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
				</div>
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/mixins' as *;

	.section-card {
		@include toss-card;
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
		@include press-scale;
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
		min-height: 44px;
		transition: background var(--transition-fast);

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
				color: var(--color-on-primary);
				font-weight: var(--font-weight-bold);
			}

			.calendar-cell__count {
				color: var(--color-on-primary);
			}

			.event-dot {
				background-color: var(--color-on-primary) !important;
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
			margin-top: 1px;
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

	.reservation-cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.reservation-card {
		background: var(--color-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__badge {
			display: inline-flex;
			align-items: center;
			padding: 2px 10px;
			border-radius: var(--radius-full);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);

			&--confirmed {
				background: var(--color-success-bg);
				color: var(--color-success);
			}

			&--pending {
				background: var(--color-warning-bg);
				color: var(--color-warning);
			}

			&--completed {
				background: var(--color-info-bg);
				color: var(--color-info);
			}
		}

		&__cancel {
			background: none;
			border: none;
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			cursor: pointer;
			padding: 2px var(--space-xs);
			font-weight: var(--font-weight-medium);
			transition: opacity var(--transition-fast);

			&:active {
				opacity: 0.6;
			}
		}

		&__time {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: 2px;
		}

		&__instructor {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
		}

		&__pass {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-top: 2px;
		}
	}

	.other-events {
		display: flex;
		flex-direction: column;
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
