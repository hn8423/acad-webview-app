<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/format';
	import {
		getDisplayInstallmentStatus,
		getInstallmentStatusLabel,
		getInstallmentStatusVariant
	} from '$lib/utils/subscription';
	import type { InstallmentListItem } from '$lib/types/subscription';

	interface Props {
		item: InstallmentListItem;
		today: string;
		onclick: (item: InstallmentListItem) => void;
	}

	let { item, today, onclick }: Props = $props();

	let displayStatus = $derived(getDisplayInstallmentStatus(item, today));
</script>

<button type="button" class="installment-card" onclick={() => onclick(item)}>
	<div class="installment-card__head">
		<span class="installment-card__name">{item.member_name}</span>
		<span class="installment-card__pass">{item.plan_name || item.pass_name}</span>
	</div>

	<div class="installment-card__body">
		<span class="installment-card__seq">{item.seq}/{item.installment_count}회차</span>
		<span class="installment-card__due">{formatDate(item.due_date)}</span>
	</div>

	<div class="installment-card__foot">
		<span class="installment-card__amount">
			{formatCurrency(item.remaining_amount)}
			{#if item.paid_amount > 0}
				<span class="installment-card__partial">
					/ {formatCurrency(item.amount)}
				</span>
			{/if}
		</span>
		<span class="installment-card__badges">
			{#if item.days_overdue > 0}
				<span class="installment-card__overdue">D+{item.days_overdue}</span>
			{/if}
			<Badge variant={getInstallmentStatusVariant(displayStatus)}>
				{getInstallmentStatusLabel(displayStatus)}
			</Badge>
		</span>
	</div>
</button>

<style lang="scss">
	.installment-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		padding: var(--space-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		text-align: left;
		font-family: inherit;
		cursor: pointer;
		transition: transform var(--transition-fast);

		&:active {
			transform: scale(0.98);
		}

		&__head {
			display: flex;
			align-items: baseline;
			gap: var(--space-xs);
			min-width: 0;
		}

		&__name {
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
			white-space: nowrap;
		}

		&__pass {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__body {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__due::before {
			content: '·';
			margin-right: var(--space-xs);
		}

		&__foot {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-sm);
		}

		&__amount {
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-bold);
			color: var(--color-text);
		}

		/* 부분납이면 남은 금액 옆에 원래 예정 금액을 함께 보여준다 */
		&__partial {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-regular);
			color: var(--color-text-muted);
		}

		&__badges {
			display: inline-flex;
			align-items: center;
			gap: var(--space-xs);
		}

		&__overdue {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-bold);
			color: var(--color-danger);
		}
	}
</style>
