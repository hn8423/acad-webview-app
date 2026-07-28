<script lang="ts">
	import { onMount } from 'svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getInstructorSchedule } from '$lib/api/reservation';
	import { getInstructors } from '$lib/api/member';
	import type { Instructor } from '$lib/types/member';
	import type { InstructorScheduleData, ScheduleSlot, SlotStatus } from '$lib/types/reservation';
	import { formatTimeRange, getTodayString, getDayOfWeek } from '$lib/utils/format';
	import { buildInstructorColorMap, getInstructorColorIndex } from '$lib/utils/instructor-colors';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import DateCalendar from '$lib/components/ui/DateCalendar.svelte';

	let selectedDate = $state(getTodayString());
	let selectedInstructorId = $state<number | null>(null);
	let instructors = $state<Instructor[]>([]);
	let scheduleData = $state<InstructorScheduleData | null>(null);
	let loading = $state(true);
	let monthLoading = $state(false);

	const scheduleCache = new Map<string, InstructorScheduleData>();
	let scheduleRequestId = 0;

	function getInstructorId(inst: Instructor): number {
		return inst.instructor_id ?? inst.id ?? inst.member_id;
	}

	async function fetchSchedule(year: number, month: number) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
		const cached = scheduleCache.get(cacheKey);
		if (cached) {
			scheduleData = cached;
			return;
		}

		const requestId = ++scheduleRequestId;
		monthLoading = true;
		try {
			const res = await getInstructorSchedule(academyId, year, month);
			if (requestId !== scheduleRequestId) return;
			if (res.status && res.data) {
				scheduleData = res.data;
				scheduleCache.set(cacheKey, res.data);
			}
		} catch {
			if (requestId === scheduleRequestId) {
				toastStore.error('강사 일정을 불러올 수 없습니다');
			}
		} finally {
			if (requestId === scheduleRequestId) {
				monthLoading = false;
			}
		}
	}

	function handleMonthChange(year: number, month: number) {
		fetchSchedule(year, month);
	}

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) {
			loading = false;
			return;
		}
		const now = new Date();
		try {
			const [instRes] = await Promise.allSettled([
				getInstructors(academyId),
				fetchSchedule(now.getFullYear(), now.getMonth() + 1)
			]);
			if (instRes.status === 'fulfilled' && instRes.value.status) {
				const data = instRes.value.data;
				instructors = Array.isArray(data) ? data : data.instructors;
			}
		} finally {
			loading = false;
		}
	});

	// 색상은 학원 전체 강사 목록 기준으로 고정 (월 이동/필터와 무관하게 동일 강사 = 동일 색)
	let colorMap = $derived.by(() => {
		const ids = instructors.map(getInstructorId);
		const fallbackIds = scheduleData?.instructors.map((i) => i.instructor_id) ?? [];
		return buildInstructorColorMap([...ids, ...fallbackIds]);
	});

	function filterBySelected(slots: ScheduleSlot[]): ScheduleSlot[] {
		if (selectedInstructorId === null) return slots;
		return slots.filter((s) => s.instructor_id === selectedInstructorId);
	}

	let dateDots = $derived.by(() => {
		const dots = new Map<string, number[]>();
		if (!scheduleData) return dots;
		for (const [date, slots] of Object.entries(scheduleData.days)) {
			const filtered = filterBySelected(slots);
			if (filtered.length === 0) continue;
			const indices = [
				...new Set(filtered.map((s) => getInstructorColorIndex(s.instructor_id, colorMap)))
			].sort((a, b) => (a < 0 ? 1 : b < 0 ? -1 : a - b));
			dots.set(date, indices);
		}
		return dots;
	});

	interface InstructorGroup {
		instructorId: number | null;
		instructorName: string;
		colorIndex: number;
		slots: ScheduleSlot[];
	}

	let dayGroups = $derived.by(() => {
		const filtered = filterBySelected(scheduleData?.days[selectedDate] ?? []);
		const groups = new Map<number | null, InstructorGroup>();
		for (const slot of filtered) {
			const key = slot.instructor_id;
			const existing = groups.get(key);
			if (existing) {
				groups.set(key, { ...existing, slots: [...existing.slots, slot] });
			} else {
				groups.set(key, {
					instructorId: key,
					instructorName: slot.instructor_name ?? '미지정',
					colorIndex: getInstructorColorIndex(key, colorMap),
					slots: [slot]
				});
			}
		}
		return [...groups.values()].sort((a, b) => {
			if (a.instructorId === null) return 1;
			if (b.instructorId === null) return -1;
			return a.instructorId - b.instructorId;
		});
	});

	function dotModifier(colorIndex: number): string {
		return colorIndex < 0 ? 'neutral' : `c${colorIndex}`;
	}

	function statusVariant(status: SlotStatus): 'success' | 'warning' | 'neutral' {
		if (status === 'OPEN') return 'success';
		if (status === 'CLOSED') return 'warning';
		return 'neutral';
	}

	function statusLabel(status: SlotStatus): string {
		if (status === 'OPEN') return '예약 가능';
		if (status === 'CLOSED') return '마감';
		return '취소됨';
	}

	function formatCapacity(slot: ScheduleSlot): string {
		if (slot.max_capacity === null) return `${slot.current_count}명`;
		return `${slot.current_count}/${slot.max_capacity}명`;
	}
</script>

<div class="instructor-schedule">
	{#if loading}
		<div class="instructor-schedule__loading"><Spinner /></div>
	{:else}
		<div class="instructor-schedule__chips" role="tablist" aria-label="강사 필터">
			<button
				type="button"
				class="instructor-schedule__chip"
				class:instructor-schedule__chip--active={selectedInstructorId === null}
				onclick={() => (selectedInstructorId = null)}
			>
				전체
			</button>
			{#each instructors as inst (getInstructorId(inst))}
				{@const instId = getInstructorId(inst)}
				<button
					type="button"
					class="instructor-schedule__chip"
					class:instructor-schedule__chip--active={selectedInstructorId === instId}
					onclick={() => (selectedInstructorId = selectedInstructorId === instId ? null : instId)}
				>
					<span
						class="instructor-schedule__chip-dot instructor-schedule__chip-dot--{dotModifier(
							getInstructorColorIndex(instId, colorMap)
						)}"
					></span>
					{inst.user_name}
				</button>
			{/each}
		</div>

		<DateCalendar
			{selectedDate}
			onselect={(date) => (selectedDate = date)}
			onmonthchange={handleMonthChange}
			{dateDots}
		/>

		<section class="instructor-schedule__detail">
			<h2 class="instructor-schedule__detail-title">
				{selectedDate.substring(5, 7)}월 {selectedDate.substring(8, 10)}일 ({getDayOfWeek(
					selectedDate
				)})
			</h2>

			{#if monthLoading}
				<div class="instructor-schedule__detail-loading"><Spinner /></div>
			{:else if dayGroups.length === 0}
				<p class="instructor-schedule__empty">해당 날짜에 수업이 없습니다</p>
			{:else}
				{#each dayGroups as group (group.instructorId ?? -1)}
					<div class="instructor-schedule__group">
						<div class="instructor-schedule__group-header">
							<span
								class="instructor-schedule__chip-dot instructor-schedule__chip-dot--{dotModifier(
									group.colorIndex
								)}"
							></span>
							<span class="instructor-schedule__group-name">{group.instructorName}</span>
							<span class="instructor-schedule__group-count">{group.slots.length}건</span>
						</div>
						<ul class="instructor-schedule__slots">
							{#each group.slots as slot (slot.slot_id)}
								<li class="instructor-schedule__slot">
									<div class="instructor-schedule__slot-info">
										<span class="instructor-schedule__slot-time">
											{formatTimeRange(slot.start_time, slot.end_time)}
										</span>
										<span class="instructor-schedule__slot-meta">
											{slot.slot_type === 'ENSEMBLE' ? '합주' : '레슨'} · {formatCapacity(slot)}
										</span>
									</div>
									<Badge variant={statusVariant(slot.status)}>{statusLabel(slot.status)}</Badge>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			{/if}
		</section>
	{/if}
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;
	@use '$lib/styles/mixins' as *;

	.instructor-schedule {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);

		&__loading {
			@include flex-center;
			min-height: 200px;
		}

		&__chips {
			display: flex;
			gap: var(--space-sm);
			overflow-x: auto;
			padding-bottom: var(--space-2xs);
			-webkit-overflow-scrolling: touch;

			&::-webkit-scrollbar {
				display: none;
			}
		}

		&__chip {
			@include press-scale;
			display: inline-flex;
			align-items: center;
			gap: var(--space-xs);
			flex-shrink: 0;
			padding: var(--space-xs) var(--space-md);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-full);
			background: var(--color-bg-card);
			color: var(--color-text-secondary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
			transition: all var(--transition-fast);

			&--active {
				border-color: var(--color-primary);
				background: var(--color-primary-bg);
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);
			}
		}

		&__chip-dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			flex-shrink: 0;
			background-color: var(--instructor-color-neutral);

			@for $i from 0 through 7 {
				&--c#{$i} {
					background-color: var(--instructor-color-#{$i});
				}
			}
		}

		&__detail {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}

		&__detail-title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-bold);
			padding: var(--space-xs) 0;
		}

		&__detail-loading {
			@include flex-center;
			min-height: 120px;
		}

		&__empty {
			@include flex-center;
			min-height: 120px;
			color: var(--color-text-muted);
			font-size: var(--font-size-sm);
		}

		&__group {
			@include toss-card;
			padding: var(--space-md);
		}

		&__group-header {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-sm);
		}

		&__group-name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
		}

		&__group-count {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__slots {
			display: flex;
			flex-direction: column;
			list-style: none;
			margin: 0;
			padding: 0;
		}

		&__slot {
			@include flex-between;
			padding: var(--space-sm) 0;

			& + & {
				border-top: 1px solid var(--color-divider);
			}
		}

		&__slot-info {
			display: flex;
			flex-direction: column;
			gap: var(--space-2xs);
		}

		&__slot-time {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
		}

		&__slot-meta {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}
	}
</style>
