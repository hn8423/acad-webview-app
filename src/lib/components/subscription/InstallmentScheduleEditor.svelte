<script lang="ts">
	import { formatCurrency } from '$lib/utils/format';

	interface Props {
		// 회차별 납부 예정일. 자동 생성된 뒤 관리자가 개별 수정한다.
		dueDates: string[];
		// 서버가 최종 계산하지만, 오타를 눈으로 잡을 수 있도록 미리 보여준다.
		amounts: number[];
		error?: string;
		disabled?: boolean;
	}

	let { dueDates = $bindable([]), amounts, error = '', disabled = false }: Props = $props();

	function handleDateChange(index: number, value: string) {
		// 불변 갱신 — 배열을 직접 변경하지 않는다
		dueDates = dueDates.map((d, i) => (i === index ? value : d));
	}

	let total = $derived(amounts.reduce((sum, a) => sum + a, 0));
</script>

<div class="schedule">
	<div class="schedule__head">
		<span class="schedule__head-cell schedule__head-cell--seq">회차</span>
		<span class="schedule__head-cell">납부 예정일</span>
		<span class="schedule__head-cell schedule__head-cell--amount">금액</span>
	</div>

	{#each amounts as amount, i (i)}
		<div class="schedule__row">
			<span class="schedule__seq">{i + 1}회</span>
			<input
				class="schedule__date"
				type="date"
				value={dueDates[i] ?? ''}
				{disabled}
				aria-label="{i + 1}회차 납부 예정일"
				onchange={(e) => handleDateChange(i, (e.currentTarget as HTMLInputElement).value)}
			/>
			<span class="schedule__amount" class:schedule__amount--last={i === amounts.length - 1}>
				{formatCurrency(amount)}
			</span>
		</div>
	{/each}

	<div class="schedule__total">
		<span>합계</span>
		<strong>{formatCurrency(total)}</strong>
	</div>

	{#if error}
		<p class="schedule__error">{error}</p>
	{/if}
</div>

<style lang="scss">
	.schedule {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;

		&__head {
			display: grid;
			grid-template-columns: 48px 1fr auto;
			gap: var(--space-sm);
			align-items: center;
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-bottom: 1px solid var(--color-divider);
		}

		&__head-cell {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);

			&--amount {
				text-align: right;
			}
		}

		&__row {
			display: grid;
			grid-template-columns: 48px 1fr auto;
			gap: var(--space-sm);
			align-items: center;
			padding: var(--space-sm) var(--space-md);

			& + & {
				border-top: 1px solid var(--color-divider);
			}
		}

		&__seq {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__date {
			width: 100%;
			min-width: 0;
			padding: 6px 8px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-sm);
			background: var(--color-surface);
			color: var(--color-text);
			font-size: var(--font-size-sm);
			font-family: inherit;

			&:disabled {
				opacity: 0.5;
			}
		}

		&__amount {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			white-space: nowrap;
			text-align: right;

			/* 나머지를 몰아 받는 마지막 회차는 금액이 다르므로 눈에 띄게 */
			&--last {
				color: var(--color-primary);
			}
		}

		&__total {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-top: 1px solid var(--color-divider);
			font-size: var(--font-size-sm);
		}

		&__error {
			margin: 0;
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-top: 1px solid var(--color-divider);
			color: var(--color-danger);
			font-size: var(--font-size-xs);
		}
	}
</style>
