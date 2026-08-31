<script lang="ts">
	import { untrack } from 'svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { formatCurrency, formatDate, getTodayString } from '$lib/utils/format';
	import { PAYMENT_METHOD_OPTIONS } from '$lib/utils/subscription';
	import type { CreatePaymentRequest, PaymentMethod } from '$lib/types/subscription';

	interface TargetInstallment {
		installment_id: number;
		seq: number;
		installment_count: number;
		due_date: string;
		amount: number;
		paid_amount: number;
		remaining_amount: number;
		member_name?: string;
		pass_name?: string;
		// 이 회차를 완납하면 지급되는 수강 회차 (0 = 회차 지급 없는 분납)
		grant_lessons?: number;
	}

	interface Props {
		isOpen: boolean;
		installment: TargetInstallment | null;
		submitting?: boolean;
		onclose: () => void;
		onsubmit: (data: CreatePaymentRequest) => void;
	}

	let {
		isOpen = $bindable(false),
		installment,
		submitting = false,
		onclose,
		onsubmit
	}: Props = $props();

	let paidAmount = $state('');
	let paidAt = $state('');
	let method = $state<PaymentMethod>('CASH');
	let memo = $state('');

	// 시트가 '닫힘 -> 열림'으로 바뀌는 순간에만 잔액 전액 · 오늘 날짜를 기본값으로 채운다.
	// 열려 있는 동안 이 이펙트가 다시 돌면 관리자가 입력한 금액이 지워진다.
	let lastOpenedFor = $state<number | null>(null);

	$effect(() => {
		const open = isOpen;
		const target = installment;
		untrack(() => {
			if (!open || !target) {
				if (!open) lastOpenedFor = null;
				return;
			}
			if (lastOpenedFor === target.installment_id) return;
			lastOpenedFor = target.installment_id;
			paidAmount = String(target.remaining_amount);
			paidAt = getTodayString();
			method = 'CASH';
			memo = '';
		});
	});

	let amountNumber = $derived(Number(paidAmount));

	let validationError = $derived.by(() => {
		if (!installment) return '';
		if (!paidAmount) return '';
		if (!Number.isInteger(amountNumber) || amountNumber < 1) return '금액을 정확히 입력해주세요';
		// 서버도 같은 검사를 한다 — 여기서 막는 건 230,000 을 2,300,000 으로 친 오타를 즉시 알려주기 위함
		if (amountNumber > installment.remaining_amount)
			return `남은 금액(${formatCurrency(installment.remaining_amount)})보다 클 수 없습니다`;
		return '';
	});

	let canSubmit = $derived(
		!!installment && !!paidAmount && !!paidAt && !validationError && !submitting
	);

	// 완납해야 회차가 나간다. 부분 납부로는 지급되지 않는다는 걸 입력하는 순간 알려준다 —
	// 원장이 가장 오해하기 쉬운 지점이다.
	let grantLessons = $derived(installment?.grant_lessons ?? 0);
	let willComplete = $derived(!!installment && amountNumber >= installment.remaining_amount);
	let lessonNotice = $derived.by(() => {
		if (grantLessons <= 0 || !paidAmount || validationError) return '';
		return willComplete
			? `완납되어 수강 ${grantLessons}회차가 지급됩니다.`
			: '부분 납부는 수강 회차가 지급되지 않습니다. 완납해야 지급됩니다.';
	});

	function handleSubmit() {
		if (!canSubmit) return;
		onsubmit({
			paid_amount: amountNumber,
			paid_at: paidAt,
			payment_method: method,
			memo: memo.trim()
		});
	}

	function fillRemaining() {
		if (installment) paidAmount = String(installment.remaining_amount);
	}
</script>

<BottomSheet {isOpen} title="결제 등록" {onclose}>
	{#if installment}
		<div class="payment-sheet">
			<div class="payment-sheet__summary">
				{#if installment.member_name}
					<p class="payment-sheet__who">
						{installment.member_name}{#if installment.pass_name}<span class="payment-sheet__dot"
								>·</span
							>{installment.pass_name}{/if}
					</p>
				{/if}
				<p class="payment-sheet__seq">
					{installment.seq}/{installment.installment_count}회차 · 예정일 {formatDate(
						installment.due_date
					)}
				</p>
				<dl class="payment-sheet__amounts">
					<div>
						<dt>예정 금액</dt>
						<dd>{formatCurrency(installment.amount)}</dd>
					</div>
					{#if installment.paid_amount > 0}
						<div>
							<dt>기납부</dt>
							<dd>{formatCurrency(installment.paid_amount)}</dd>
						</div>
					{/if}
					<div class="payment-sheet__amounts-remaining">
						<dt>남은 금액</dt>
						<dd>{formatCurrency(installment.remaining_amount)}</dd>
					</div>
				</dl>
			</div>

			<div class="payment-sheet__field">
				<Input
					type="number"
					label="납부 금액"
					bind:value={paidAmount}
					error={validationError}
					placeholder="0"
				/>
				<div class="payment-sheet__field-actions">
					<button type="button" class="payment-sheet__fill" onclick={fillRemaining}>
						남은 금액 전액
					</button>
				</div>
			</div>

			{#if lessonNotice}
				<p
					class="payment-sheet__lesson-notice"
					class:payment-sheet__lesson-notice--grant={willComplete}
				>
					{lessonNotice}
				</p>
			{/if}

			<Input type="date" label="결제일" bind:value={paidAt} />

			<div class="payment-sheet__methods">
				<span class="payment-sheet__label">결제수단</span>
				<div class="payment-sheet__method-list">
					{#each PAYMENT_METHOD_OPTIONS as option (option.value)}
						<button
							type="button"
							class="payment-sheet__method"
							class:payment-sheet__method--active={method === option.value}
							onclick={() => (method = option.value)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<Input
				label="메모 (선택)"
				bind:value={memo}
				placeholder="관리자만 볼 수 있어요"
				maxlength={500}
			/>

			<div class="payment-sheet__actions">
				<Button variant="secondary" fullWidth onclick={onclose}>취소</Button>
				<Button fullWidth loading={submitting} disabled={!canSubmit} onclick={handleSubmit}>
					등록
				</Button>
			</div>
		</div>
	{/if}
</BottomSheet>

<style lang="scss">
	.payment-sheet {
		&__lesson-notice {
			margin: 0;
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-sm);
			background: var(--color-bg);
			color: var(--color-text-secondary);
			font-size: var(--font-size-xs);
			line-height: 1.5;

			/* 완납이라 회차가 실제로 나가는 경우만 강조한다 */
			&--grant {
				color: var(--color-primary);
			}
		}

		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding-bottom: var(--space-sm);

		&__summary {
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__who {
			margin: 0 0 2px;
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-semibold);
		}

		&__dot {
			margin: 0 6px;
			color: var(--color-text-muted);
		}

		&__seq {
			margin: 0 0 var(--space-sm);
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__amounts {
			margin: 0;
			display: flex;
			flex-direction: column;
			gap: 4px;

			div {
				display: flex;
				align-items: center;
				justify-content: space-between;
			}

			dt,
			dd {
				margin: 0;
				font-size: var(--font-size-sm);
			}

			dt {
				color: var(--color-text-secondary);
			}
		}

		&__amounts-remaining {
			padding-top: 4px;
			border-top: 1px solid var(--color-divider);

			dd {
				font-weight: var(--font-weight-bold);
				color: var(--color-primary);
			}
		}

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__field-actions {
			display: flex;
			justify-content: flex-end;
		}

		&__fill {
			padding: 4px 8px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-sm);
			background: var(--color-surface);
			color: var(--color-primary);
			font-size: var(--font-size-xs);
			font-family: inherit;
			cursor: pointer;
		}

		&__label {
			display: block;
			margin-bottom: var(--space-xs);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__method-list {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: var(--space-xs);
		}

		&__method {
			padding: var(--space-sm) 0;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-sm);
			background: var(--color-surface);
			color: var(--color-text-secondary);
			font-size: var(--font-size-sm);
			font-family: inherit;
			cursor: pointer;

			&--active {
				border-color: var(--color-primary);
				background: var(--color-primary);
				color: #fff;
				font-weight: var(--font-weight-semibold);
			}
		}

		&__actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-sm);
			margin-top: var(--space-xs);
		}
	}
</style>
