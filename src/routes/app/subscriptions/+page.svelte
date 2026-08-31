<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { headerStore } from '$lib/stores/header.svelte';
	import { getMySubscriptions } from '$lib/api/subscription';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatCurrency, formatDate, getTodayString } from '$lib/utils/format';
	import {
		getDisplayInstallmentStatus,
		getInstallmentStatusLabel,
		getInstallmentStatusVariant,
		getSubscriptionStatusLabel,
		getSubscriptionStatusVariant
	} from '$lib/utils/subscription';
	import type { MemberSubscription } from '$lib/types/subscription';

	let subscriptions = $state<MemberSubscription[]>([]);
	let loading = $state(true);

	const today = getTodayString();

	$effect(() => {
		const token = headerStore.showBackHeader({
			title: '수강료 납부 현황',
			onback: () => goto('/app/profile')
		});
		return () => headerStore.hideBackHeader(token);
	});

	onMount(() => fetchSubscriptions());

	async function fetchSubscriptions() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getMySubscriptions(academyId);
			if (res.status) subscriptions = res.data ?? [];
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	function progressPercent(sub: MemberSubscription): number {
		if (sub.total_amount <= 0) return 0;
		return Math.min(100, (sub.paid_total / sub.total_amount) * 100);
	}
</script>

<div class="my-subscriptions">
	{#if loading}
		<div class="my-subscriptions__loading"><Spinner /></div>
	{:else if subscriptions.length === 0}
		<p class="my-subscriptions__empty">분할 납부 중인 수강료가 없습니다.</p>
	{:else}
		{#each subscriptions as sub (sub.subscription_id)}
			<section class="sub-card">
				<div class="sub-card__head">
					<div>
						<p class="sub-card__name">{sub.plan_name || sub.pass_name}</p>
						<p class="sub-card__meta">
							{sub.installment_count}회 분납
							{#if sub.total_lessons > 0}
								· 수강 {sub.granted_lessons_total}/{sub.total_lessons}회차
							{/if}
						</p>
					</div>
					<Badge variant={getSubscriptionStatusVariant(sub.status)}>
						{getSubscriptionStatusLabel(sub.status)}
					</Badge>
				</div>

				<div class="sub-card__bar">
					<div class="sub-card__bar-fill" style="width: {progressPercent(sub)}%"></div>
				</div>
				<div class="sub-card__amounts">
					<span>{formatCurrency(sub.paid_total)} 납부</span>
					<span class="sub-card__remaining">{formatCurrency(sub.remaining_total)} 남음</span>
				</div>

				<ul class="rounds">
					{#each sub.installments as installment (installment.installment_id)}
						{@const displayStatus = getDisplayInstallmentStatus(installment, today)}
						<li class="rounds__item">
							<span class="rounds__seq">{installment.seq}회차</span>
							<span class="rounds__due">{formatDate(installment.due_date)}</span>
							<span class="rounds__amount">
								{formatCurrency(installment.amount)}
								{#if installment.grant_lessons > 0}
									<span class="rounds__lessons">+{installment.grant_lessons}회차</span>
								{/if}
							</span>
							<Badge variant={getInstallmentStatusVariant(displayStatus)}>
								{getInstallmentStatusLabel(displayStatus)}
							</Badge>
						</li>
					{/each}
				</ul>
			</section>
		{/each}

		<p class="my-subscriptions__note">
			결제는 학원에서 진행하며, 등록이 반영되면 이 화면에 표시됩니다.
		</p>
	{/if}
</div>

<style lang="scss">
	.my-subscriptions {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);

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

		&__note {
			margin: 0;
			text-align: center;
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}
	}

	.sub-card {
		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);

		&__head {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: var(--space-sm);
			margin-bottom: var(--space-md);
		}

		&__name {
			margin: 0;
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-semibold);
		}

		&__meta {
			margin: 2px 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
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
	}

	.rounds {
		margin: var(--space-md) 0 0;
		padding: 0;
		list-style: none;

		&__item {
			display: grid;
			grid-template-columns: auto 1fr auto auto;
			gap: var(--space-sm);
			align-items: center;
			padding: var(--space-sm) 0;
			font-size: var(--font-size-sm);

			& + & {
				border-top: 1px solid var(--color-divider);
			}
		}

		&__seq {
			color: var(--color-text-secondary);
			font-size: var(--font-size-xs);
		}

		&__due {
			color: var(--color-text-secondary);
			font-size: var(--font-size-xs);
		}

		&__amount {
			font-weight: var(--font-weight-semibold);
			white-space: nowrap;
		}

		/* 납부하면 이만큼 수강 회차가 늘어난다 — 납부 동기를 만든다 */
		&__lessons {
			margin-left: 4px;
			color: var(--color-primary);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
		}
	}
</style>
