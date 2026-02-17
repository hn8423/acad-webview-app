<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getHoldings, updateHolding } from '$lib/api/holding';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate } from '$lib/utils/format';
	import { getHoldingStatusVariant, getHoldingStatusLabel } from '$lib/utils/holding';
	import type { Holding } from '$lib/types/holding';

	type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

	const STATUS_TABS: { label: string; value: StatusFilter }[] = [
		{ label: '전체', value: undefined },
		{ label: '대기중', value: 'PENDING' },
		{ label: '승인', value: 'APPROVED' },
		{ label: '거절', value: 'REJECTED' }
	];

	let holdings = $state<Holding[]>([]);
	let loading = $state(true);
	let statusFilter = $state<StatusFilter>(undefined);
	let actionTarget = $state<Holding | null>(null);
	let showApproveModal = $state(false);
	let showRejectModal = $state(false);
	let submitting = $state(false);

	onMount(() => fetchHoldings());

	async function fetchHoldings() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getHoldings(academyId, statusFilter);
			if (res.status && res.data) {
				const data = res.data;
				holdings = Array.isArray(data) ? data : (data.holdings ?? []);
			}
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	async function handleFilterChange(value: StatusFilter) {
		statusFilter = value;
		await fetchHoldings();
	}

	function openApproveModal(holding: Holding) {
		actionTarget = holding;
		showApproveModal = true;
	}

	function openRejectModal(holding: Holding) {
		actionTarget = holding;
		showRejectModal = true;
	}

	async function handleApprove() {
		if (submitting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !actionTarget) return;

		submitting = true;
		try {
			const res = await updateHolding(academyId, actionTarget.id, { status: 'APPROVED' });
			if (res.status) {
				toastStore.success('홀딩이 승인되었습니다.');
				showApproveModal = false;
				actionTarget = null;
				await fetchHoldings();
			} else {
				toastStore.error(res.message || '승인에 실패했습니다.');
			}
		} catch (err) {
			toastStore.error(err instanceof Error ? err.message : '승인에 실패했습니다.');
		} finally {
			submitting = false;
		}
	}

	async function handleReject() {
		if (submitting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !actionTarget) return;

		submitting = true;
		try {
			const res = await updateHolding(academyId, actionTarget.id, { status: 'REJECTED' });
			if (res.status) {
				toastStore.success('홀딩이 거절되었습니다.');
				showRejectModal = false;
				actionTarget = null;
				await fetchHoldings();
			} else {
				toastStore.error(res.message || '거절에 실패했습니다.');
			}
		} catch (err) {
			toastStore.error(err instanceof Error ? err.message : '거절에 실패했습니다.');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="holdings-page">
	<BackHeader title="홀딩 관리" onback={() => goto('/admin')} />

	<div class="holdings-page__content">
		<div class="holdings-page__filter">
			{#each STATUS_TABS as tab}
				<button
					class="filter-tab"
					class:filter-tab--active={statusFilter === tab.value}
					onclick={() => handleFilterChange(tab.value)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		{#if loading}
			<div class="holdings-page__loading">
				<Spinner />
			</div>
		{:else if holdings.length === 0}
			<p class="holdings-page__empty">홀딩 신청 내역이 없습니다.</p>
		{:else}
			<div class="holding-list">
				{#each holdings as holding, i (holding.id)}
					<div class="holding-item">
						<div class="holding-item__header">
							<span class="holding-item__member">{holding.member_name}</span>
							<Badge variant={getHoldingStatusVariant(holding.status)}>
								{getHoldingStatusLabel(holding.status)}
							</Badge>
						</div>
						<div class="holding-item__pass">{holding.pass_name}</div>
						<div class="holding-item__period">
							{formatDate(holding.holding_start)} ~ {formatDate(holding.holding_end)}
							{#if holding.holding_days != null && holding.holding_days > 0}
								<span class="holding-item__days">({holding.holding_days}일)</span>
							{/if}
						</div>
						{#if holding.reason}
							<div class="holding-item__reason">{holding.reason}</div>
						{/if}
						{#if holding.status === 'PENDING'}
							<div class="holding-item__actions">
								<button
									class="action-btn action-btn--approve"
									onclick={() => openApproveModal(holding)}
								>
									승인
								</button>
								<button
									class="action-btn action-btn--reject"
									onclick={() => openRejectModal(holding)}
								>
									거절
								</button>
							</div>
						{/if}
					</div>
					{#if i < holdings.length - 1}
						<div class="holding-list__divider"></div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- 승인 확인 모달 -->
<Modal isOpen={showApproveModal} title="홀딩 승인" onclose={() => (showApproveModal = false)}>
	<p class="modal-message">
		"{actionTarget?.member_name}"님의 홀딩 신청을 승인하시겠습니까?
	</p>
	<p class="modal-detail">
		수강권: {actionTarget?.pass_name}<br />
		기간: {actionTarget ? formatDate(actionTarget.holding_start) : ''} ~
		{actionTarget ? formatDate(actionTarget.holding_end) : ''}
	</p>
	<div class="modal-actions">
		<Button fullWidth onclick={handleApprove} loading={submitting}>승인</Button>
		<Button variant="secondary" fullWidth onclick={() => (showApproveModal = false)}>취소</Button>
	</div>
</Modal>

<!-- 거절 확인 모달 -->
<Modal isOpen={showRejectModal} title="홀딩 거절" onclose={() => (showRejectModal = false)}>
	<p class="modal-message">
		"{actionTarget?.member_name}"님의 홀딩 신청을 거절하시겠습니까?
	</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleReject} loading={submitting}>거절</Button>
		<Button variant="secondary" fullWidth onclick={() => (showRejectModal = false)}>취소</Button>
	</div>
</Modal>

<style lang="scss">
	.holdings-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__filter {
			display: flex;
			gap: var(--space-xs);
			background: var(--color-bg);
			border-radius: var(--radius-md);
			padding: 4px;
			margin-bottom: var(--space-md);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-2xl);
		}
	}

	.filter-tab {
		flex: 1;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);

		&--active {
			background: var(--color-white);
			color: var(--color-primary);
			font-weight: var(--font-weight-semibold);
			box-shadow: var(--shadow-sm);
		}
	}

	.holding-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);

		&__divider {
			height: 1px;
			background-color: var(--color-divider);
		}
	}

	.holding-item {
		padding: var(--space-md) 0;

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-xs);
		}

		&__member {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__pass {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-2xs);
		}

		&__period {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-xs);
		}

		&__days {
			color: var(--color-text-muted);
		}

		&__reason {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			background: var(--color-bg);
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-sm);
			margin-bottom: var(--space-sm);
		}

		&__actions {
			display: flex;
			gap: var(--space-sm);
			justify-content: flex-end;
		}
	}

	.action-btn {
		font-size: var(--font-size-sm);
		padding: 6px 16px;
		border-radius: var(--radius-sm);
		font-weight: var(--font-weight-medium);
		transition: all var(--transition-fast);

		&--approve {
			color: var(--color-primary);

			&:hover {
				background: var(--color-primary-bg);
			}
		}

		&--reject {
			color: var(--color-danger);

			&:hover {
				background: var(--color-danger-bg);
			}
		}
	}

	.modal-message {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		line-height: var(--line-height-base);
	}

	.modal-detail {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-top: var(--space-sm);
		line-height: var(--line-height-base);
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}
</style>
