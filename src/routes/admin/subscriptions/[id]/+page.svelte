<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getSubscriptionDetail,
		createInstallmentPayment,
		deleteInstallmentPayment,
		updateInstallmentDueDate,
		cancelSubscription
	} from '$lib/api/subscription';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import PaymentRegisterSheet from '$lib/components/subscription/PaymentRegisterSheet.svelte';
	import { formatCurrency, formatDate, getTodayString } from '$lib/utils/format';
	import {
		getDisplayInstallmentStatus,
		getInstallmentStatusLabel,
		getInstallmentStatusVariant,
		getPaymentMethodLabel,
		getSubscriptionStatusLabel,
		getSubscriptionStatusVariant
	} from '$lib/utils/subscription';
	import type {
		CreatePaymentRequest,
		Installment,
		InstallmentPayment,
		MemberSubscription
	} from '$lib/types/subscription';

	const subscriptionId = $derived(Number(page.params.id));
	const today = getTodayString();

	let subscription = $state<MemberSubscription | null>(null);
	let loading = $state(true);
	let submitting = $state(false);

	let showPaymentSheet = $state(false);
	let paymentTarget = $state<Installment | null>(null);

	let showDeletePaymentModal = $state(false);
	let deletePaymentTarget = $state<InstallmentPayment | null>(null);
	// 삭제하려는 결제가 속한 회차. 회수될 수강 회차를 경고에 쓴다.
	let deletePaymentInstallment = $state<Installment | null>(null);

	let showDueDateModal = $state(false);
	let dueDateTarget = $state<Installment | null>(null);
	let newDueDate = $state('');

	let showCancelModal = $state(false);

	onMount(() => fetchDetail());

	async function fetchDetail() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getSubscriptionDetail(academyId, subscriptionId);
			if (res.status) subscription = res.data;
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	let progressPercent = $derived(
		subscription && subscription.total_amount > 0
			? Math.min(100, (subscription.paid_total / subscription.total_amount) * 100)
			: 0
	);

	let isCancelled = $derived(subscription?.status === 'CANCELLED');

	function buildSheetTarget(installment: Installment) {
		if (!subscription) return null;
		return {
			installment_id: installment.installment_id,
			seq: installment.seq,
			installment_count: subscription.installment_count,
			due_date: installment.due_date,
			amount: installment.amount,
			paid_amount: installment.paid_amount,
			remaining_amount: installment.remaining_amount,
			member_name: subscription.member_name,
			pass_name: subscription.pass_name,
			grant_lessons: installment.grant_lessons
		};
	}

	function openPaymentSheet(installment: Installment) {
		paymentTarget = installment;
		showPaymentSheet = true;
	}

	async function handlePaymentSubmit(data: CreatePaymentRequest) {
		if (submitting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !paymentTarget) return;

		submitting = true;
		try {
			const res = await createInstallmentPayment(academyId, paymentTarget.installment_id, data);
			if (res.status) {
				toastStore.success(res.message || '결제가 등록되었습니다.');
				showPaymentSheet = false;
				paymentTarget = null;
				await fetchDetail();
			} else {
				toastStore.error(res.message || '결제 등록에 실패했습니다.');
			}
		} catch {
			// handled by client.ts
		} finally {
			submitting = false;
		}
	}

	function confirmDeletePayment(payment: InstallmentPayment, installment: Installment) {
		deletePaymentTarget = payment;
		deletePaymentInstallment = installment;
		showDeletePaymentModal = true;
	}

	// 이 결제를 지우면 회차가 완납에서 풀려 지급했던 수강 회차가 회수된다.
	// 이미 쓴 회차는 되돌릴 수 없으므로 삭제 전에 반드시 알린다.
	let revokeWarning = $derived.by(() => {
		const target = deletePaymentInstallment;
		if (!target || !target.lessons_granted || target.grant_lessons <= 0) return '';
		return `지급된 수강 ${target.grant_lessons}회차가 회수됩니다. 학생이 이미 사용한 회차는 회수되지 않습니다.`;
	});

	async function handleDeletePayment() {
		if (submitting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !deletePaymentTarget) return;

		submitting = true;
		try {
			const res = await deleteInstallmentPayment(academyId, deletePaymentTarget.payment_id);
			if (res.status) {
				toastStore.success(res.message || '결제 내역이 삭제되었습니다.');
				showDeletePaymentModal = false;
				deletePaymentTarget = null;
				await fetchDetail();
			} else {
				toastStore.error(res.message || '삭제에 실패했습니다.');
			}
		} catch {
			// handled by client.ts
		} finally {
			submitting = false;
		}
	}

	function openDueDateModal(installment: Installment) {
		dueDateTarget = installment;
		newDueDate = installment.due_date.slice(0, 10);
		showDueDateModal = true;
	}

	async function handleDueDateSubmit() {
		if (submitting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !dueDateTarget || !newDueDate) return;

		submitting = true;
		try {
			const res = await updateInstallmentDueDate(
				academyId,
				dueDateTarget.installment_id,
				newDueDate
			);
			if (res.status) {
				toastStore.success(res.message || '납부 예정일이 변경되었습니다.');
				showDueDateModal = false;
				dueDateTarget = null;
				await fetchDetail();
			} else {
				toastStore.error(res.message || '변경에 실패했습니다.');
			}
		} catch {
			// handled by client.ts
		} finally {
			submitting = false;
		}
	}

	async function handleCancelSubscription() {
		if (submitting) return;
		const academyId = academyStore.academyId;
		if (!academyId) return;

		submitting = true;
		try {
			const res = await cancelSubscription(academyId, subscriptionId);
			if (res.status) {
				toastStore.success(res.message || '분납이 중단되었습니다.');
				showCancelModal = false;
				await fetchDetail();
			} else {
				toastStore.error(res.message || '중단에 실패했습니다.');
			}
		} catch {
			// handled by client.ts
		} finally {
			submitting = false;
		}
	}
</script>

<div class="detail-page">
	<BackHeader title="분납 상세" onback={() => goto('/admin/subscriptions')} />

	{#if loading}
		<div class="detail-page__loading"><Spinner /></div>
	{:else if !subscription}
		<p class="detail-page__empty">분납 내역을 찾을 수 없습니다.</p>
	{:else}
		<div class="detail-page__content">
			<section class="overview">
				<div class="overview__head">
					<div>
						<p class="overview__name">{subscription.member_name}</p>
						<p class="overview__plan">
							{subscription.plan_name || subscription.pass_name}
							· {subscription.installment_count}회 분납
						</p>
					</div>
					<Badge variant={getSubscriptionStatusVariant(subscription.status)}>
						{getSubscriptionStatusLabel(subscription.status)}
					</Badge>
				</div>

				<div class="overview__progress">
					<div class="overview__bar">
						<div class="overview__bar-fill" style="width: {progressPercent}%"></div>
					</div>
					<div class="overview__amounts">
						<span>{formatCurrency(subscription.paid_total)} 납부</span>
						<span class="overview__remaining">
							{formatCurrency(subscription.remaining_total)} 남음
						</span>
					</div>
					{#if subscription.total_lessons > 0}
						<p class="overview__lessons">
							수강 회차 {subscription.granted_lessons_total}/{subscription.total_lessons}회 지급
						</p>
					{/if}
				</div>
			</section>

			<section class="installments">
				<h2 class="installments__title">회차별 내역</h2>

				{#each subscription.installments as installment (installment.installment_id)}
					{@const displayStatus = getDisplayInstallmentStatus(installment, today)}
					<article class="installment">
						<div class="installment__head">
							<span class="installment__seq">
								{installment.seq}/{subscription.installment_count}회차
							</span>
							<Badge variant={getInstallmentStatusVariant(displayStatus)}>
								{getInstallmentStatusLabel(displayStatus)}
							</Badge>
						</div>

						<div class="installment__row">
							<span class="installment__due">{formatDate(installment.due_date)}</span>
							<span class="installment__amount">
								{formatCurrency(installment.paid_amount)} / {formatCurrency(installment.amount)}
							</span>
						</div>

						{#if installment.grant_lessons > 0}
							<p
								class="installment__lessons"
								class:installment__lessons--granted={installment.lessons_granted}
							>
								{#if installment.lessons_granted}
									수강 {installment.grant_lessons}회차 지급 완료
								{:else}
									납부하면 수강 {installment.grant_lessons}회차 지급
								{/if}
							</p>
						{/if}

						{#if installment.payments && installment.payments.length > 0}
							<ul class="payments">
								{#each installment.payments as payment (payment.payment_id)}
									<li class="payments__item">
										<div class="payments__info">
											<span class="payments__amount">{formatCurrency(payment.paid_amount)}</span>
											<span class="payments__meta">
												{formatDate(payment.paid_at)} · {getPaymentMethodLabel(
													payment.payment_method
												)}
											</span>
											{#if payment.memo}
												<span class="payments__memo">{payment.memo}</span>
											{/if}
										</div>
										<button
											type="button"
											class="payments__delete"
											onclick={() => confirmDeletePayment(payment, installment)}
										>
											삭제
										</button>
									</li>
								{/each}
							</ul>
						{/if}

						{#if !isCancelled}
							<div class="installment__actions">
								{#if installment.status === 'UNPAID'}
									<Button size="sm" variant="ghost" onclick={() => openDueDateModal(installment)}>
										예정일 변경
									</Button>
								{/if}
								{#if installment.remaining_amount > 0}
									<Button size="sm" onclick={() => openPaymentSheet(installment)}>결제 등록</Button>
								{/if}
							</div>
						{/if}
					</article>
				{/each}
			</section>

			{#if !isCancelled}
				<Button variant="danger" fullWidth onclick={() => (showCancelModal = true)}>
					분납 중단
				</Button>
			{/if}
		</div>
	{/if}
</div>

<PaymentRegisterSheet
	bind:isOpen={showPaymentSheet}
	installment={paymentTarget ? buildSheetTarget(paymentTarget) : null}
	{submitting}
	onclose={() => (showPaymentSheet = false)}
	onsubmit={handlePaymentSubmit}
/>

<Modal
	isOpen={showDeletePaymentModal}
	title="결제 내역 삭제"
	onclose={() => (showDeletePaymentModal = false)}
>
	<div class="confirm">
		<p class="confirm__text">
			{deletePaymentTarget ? formatCurrency(deletePaymentTarget.paid_amount) : ''} 결제 기록을 삭제할까요?
		</p>
		<p class="confirm__note">삭제하면 해당 회차가 다시 미납 목록에 나타납니다.</p>
		{#if revokeWarning}
			<p class="confirm__warn">{revokeWarning}</p>
		{/if}
		<div class="confirm__actions">
			<Button variant="secondary" fullWidth onclick={() => (showDeletePaymentModal = false)}>
				취소
			</Button>
			<Button variant="danger" fullWidth loading={submitting} onclick={handleDeletePayment}>
				삭제
			</Button>
		</div>
	</div>
</Modal>

<Modal
	isOpen={showDueDateModal}
	title="납부 예정일 변경"
	onclose={() => (showDueDateModal = false)}
>
	<div class="confirm">
		<Input type="date" label="납부 예정일" bind:value={newDueDate} />
		<p class="confirm__note">이미 납부가 시작된 회차는 변경할 수 없습니다.</p>
		<div class="confirm__actions">
			<Button variant="secondary" fullWidth onclick={() => (showDueDateModal = false)}>취소</Button>
			<Button fullWidth loading={submitting} disabled={!newDueDate} onclick={handleDueDateSubmit}>
				변경
			</Button>
		</div>
	</div>
</Modal>

<Modal isOpen={showCancelModal} title="분납 중단" onclose={() => (showCancelModal = false)}>
	<div class="confirm">
		<p class="confirm__text">이 분납을 중단할까요?</p>
		<p class="confirm__note">
			아직 한 푼도 안 들어온 회차만 제거됩니다. 이미 받은 결제 내역과 부분 납부된 회차는 그대로
			남습니다. 중단은 되돌릴 수 없습니다.
		</p>
		<div class="confirm__actions">
			<Button variant="secondary" fullWidth onclick={() => (showCancelModal = false)}>취소</Button>
			<Button variant="danger" fullWidth loading={submitting} onclick={handleCancelSubscription}>
				중단
			</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.detail-page {
		min-height: 100dvh;
		background: var(--color-bg);

		&__content {
			display: flex;
			flex-direction: column;
			gap: var(--space-lg);
			padding: var(--space-md);
		}

		&__loading {
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 200px;
		}

		&__empty {
			padding: var(--space-3xl) 0;
			text-align: center;
			color: var(--color-text-muted);
			font-size: var(--font-size-sm);
		}
	}

	.overview {
		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);

		&__head {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: var(--space-sm);
		}

		&__name {
			margin: 0;
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
		}

		&__plan {
			margin: 2px 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__progress {
			margin-top: var(--space-md);
		}

		&__bar {
			height: 6px;
			border-radius: var(--radius-full);
			background: var(--color-bg);
			overflow: hidden;
		}

		&__bar-fill {
			height: 100%;
			background: var(--color-primary);
			transition: width var(--transition-base);
		}

		&__amounts {
			display: flex;
			justify-content: space-between;
			margin-top: var(--space-xs);
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__remaining {
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__lessons {
			margin: var(--space-xs) 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-primary);
		}
	}

	.installments {
		&__title {
			margin: 0 0 var(--space-sm);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
		}
	}

	.installment {
		&__lessons {
			margin: var(--space-xs) 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);

			/* 실제로 지급된 회차만 강조한다 */
			&--granted {
				color: var(--color-primary);
			}
		}

		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);

		& + & {
			margin-top: var(--space-sm);
		}

		&__head {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		&__seq {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
		}

		&__row {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			margin-top: var(--space-xs);
			font-size: var(--font-size-sm);
		}

		&__due {
			color: var(--color-text-secondary);
			font-size: var(--font-size-xs);
		}

		&__amount {
			font-weight: var(--font-weight-semibold);
		}

		&__actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-xs);
			margin-top: var(--space-sm);
		}
	}

	.payments {
		margin: var(--space-sm) 0 0;
		padding: var(--space-sm);
		list-style: none;
		background: var(--color-bg);
		border-radius: var(--radius-sm);

		&__item {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: var(--space-sm);

			& + & {
				margin-top: var(--space-sm);
				padding-top: var(--space-sm);
				border-top: 1px solid var(--color-divider);
			}
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}

		&__amount {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
		}

		&__meta,
		&__memo {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			word-break: break-all;
		}

		&__delete {
			flex-shrink: 0;
			padding: 0;
			border: none;
			background: none;
			color: var(--color-danger);
			font-size: var(--font-size-xs);
			font-family: inherit;
			cursor: pointer;
		}
	}

	.confirm {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&__text {
			margin: 0;
			font-size: var(--font-size-md);
		}

		&__note {
			margin: 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.5;
		}

		/* 이미 지급한 수강 회차가 회수된다는 건 되돌리기 어려운 결과라 눈에 띄게 */
		&__warn {
			margin: 0;
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-sm);
			background: var(--color-bg);
			color: var(--color-danger);
			font-size: var(--font-size-xs);
			line-height: 1.5;
		}

		&__actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-sm);
			margin-top: var(--space-sm);
		}
	}
</style>
