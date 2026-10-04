<script lang="ts">
	import type { UpcomingSlot } from '$lib/types/reservation';
	import { formatTimeRange, getDayOfWeek } from '$lib/utils/format';
	import { groupSlotsByDate } from '$lib/utils/slot-cleanup';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		slots: UpcomingSlot[];
		selectedIds: number[];
		ontoggle: (slotId: number) => void;
	}

	let { slots, selectedIds, ontoggle }: Props = $props();

	let groups = $derived(groupSlotsByDate(slots));

	function formatDateLabel(date: string): string {
		return `${date.substring(5, 7)}월 ${date.substring(8, 10)}일 (${getDayOfWeek(date)})`;
	}

	function formatMeta(slot: UpcomingSlot): string {
		const type = slot.slot_type === 'ENSEMBLE' ? '합주' : '레슨';
		const capacity =
			slot.max_capacity === null
				? `${slot.current_count}명`
				: `${slot.current_count}/${slot.max_capacity}명`;
		return `${type} · ${capacity}`;
	}
</script>

<div class="upcoming-slots">
	{#each groups as group (group.date)}
		<section class="upcoming-slots__group">
			<h3 class="upcoming-slots__date">{formatDateLabel(group.date)}</h3>
			<ul class="upcoming-slots__list">
				{#each group.slots as slot (slot.slot_id)}
					{@const checked = selectedIds.includes(slot.slot_id)}
					<li class="upcoming-slots__item" class:upcoming-slots__item--checked={checked}>
						<label class="upcoming-slots__label">
							<input
								type="checkbox"
								class="upcoming-slots__checkbox"
								{checked}
								onchange={() => ontoggle(slot.slot_id)}
								aria-label="{formatDateLabel(group.date)} {formatTimeRange(
									slot.start_time,
									slot.end_time
								)} 선택"
							/>
							<span class="upcoming-slots__info">
								<span class="upcoming-slots__time">
									{formatTimeRange(slot.start_time, slot.end_time)}
								</span>
								<span class="upcoming-slots__meta">{formatMeta(slot)}</span>
							</span>
							{#if slot.status !== 'OPEN'}
								<Badge variant="neutral">{slot.status === 'CLOSED' ? '마감' : '취소됨'}</Badge>
							{/if}
						</label>
						{#if slot.reservations.length > 0}
							<div class="upcoming-slots__members">
								{#each slot.reservations as rv (rv.reservation_id)}
									<Badge variant="warning">{rv.member_name} 예약</Badge>
								{/each}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.upcoming-slots {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__group {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}

		&__date {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
		}

		&__list {
			display: flex;
			flex-direction: column;
			margin: 0;
			padding: 0;
			list-style: none;
			background: var(--color-surface);
			border-radius: var(--radius-md);
			overflow: hidden;
		}

		&__item {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			padding: var(--space-sm) var(--space-md);
			border-bottom: 1px solid var(--color-divider);

			&:last-child {
				border-bottom: none;
			}

			&--checked {
				background: var(--color-primary-bg);
			}
		}

		&__label {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			min-height: 44px;
			cursor: pointer;
		}

		&__checkbox {
			flex-shrink: 0;
			width: 20px;
			height: 20px;
			accent-color: var(--color-primary);
		}

		&__info {
			display: flex;
			flex: 1;
			flex-direction: column;
			gap: var(--space-2xs);
			min-width: 0;
		}

		&__time {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__meta {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
		}

		&__members {
			display: flex;
			flex-wrap: wrap;
			gap: var(--space-xs);
			padding-left: 28px;
		}
	}
</style>
