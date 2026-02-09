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
	import { formatDate } from '$lib/utils/format';
	import type { DrinkTicket } from '$lib/types/member';
	import { onMount } from 'svelte';

	let tickets = $state<DrinkTicket[]>([]);
	let loading = $state(true);
	let showCreateModal = $state(false);
	let creating = $state(false);
	let error = $state('');

	// Form
	let totalCount = $state('');
	let expiryDate = $state('');

	const memberId = $derived(Number(page.params.id));

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const res = await getMemberDrinkTickets(academyId, memberId);
			if (res.status && res.data) {
				tickets = res.data;
			}
		} catch {
			// handle error
		} finally {
			loading = false;
		}
	});

	function openCreateModal() {
		totalCount = '';
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
				tickets = [...tickets, res.data];
				showCreateModal = false;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '음료권 부여에 실패했습니다.';
		} finally {
			creating = false;
		}
	}

	function isExpired(date: string): boolean {
		return new Date(date) < new Date();
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
		{:else if tickets.length === 0}
			<p class="drinks-page__empty">등록된 음료권이 없습니다.</p>
		{:else}
			<div class="ticket-list">
				{#each tickets as ticket}
					<Card>
						<div class="ticket-item">
							<div class="ticket-item__header">
								<span class="ticket-item__count">
									{ticket.remaining_count}/{ticket.total_count}잔
								</span>
								{#if isExpired(ticket.expiry_date)}
									<Badge variant="danger">만료</Badge>
								{:else}
									<Badge variant="success">사용가능</Badge>
								{/if}
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
	<form class="create-form" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
		<Input type="number" label="음료권 수량" placeholder="10" bind:value={totalCount} />
		<Input type="date" label="유효기간" bind:value={expiryDate} />

		{#if error}
			<p class="create-form__error">{error}</p>
		{/if}

		<div class="create-form__actions">
			<Button variant="secondary" onclick={() => (showCreateModal = false)}>취소</Button>
			<Button type="submit" loading={creating}>부여하기</Button>
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
	}

	.ticket-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.ticket-item {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-xs);
		}

		&__count {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
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
			justify-content: flex-end;
			gap: var(--space-sm);
		}
	}
</style>
