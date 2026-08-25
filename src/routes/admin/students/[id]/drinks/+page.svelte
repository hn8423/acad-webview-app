<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMemberDrinkTickets, createDrinkTicket } from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate, getTodayString } from '$lib/utils/format';
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
	import { onMount } from 'svelte';

	let tickets = $state<DrinkTicket[]>([]);
	let loading = $state(true);
	let showCreateModal = $state(false);
	let creating = $state(false);
	// 부여 폼 에러와 목록 조회 실패는 표시 위치가 달라 따로 둔다.
	let error = $state('');
	let loadError = $state('');

	// Form
	let totalCount = $state('');
	let expiryDate = $state('');

	const memberId = $derived(Number(page.params.id));

	// 만료 판정 기준일 — 학생 화면(app/+page.svelte)과 같은 규칙을 쓴다.
	const today = getTodayString();

	let sortedTickets = $derived(sortDrinkTickets(tickets, today));
	let usableCount = $derived(countUsableDrinks(tickets, today));
	let expiredCount = $derived(countExpiredDrinks(tickets, today));

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId || !memberId) return;

		try {
			const res = await getMemberDrinkTickets(academyId, memberId);
			if (res.status && res.data) {
				tickets = res.data;
			}
		} catch (err) {
			console.error('음료권 조회 실패:', err);
			loadError = '음료권을 불러오지 못했습니다.';
		} finally {
			loading = false;
		}
	});

	function openCreateModal() {
		totalCount = '';
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- 기본 만료일 계산용 지역 변수
		const defaultExpiry = new Date();
		defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);
		expiryDate = defaultExpiry.toISOString().split('T')[0];
		error = '';
		showCreateModal = true;
	}

	async function handleCreate() {
		error = '';
		if (!totalCount || !expiryDate) {
			error = '모든 항목을 입력해주세요.';
			return;
		}

		const count = Number(totalCount);
		if (count <= 0) {
			error = '수량은 1 이상이어야 합니다.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		creating = true;
		try {
			const res = await createDrinkTicket(academyId, memberId, {
				total_count: count,
				expiry_date: expiryDate
			});
			if (res.status && res.data) {
				// 서버 목록은 created_at desc — 새 음료권이 맨 앞에 오도록 맞춘다.
				tickets = [res.data, ...tickets];
				showCreateModal = false;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '음료권 부여에 실패했습니다.';
		} finally {
			creating = false;
		}
	}
</script>

<div class="drinks-page">
	<BackHeader title="음료권 관리" onback={() => goto(`/admin/students/${memberId}`)} />

	<div class="drinks-page__content">
		<div class="drinks-page__header">
			<Button size="sm" onclick={openCreateModal}>음료권 부여</Button>
		</div>

		{#if loading}
			<div class="drinks-page__loading">
				<Spinner />
			</div>
		{:else if loadError}
			<p class="drinks-page__error">{loadError}</p>
		{:else if tickets.length === 0}
			<p class="drinks-page__empty">등록된 음료권이 없습니다.</p>
		{:else}
			<p class="drinks-page__summary">
				사용 가능 <strong>{usableCount}잔</strong>
				{#if expiredCount > 0}
					<span class="drinks-page__summary-expired">· 만료 {expiredCount}잔</span>
				{/if}
			</p>
			<div class="ticket-list">
				{#each sortedTickets as ticket (ticket.id)}
					{@const state = getDrinkTicketState(ticket, today)}
					<Card>
						<div class="ticket-item" class:ticket-item--dimmed={state === 'EXPIRED'}>
							<div class="ticket-item__header">
								<span class="ticket-item__count">
									{ticket.remaining_count}/{ticket.total_count}잔
								</span>
								<Badge variant={getDrinkTicketStateVariant(state)}>
									{getDrinkTicketStateLabel(state, getDaysUntilExpiry(ticket.expiry_date, today))}
								</Badge>
							</div>
							<span class="ticket-item__expiry">유효기간: {formatDate(ticket.expiry_date)}</span>
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Modal isOpen={showCreateModal} title="음료권 부여" onclose={() => (showCreateModal = false)}>
	<form
		class="create-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleCreate();
		}}
	>
		<Input type="number" label="음료권 수량" placeholder="10" bind:value={totalCount} />
		<Input type="date" label="유효기간" bind:value={expiryDate} />

		{#if error}
			<p class="create-form__error">{error}</p>
		{/if}

		<div class="create-form__actions">
			<Button type="submit" fullWidth loading={creating}>부여하기</Button>
			<Button variant="secondary" fullWidth onclick={() => (showCreateModal = false)}>취소</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.drinks-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__header {
			display: flex;
			justify-content: flex-end;
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

		&__error {
			text-align: center;
			color: var(--color-danger);
			padding: var(--space-2xl);
		}

		&__summary {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-sm);

			strong {
				color: var(--color-text);
				font-weight: var(--font-weight-bold);
			}
		}

		&__summary-expired {
			color: var(--color-text-muted);
		}
	}

	.ticket-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.ticket-item {
		&--dimmed {
			opacity: 0.6;
		}

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-xs);
		}

		&__count {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			color: var(--color-text);
		}

		&__expiry {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
