<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getSubscriptionPlans,
		createSubscriptionPlan,
		updateSubscriptionPlan,
		deleteSubscriptionPlan
	} from '$lib/api/subscription';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import { calcInstallmentAmounts, validatePlanAmounts } from '$lib/utils/subscription';
	import type { SubscriptionPlan } from '$lib/types/subscription';

	let plans = $state<SubscriptionPlan[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let deleting = $state(false);
	let error = $state('');

	let showFormModal = $state(false);
	let editTarget = $state<SubscriptionPlan | null>(null);
	let planName = $state('');
	let totalAmount = $state('');
	let installmentCount = $state('');
	let monthlyAmount = $state('');

	let showDeleteModal = $state(false);
	let deleteTarget = $state<SubscriptionPlan | null>(null);

	let formTitle = $derived(editTarget ? '구독 아이템 수정' : '구독 아이템 추가');

	onMount(() => fetchPlans());

	async function fetchPlans() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getSubscriptionPlans(academyId);
			if (res.status) plans = res.data ?? [];
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	let draft = $derived({
		total_amount: Number(totalAmount),
		installment_count: Number(installmentCount),
		monthly_amount: Number(monthlyAmount)
	});

	let isDraftFilled = $derived(!!totalAmount && !!installmentCount);

	// 입력하는 동안 회차별 금액을 그대로 보여줘 오타를 눈으로 잡게 한다.
	// 최종 계산은 서버가 다시 한다.
	let previewAmounts = $derived.by(() => {
		if (!isDraftFilled) return [];
		if (validatePlanAmounts(draft)) return [];
		return calcInstallmentAmounts(draft);
	});

	let amountError = $derived(isDraftFilled ? (validatePlanAmounts(draft) ?? '') : '');

	let canSubmit = $derived(!!planName.trim() && isDraftFilled && !amountError && !submitting);

	function openCreateModal() {
		editTarget = null;
		planName = '';
		totalAmount = '';
		installmentCount = '';
		monthlyAmount = '';
		error = '';
		showFormModal = true;
	}

	function openEditModal(plan: SubscriptionPlan) {
		editTarget = plan;
		planName = plan.plan_name;
		totalAmount = String(plan.total_amount);
		installmentCount = String(plan.installment_count);
		monthlyAmount = String(plan.monthly_amount);
		error = '';
		showFormModal = true;
	}

	async function handleSubmit() {
		if (!canSubmit) return;
		const academyId = academyStore.academyId;
		if (!academyId) return;

		error = '';
		submitting = true;
		try {
			const payload = {
				plan_name: planName.trim(),
				total_amount: draft.total_amount,
				installment_count: draft.installment_count,
				// 1회 납부면 월 납입액은 의미가 없다 — 서버가 총액으로 맞춘다
				monthly_amount: draft.installment_count <= 1 ? draft.total_amount : draft.monthly_amount
			};

			const res = editTarget
				? await updateSubscriptionPlan(academyId, editTarget.id, payload)
				: await createSubscriptionPlan(academyId, payload);

			if (res.status) {
				toastStore.success(res.message || '저장되었습니다.');
				showFormModal = false;
				await fetchPlans();
			} else {
				error = res.message || '저장에 실패했습니다.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '저장에 실패했습니다.';
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(plan: SubscriptionPlan) {
		deleteTarget = plan;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (deleting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		deleting = true;
		try {
			const res = await deleteSubscriptionPlan(academyId, deleteTarget.id);
			if (res.status) {
				toastStore.success(res.message || '삭제되었습니다.');
				showDeleteModal = false;
				deleteTarget = null;
				await fetchPlans();
			}
		} catch {
			// handled by client.ts
		} finally {
			deleting = false;
		}
	}
</script>

<div class="plans-page">
	<BackHeader title="구독 아이템 관리" onback={() => goto('/admin')} />

	<div class="plans-page__content">
		<p class="plans-page__hint">
			총 금액과 납부 횟수, 한 달에 낼 금액을 정하면 나머지는 마지막 회차에 몰아서 부과됩니다.
		</p>

		<div class="plans-page__header">
			<Button size="sm" onclick={openCreateModal}>아이템 추가</Button>
		</div>

		{#if loading}
			<div class="plans-page__loading"><Spinner /></div>
		{:else if plans.length === 0}
			<p class="plans-page__empty">등록된 구독 아이템이 없습니다.</p>
		{:else}
			<div class="plan-list">
				{#each plans as plan (plan.id)}
					<div class="plan-item">
						<div class="plan-item__head">
							<span class="plan-item__name">{plan.plan_name}</span>
							<span class="plan-item__total">{formatCurrency(plan.total_amount)}</span>
						</div>
						<p class="plan-item__detail">
							{plan.installment_count}회 분납
							{#if plan.installment_count > 1}
								· {plan.installment_count - 1}회 {formatCurrency(plan.monthly_amount)}
								· 마지막 {formatCurrency(plan.final_amount)}
							{/if}
						</p>
						<div class="plan-item__actions">
							<Button size="sm" variant="ghost" onclick={() => openEditModal(plan)}>수정</Button>
							<Button size="sm" variant="danger" onclick={() => confirmDelete(plan)}>삭제</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Modal isOpen={showFormModal} title={formTitle} onclose={() => (showFormModal = false)}>
	<div class="plan-form">
		<Input
			label="아이템 이름"
			bind:value={planName}
			placeholder="정규반 4회 분납"
			maxlength={100}
		/>
		<Input type="number" label="총 금액 (원)" bind:value={totalAmount} placeholder="954000" />
		<Input type="number" label="납부 횟수" bind:value={installmentCount} placeholder="4" />
		{#if Number(installmentCount) > 1}
			<Input
				type="number"
				label="한 달에 낼 금액 (원)"
				bind:value={monthlyAmount}
				placeholder="230000"
				error={amountError}
			/>
		{/if}

		{#if previewAmounts.length > 0}
			<div class="plan-form__preview">
				<p class="plan-form__preview-title">회차별 금액</p>
				<ul class="plan-form__preview-list">
					{#each previewAmounts as amount, i (i)}
						<li class:plan-form__preview-item--last={i === previewAmounts.length - 1}>
							<span>{i + 1}회차</span>
							<strong>{formatCurrency(amount)}</strong>
						</li>
					{/each}
				</ul>
			</div>
		{:else if amountError}
			<p class="plan-form__error">{amountError}</p>
		{/if}

		{#if error}
			<p class="plan-form__error">{error}</p>
		{/if}

		<div class="plan-form__actions">
			<Button variant="secondary" fullWidth onclick={() => (showFormModal = false)}>취소</Button>
			<Button fullWidth loading={submitting} disabled={!canSubmit} onclick={handleSubmit}>
				저장
			</Button>
		</div>
	</div>
</Modal>

<Modal isOpen={showDeleteModal} title="구독 아이템 삭제" onclose={() => (showDeleteModal = false)}>
	<div class="delete-confirm">
		<p class="delete-confirm__text">
			'{deleteTarget?.plan_name}' 아이템을 삭제할까요?
		</p>
		<p class="delete-confirm__note">
			이미 적용된 분납은 부여 시점 금액을 그대로 유지하므로 영향을 받지 않습니다.
		</p>
		<div class="delete-confirm__actions">
			<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
			<Button variant="danger" fullWidth loading={deleting} onclick={handleDelete}>삭제</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.plans-page {
		min-height: 100dvh;
		background: var(--color-bg);

		&__content {
			padding: var(--space-md);
		}

		&__hint {
			margin: 0 0 var(--space-md);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-surface);
			border-radius: var(--radius-md);
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.5;
		}

		&__header {
			display: flex;
			justify-content: flex-end;
			margin-bottom: var(--space-md);
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

	.plan-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.plan-item {
		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);

		&__head {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: var(--space-sm);
		}

		&__name {
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-semibold);
		}

		&__total {
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-bold);
			color: var(--color-primary);
			white-space: nowrap;
		}

		&__detail {
			margin: 4px 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.5;
		}

		&__actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-xs);
			margin-top: var(--space-sm);
		}
	}

	.plan-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__preview {
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__preview-title {
			margin: 0 0 var(--space-sm);
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__preview-list {
			margin: 0;
			padding: 0;
			list-style: none;
			display: flex;
			flex-direction: column;
			gap: 4px;

			li {
				display: flex;
				align-items: center;
				justify-content: space-between;
				font-size: var(--font-size-sm);
			}
		}

		/* 나머지를 몰아 받는 마지막 회차는 금액이 다르므로 눈에 띄게 */
		&__preview-item--last strong {
			color: var(--color-primary);
		}

		&__error {
			margin: 0;
			color: var(--color-danger);
			font-size: var(--font-size-xs);
		}

		&__actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-sm);
		}
	}

	.delete-confirm {
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

		&__actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-sm);
			margin-top: var(--space-sm);
		}
	}
</style>
