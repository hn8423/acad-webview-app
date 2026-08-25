<script lang="ts">
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatDate } from '$lib/utils/format';
	import {
		sortDrinkTickets,
		getDrinkTicketState,
		getDrinkTicketStateVariant,
		getDrinkTicketStateLabel,
		getDaysUntilExpiry,
		countUsableDrinks,
		countExpiredDrinks
	} from '$lib/utils/drink';
	import type { DrinkTicket } from '$lib/types/member';

	interface Props {
		isOpen: boolean;
		tickets: DrinkTicket[];
		today: string;
		onclose: () => void;
	}

	let { isOpen = $bindable(false), tickets, today, onclose }: Props = $props();

	let sorted = $derived(sortDrinkTickets(tickets, today));
	let usableCount = $derived(countUsableDrinks(tickets, today));
	let expiredCount = $derived(countExpiredDrinks(tickets, today));
</script>

<BottomSheet {isOpen} title="음료권 내역" {onclose}>
	<div class="drink-history">
		<p class="drink-history__summary">
			사용 가능 <strong>{usableCount}잔</strong>
			{#if expiredCount > 0}
				<span class="drink-history__summary-expired">· 만료 {expiredCount}잔</span>
			{/if}
		</p>

		{#if sorted.length === 0}
			<p class="drink-history__empty">등록된 음료권이 없습니다.</p>
		{:else}
			<ul class="drink-history__list">
				{#each sorted as ticket (ticket.id)}
					{@const state = getDrinkTicketState(ticket, today)}
					<li class="ticket-row" class:ticket-row--dimmed={state === 'EXPIRED'}>
						<div class="ticket-row__main">
							<span class="ticket-row__count">
								{ticket.remaining_count}/{ticket.total_count}잔
							</span>
							<span class="ticket-row__expiry">
								유효기간 {formatDate(ticket.expiry_date)}
							</span>
						</div>
						<Badge variant={getDrinkTicketStateVariant(state)}>
							{getDrinkTicketStateLabel(state, getDaysUntilExpiry(ticket.expiry_date, today))}
						</Badge>
					</li>
				{/each}
			</ul>
			{#if expiredCount > 0}
				<p class="drink-history__note">
					유효기간이 지난 음료권은 사용할 수 없습니다. 자세한 내용은 학원에 문의해주세요.
				</p>
			{/if}
		{/if}
	</div>
</BottomSheet>

<style lang="scss">
	.drink-history {
		&__summary {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-md);

			strong {
				color: var(--color-text);
				font-weight: var(--font-weight-bold);
			}
		}

		&__summary-expired {
			color: var(--color-text-muted);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			font-size: var(--font-size-sm);
			padding: var(--space-2xl) 0;
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			list-style: none;
			margin: 0;
			padding: 0;
		}

		&__note {
			margin-top: var(--space-md);
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			line-height: 1.5;
		}
	}

	.ticket-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		background-color: var(--color-bg);

		&--dimmed {
			opacity: 0.6;
		}

		&__main {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}

		&__count {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
			color: var(--color-text);
		}

		&__expiry {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}
	}
</style>
