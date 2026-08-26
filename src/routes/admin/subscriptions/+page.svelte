<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getInstallmentDashboard, createInstallmentPayment } from '$lib/api/subscription';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import InstallmentCard from '$lib/components/subscription/InstallmentCard.svelte';
	import PaymentRegisterSheet from '$lib/components/subscription/PaymentRegisterSheet.svelte';
	import { formatCurrency, getTodayString } from '$lib/utils/format';
	import { DUE_GROUP_LABELS, getDueGroup, type DueGroup } from '$lib/utils/subscription';
	import type {
		CreatePaymentRequest,
		InstallmentDashboard,
		InstallmentListItem,
		InstallmentListState
	} from '$lib/types/subscription';

	const EMPTY_SUMMARY = {
		overdue_count: 0,
		overdue_amount: 0,
		overdue_member_count: 0,
		due_this_month_count: 0,
		due_this_month_amount: 0,
		outstanding_total_amount: 0
	};

	const TABS: Array<{ value: InstallmentListState; label: string }> = [
		{ value: 'OUTSTANDING', label: '미납' },
		{ value: 'OVERDUE', label: '연체' },
		{ value: 'ALL', label: '전체' }
	];

	// 완납된 회차는 기본 뷰에서 사라진다 — 전체 탭에서만 보인다
	let listState = $state<InstallmentListState>('OUTSTANDING');
	let dashboard = $state<InstallmentDashboard>({
		summary: { ...EMPTY_SUMMARY },
		items: [],
		has_more: false
	});
	let loading = $state(true);

	let showPaymentSheet = $state(false);
	let paymentTarget = $state<InstallmentListItem | null>(null);
	let submitting = $state(false);

	const today = getTodayString();

	onMount(() => fetchDashboard());

	async function fetchDashboard() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getInstallmentDashboard(academyId, { state: listState });
			if (res.status && res.data) dashboard = res.data;
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	function selectTab(next: InstallmentListState) {
		if (listState === next) return;
		listState = next;
		fetchDashboard();
	}

	// 연체 / 이번 달 / 예정 3개 묶음. 서버가 due_date 오름차순으로 주므로 순서는 유지된다.
	let groups = $derived.by(() => {
		const buckets: Array<{ key: DueGroup; items: InstallmentListItem[] }> = [
			{ key: 'OVERDUE', items: [] },
			{ key: 'THIS_MONTH', items: [] },
			{ key: 'UPCOMING', items: [] }
		];
		for (const item of dashboard.items) {
			const group = getDueGroup(item.due_date, today);
			buckets.find((b) => b.key === group)?.items.push(item);
		}
		return buckets.filter((b) => b.items.length > 0);
	});

	function openPaymentSheet(item: InstallmentListItem) {
		if (item.remaining_amount <= 0) {
			goto(`/admin/subscriptions/${item.subscription_id}`);
			return;
		}
		paymentTarget = item;
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
				await fetchDashboard();
			} else {
				toastStore.error(res.message || '결제 등록에 실패했습니다.');
			}
		} catch {
			// handled by client.ts
		} finally {
			submitting = false;
		}
	}
</script>

<div class="subscriptions-page">
	<BackHeader title="수납 관리" onback={() => goto('/admin')} />

	<div class="subscriptions-page__summary">
		<div class="summary-bar">
			<div class="summary-bar__main">
				<span class="summary-bar__label">연체</span>
				<span class="summary-bar__value">
					{dashboard.summary.overdue_count}건
					{#if dashboard.summary.overdue_member_count > 0}
						<span class="summary-bar__sub">· {dashboard.summary.overdue_member_count}명</span>
					{/if}
				</span>
				<span class="summary-bar__amount">
					{formatCurrency(dashboard.summary.overdue_amount)}
				</span>
			</div>
			<div class="summary-bar__rest">
				<span>이번 달 {formatCurrency(dashboard.summary.due_this_month_amount)}</span>
				<span>미수금 {formatCurrency(dashboard.summary.outstanding_total_amount)}</span>
			</div>
		</div>

		<div class="tabs" role="tablist">
			{#each TABS as tab (tab.value)}
				<button
					type="button"
					role="tab"
					aria-selected={listState === tab.value}
					class="tabs__item"
					class:tabs__item--active={listState === tab.value}
					onclick={() => selectTab(tab.value)}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="subscriptions-page__content">
		<div class="subscriptions-page__actions">
			<Button size="sm" variant="ghost" onclick={() => goto('/admin/subscription-plans')}>
				구독 아이템 관리
			</Button>
		</div>

		{#if loading}
			<div class="subscriptions-page__loading"><Spinner /></div>
		{:else if dashboard.items.length === 0}
			<p class="subscriptions-page__empty">
				{listState === 'ALL' ? '등록된 분납 회차가 없습니다.' : '미납 내역이 없습니다.'}
			</p>
		{:else}
			{#each groups as group (group.key)}
				<section class="group">
					<h2 class="group__title">
						{DUE_GROUP_LABELS[group.key]}
						<span class="group__count">{group.items.length}</span>
					</h2>
					<div class="group__list">
						{#each group.items as item (item.installment_id)}
							<InstallmentCard {item} {today} onclick={openPaymentSheet} />
						{/each}
					</div>
				</section>
			{/each}

			{#if dashboard.has_more}
				<p class="subscriptions-page__more">
					최근 {dashboard.items.length}건만 표시하고 있습니다. 학생별 상세에서 전체를 확인하세요.
				</p>
			{/if}
		{/if}
	</div>
</div>

<PaymentRegisterSheet
	bind:isOpen={showPaymentSheet}
	installment={paymentTarget}
	{submitting}
	onclose={() => (showPaymentSheet = false)}
	onsubmit={handlePaymentSubmit}
/>

<style lang="scss">
	.subscriptions-page {
		min-height: 100dvh;
		background: var(--color-bg);

		&__summary {
			position: sticky;
			top: var(--header-height);
			z-index: 10;
			background: var(--color-surface);
			border-bottom: 1px solid var(--color-divider);
		}

		&__content {
			padding: var(--space-md);
		}

		&__actions {
			display: flex;
			justify-content: flex-end;
			margin-bottom: var(--space-sm);
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

		&__more {
			margin: var(--space-md) 0 0;
			text-align: center;
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}
	}

	.summary-bar {
		padding: var(--space-md);

		&__main {
			display: flex;
			align-items: baseline;
			gap: var(--space-xs);
		}

		&__label {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			font-weight: var(--font-weight-semibold);
		}

		&__value {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__sub {
			color: var(--color-text-muted);
		}

		&__amount {
			margin-left: auto;
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
			color: var(--color-danger);
		}

		&__rest {
			display: flex;
			justify-content: space-between;
			margin-top: 4px;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}
	}

	.tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);

		&__item {
			padding: var(--space-sm) 0;
			border: none;
			border-bottom: 2px solid transparent;
			background: none;
			color: var(--color-text-secondary);
			font-size: var(--font-size-sm);
			font-family: inherit;
			cursor: pointer;

			&--active {
				border-bottom-color: var(--color-primary);
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);
			}
		}
	}

	.group {
		& + & {
			margin-top: var(--space-lg);
		}

		&__title {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			margin: 0 0 var(--space-sm);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
		}

		&__count {
			padding: 1px 6px;
			border-radius: var(--radius-full);
			background: var(--color-bg);
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
