<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getInstructorUpcomingSlots } from '$lib/api/reservation';
	import type { InstructorUpcomingSlots, UpcomingSlot } from '$lib/types/reservation';
	import { splitByReservation } from '$lib/utils/slot-cleanup';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import UpcomingSlotList from '$lib/components/instructor/UpcomingSlotList.svelte';
	import SlotDeleteConfirmModal from '$lib/components/instructor/SlotDeleteConfirmModal.svelte';
	import InstructorWithdrawModal from '$lib/components/instructor/InstructorWithdrawModal.svelte';

	const instructorId = Number(page.params.id);

	let data = $state<InstructorUpcomingSlots | null>(null);
	let loading = $state(true);
	let selectedIds = $state<number[]>([]);
	let deleteTargets = $state<UpcomingSlot[]>([]);
	let showDeleteModal = $state(false);
	let showWithdrawModal = $state(false);

	let slots = $derived(data?.slots ?? []);
	let emptySlots = $derived(splitByReservation(slots).empty);
	let selectedSlots = $derived(slots.filter((s) => selectedIds.includes(s.slot_id)));
	let allSelected = $derived(slots.length > 0 && selectedIds.length === slots.length);

	async function fetchSlots() {
		const academyId = academyStore.academyId;
		if (!academyId || !instructorId) {
			loading = false;
			return;
		}
		try {
			const res = await getInstructorUpcomingSlots(academyId, instructorId);
			if (res.status && res.data) {
				data = res.data;
				// 사라진 수업은 선택에서도 뺀다
				const ids = res.data.slots.map((s) => s.slot_id);
				selectedIds = selectedIds.filter((id) => ids.includes(id));
			}
		} catch {
			// 에러 토스트는 client.ts에서 처리
		} finally {
			loading = false;
		}
	}

	onMount(fetchSlots);

	function toggle(slotId: number) {
		selectedIds = selectedIds.includes(slotId)
			? selectedIds.filter((id) => id !== slotId)
			: [...selectedIds, slotId];
	}

	function toggleAll() {
		selectedIds = allSelected ? [] : slots.map((s) => s.slot_id);
	}

	function openDelete(targets: UpcomingSlot[]) {
		if (targets.length === 0) return;
		deleteTargets = targets;
		showDeleteModal = true;
	}

	async function handleDeleted() {
		showDeleteModal = false;
		deleteTargets = [];
		await fetchSlots();
	}

	function handleWithdrawn() {
		showWithdrawModal = false;
		goto('/admin/instructors', { replaceState: true });
	}
</script>

<div class="slot-cleanup">
	<BackHeader title="강사 수업 정리" />

	<div class="slot-cleanup__content">
		{#if loading}
			<div class="slot-cleanup__loading"><Spinner /></div>
		{:else if !data}
			<p class="slot-cleanup__empty">강사 정보를 찾을 수 없습니다.</p>
		{:else}
			<section class="slot-cleanup__summary">
				<div class="slot-cleanup__name-row">
					<h2 class="slot-cleanup__name">{data.instructor.instructor_name}</h2>
					{#if data.instructor.is_withdrawn}
						<Badge variant="neutral">탈퇴한 강사</Badge>
					{/if}
				</div>
				<p class="slot-cleanup__counts">
					오늘 이후 수업 <strong>{data.total}건</strong> · 예약 있는 수업
					<strong>{data.reserved_count}건</strong>
				</p>
			</section>

			{#if slots.length === 0}
				<div class="slot-cleanup__done">
					<p class="slot-cleanup__empty">정리할 수업이 없습니다.</p>
					{#if !data.instructor.is_withdrawn}
						<Button variant="danger" fullWidth onclick={() => (showWithdrawModal = true)}>
							강사 탈퇴
						</Button>
					{/if}
				</div>
			{:else}
				<div class="slot-cleanup__toolbar">
					<button type="button" class="slot-cleanup__select-all" onclick={toggleAll}>
						{allSelected ? '전체 해제' : '전체 선택'}
					</button>
					{#if emptySlots.length > 0}
						<Button size="sm" variant="secondary" onclick={() => openDelete(emptySlots)}>
							예약 없는 수업 모두 삭제 ({emptySlots.length})
						</Button>
					{/if}
				</div>

				<UpcomingSlotList {slots} {selectedIds} ontoggle={toggle} />

				<div class="slot-cleanup__footer">
					<Button
						variant="danger"
						fullWidth
						disabled={selectedSlots.length === 0}
						onclick={() => openDelete(selectedSlots)}
					>
						선택한 수업 삭제 ({selectedSlots.length})
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<SlotDeleteConfirmModal
	isOpen={showDeleteModal}
	slots={deleteTargets}
	onclose={() => (showDeleteModal = false)}
	ondone={handleDeleted}
/>

<InstructorWithdrawModal
	isOpen={showWithdrawModal}
	instructor={data ? { id: instructorId, name: data.instructor.instructor_name } : null}
	onclose={() => (showWithdrawModal = false)}
	onwithdrawn={handleWithdrawn}
/>

<style lang="scss">
	@use '$lib/styles/variables' as *;
	@use '$lib/styles/mixins' as *;

	.slot-cleanup {
		&__content {
			display: flex;
			flex-direction: column;
			gap: var(--space-md);
			// BackHeader 가 fixed 라 그 높이만큼 내린다
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__loading {
			@include flex-center;
			min-height: 200px;
		}

		&__summary {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			padding: var(--space-md);
			background: var(--color-surface);
			border-radius: var(--radius-md);
		}

		&__name-row {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__name {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
			color: var(--color-text);
		}

		&__counts {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);

			:global(strong) {
				color: var(--color-text);
				font-weight: var(--font-weight-semibold);
			}
		}

		&__toolbar {
			@include flex-between;
			gap: var(--space-sm);
		}

		&__select-all {
			@include touch-target(44px);
			padding: 0 var(--space-xs);
			border: none;
			background: none;
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
		}

		&__footer {
			position: sticky;
			bottom: var(--space-md);
		}

		&__done {
			display: flex;
			flex-direction: column;
			gap: var(--space-md);
		}

		&__empty {
			padding: var(--space-xl) 0;
			text-align: center;
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
		}
	}
</style>
