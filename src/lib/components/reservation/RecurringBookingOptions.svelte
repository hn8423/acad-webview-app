<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { previewRecurringReservation } from '$lib/api/reservation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate, getDayOfWeek } from '$lib/utils/format';
	import {
		MIN_RECURRING_COUNT,
		canRepeatSlot,
		getAvailableSlotIds,
		getMaxRecurringCount,
		getRecurringStatusLabel,
		recurringPreviewSchema
	} from '$lib/utils/recurring';
	import type { MemberPass } from '$lib/types/member';
	import type {
		AvailableSlot,
		RecurringPreviewItem,
		RecurringPreviewRequest
	} from '$lib/types/reservation';

	interface Props {
		slot: AvailableSlot;
		pass: MemberPass | null;
		// 반복이 켜져 있으면 예약할 슬롯 id 목록, 꺼져 있으면 null
		onselectionchange: (slotIds: number[] | null) => void;
	}

	let { slot, pass, onselectionchange }: Props = $props();

	const DEFAULT_COUNT = 4;
	const PREVIEW_DEBOUNCE_MS = 250;

	let enabled = $state(false);
	let requestedCount = $state(DEFAULT_COUNT);
	let items = $state<RecurringPreviewItem[]>([]);
	let selectedIds = $state<number[]>([]);
	let loading = $state(false);
	let failed = $state(false);
	let retryToken = $state(0);
	let previewRequestId = 0;

	let repeatable = $derived(canRepeatSlot(slot, pass));
	let passId = $derived(pass?.id ?? null);
	let maxCount = $derived(pass ? getMaxRecurringCount(pass) : 0);
	let count = $derived(Math.max(MIN_RECURRING_COUNT, Math.min(requestedCount, maxCount)));

	function updateSelection(ids: number[]) {
		selectedIds = ids;
		onselectionchange(ids);
	}

	// 입력(수강권·슬롯·횟수)이 바뀐 순간 이전 결과와 진행 중인 요청을 무효화한다.
	// 새 미리보기가 올 때까지 선택은 비어 있으므로, 이전 조건의 slot_ids 가 제출될 수 없다.
	function beginPreview(): number {
		items = [];
		failed = false;
		loading = true;
		updateSelection([]);
		return ++previewRequestId;
	}

	async function loadPreview(requestId: number, request: RecurringPreviewRequest) {
		const academyId = academyStore.academyId;
		if (!academyId || !recurringPreviewSchema.safeParse(request).success) return;
		try {
			const res = await previewRecurringReservation(academyId, request);
			if (requestId !== previewRequestId) return;
			items = res.status ? res.data.items : [];
			updateSelection(res.status ? getAvailableSlotIds(res.data.items) : []);
		} catch {
			// 에러 토스트는 client.ts 가 띄운다. 여기서는 다시 시도할 수 있게만 한다.
			if (requestId === previewRequestId) failed = true;
		} finally {
			if (requestId === previewRequestId) loading = false;
		}
	}

	function disable() {
		enabled = false;
		previewRequestId++;
		items = [];
		selectedIds = [];
		loading = false;
		failed = false;
		onselectionchange(null);
	}

	$effect(() => {
		if (!enabled || !repeatable || passId === null) return;
		void retryToken;
		const request = { slot_id: slot.slot_id, member_pass_id: passId, count };
		const requestId = untrack(beginPreview);
		const timer = setTimeout(() => loadPreview(requestId, request), PREVIEW_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});

	// 반복할 수 없는 수강권으로 바뀌면 토글이 사라지므로, 켜져 있던 선택도 함께 거둔다
	$effect(() => {
		if (!repeatable && untrack(() => enabled)) untrack(disable);
	});

	onDestroy(() => {
		if (enabled) onselectionchange(null);
	});

	function toggleEnabled() {
		if (enabled) disable();
		else enabled = true;
	}

	function changeCount(delta: number) {
		requestedCount = Math.max(MIN_RECURRING_COUNT, Math.min(count + delta, maxCount));
	}

	// 다시 체크해도 날짜 순서를 유지한다 (서버는 이른 회차부터 잔여 횟수를 쓴다)
	function toggleItem(slotId: number) {
		const next = selectedIds.includes(slotId)
			? selectedIds.filter((id) => id !== slotId)
			: [...selectedIds, slotId];
		updateSelection(getAvailableSlotIds(items).filter((id) => next.includes(id)));
	}
</script>

{#if repeatable}
	<div class="recurring">
		<div class="recurring__header">
			<span class="recurring__title" aria-hidden="true">매주 반복</span>
			<button
				type="button"
				role="switch"
				class="recurring__switch"
				class:recurring__switch--on={enabled}
				aria-checked={enabled}
				aria-label="매주 반복"
				onclick={toggleEnabled}
			>
				<span class="recurring__knob"></span>
			</button>
		</div>

		{#if enabled}
			<p class="recurring__summary">
				매주 {getDayOfWeek(slot.slot_date)}
				{slot.start_time} · {slot.instructor_name} 선생님
			</p>

			<div class="recurring__stepper">
				<span class="recurring__stepper-label">반복 횟수</span>
				<div class="recurring__stepper-controls">
					<button
						type="button"
						class="recurring__step"
						aria-label="횟수 줄이기"
						disabled={count <= MIN_RECURRING_COUNT}
						onclick={() => changeCount(-1)}>−</button
					>
					<span class="recurring__count" aria-live="polite">{count}회</span>
					<button
						type="button"
						class="recurring__step"
						aria-label="횟수 늘리기"
						disabled={count >= maxCount}
						onclick={() => changeCount(1)}>+</button
					>
				</div>
			</div>

			{#if loading}
				<div class="recurring__loading"><Spinner /></div>
			{:else if failed}
				<div class="recurring__error">
					<span>미리보기를 불러오지 못했습니다</span>
					<button type="button" class="recurring__retry" onclick={() => retryToken++}>
						다시 시도
					</button>
				</div>
			{:else}
				<ul class="recurring__list">
					{#each items as item, index (`${item.slot_date}-${item.slot_id ?? index}`)}
						{@const available = item.status === 'AVAILABLE' && item.slot_id !== null}
						{@const reasonId = `recurring-reason-${slot.slot_id}-${index}`}
						<li class="recurring__item">
							<label
								class="recurring__item-label"
								class:recurring__item-label--disabled={!available}
							>
								<input
									type="checkbox"
									disabled={!available}
									aria-describedby={reasonId}
									checked={item.slot_id !== null && selectedIds.includes(item.slot_id)}
									onchange={() => item.slot_id !== null && toggleItem(item.slot_id)}
								/>
								<span>{formatDate(item.slot_date)} ({getDayOfWeek(item.slot_date)})</span>
							</label>
							<span id={reasonId}>
								<Badge variant={available ? 'success' : 'neutral'}>
									{getRecurringStatusLabel(item.status)}
								</Badge>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
{/if}

<style lang="scss">
	.recurring {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg);
		border-radius: var(--radius-md);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__switch {
			position: relative;
			width: 44px;
			height: 26px;
			border: none;
			border-radius: var(--radius-full);
			background: var(--color-border);
			transition: background var(--transition-fast);
			cursor: pointer;

			&--on {
				background: var(--color-primary);
			}
		}

		&__knob {
			position: absolute;
			top: 3px;
			left: 3px;
			width: 20px;
			height: 20px;
			border-radius: var(--radius-full);
			background: var(--color-surface);
			box-shadow: var(--shadow-sm);
			transition: transform var(--transition-fast);
		}

		&__switch--on &__knob {
			transform: translateX(18px);
		}

		&__summary {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__stepper {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		&__stepper-label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__stepper-controls {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__step {
			width: 32px;
			height: 32px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-sm);
			background: var(--color-surface);
			font-size: var(--font-size-base);
			color: var(--color-text);
			cursor: pointer;

			&:disabled {
				opacity: 0.4;
				cursor: default;
			}
		}

		&__count {
			min-width: 36px;
			text-align: center;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-sm) 0;
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			list-style: none;
			margin: 0;
			padding: 0;
		}

		&__error {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}

		&__retry {
			border: none;
			background: none;
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			cursor: pointer;
		}

		&__item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: var(--space-xs) 0;
		}

		&__item-label {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			font-size: var(--font-size-sm);
			color: var(--color-text);

			&--disabled {
				color: var(--color-text-muted);
			}
		}
	}
</style>
