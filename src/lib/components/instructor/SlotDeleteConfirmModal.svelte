<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { bulkDeleteSlots } from '$lib/api/reservation';
	import type { BulkDeleteSlotsResponse, UpcomingSlot } from '$lib/types/reservation';
	import { formatTimeRange, getDayOfWeek } from '$lib/utils/format';
	import {
		CANCEL_REASON_MAX,
		buildBulkDeleteRequests,
		formatDeleteResult,
		splitByReservation,
		sumDeleteResults
	} from '$lib/utils/slot-cleanup';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		isOpen: boolean;
		slots: UpcomingSlot[];
		onclose: () => void;
		// 삭제를 시도한 뒤 호출된다. 실패(409 포함)면 null — 부모는 목록을 다시 불러온다
		ondone: (result: BulkDeleteSlotsResponse | null) => void;
	}

	let { isOpen, slots, onclose, ondone }: Props = $props();

	let reason = $state('');
	let submitting = $state(false);

	let reserved = $derived(splitByReservation(slots).reserved);
	let reservedMemberCount = $derived(
		reserved.reduce((sum, slot) => sum + slot.reservations.length, 0)
	);

	function formatSlotLabel(slot: UpcomingSlot): string {
		const date = `${slot.slot_date.substring(5, 7)}월 ${slot.slot_date.substring(8, 10)}일`;
		return `${date} (${getDayOfWeek(slot.slot_date)}) ${formatTimeRange(slot.start_time, slot.end_time)}`;
	}

	function handleClose() {
		if (submitting) return;
		reason = '';
		onclose();
	}

	// 서버 한도를 넘으면 나눠 보낸다. 중간에 실패하면 거기서 멈추고, 이미 끝난 분량은 결과에 남긴다
	async function deleteAll(
		academyId: number
	): Promise<{ results: BulkDeleteSlotsResponse[]; failed: boolean }> {
		const results: BulkDeleteSlotsResponse[] = [];
		try {
			for (const request of buildBulkDeleteRequests(slots, reason)) {
				const res = await bulkDeleteSlots(academyId, request);
				if (!res.status) {
					// 200 + 실패 응답은 client.ts가 토스트를 띄우지 않는다
					toastStore.error(res.message || '수업을 삭제하지 못했습니다');
					return { results, failed: true };
				}
				results.push(res.data);
			}
			return { results, failed: false };
		} catch {
			// 에러 토스트는 client.ts에서 처리 (409: 그사이 예약이 들어왔거나 수업 상태가 바뀐 경우)
			return { results, failed: true };
		}
	}

	async function handleSubmit() {
		const academyId = academyStore.academyId;
		if (!academyId || slots.length === 0 || submitting) return;

		submitting = true;
		const { results, failed } = await deleteAll(academyId);
		submitting = false;
		reason = '';

		const total = results.length > 0 ? sumDeleteResults(results) : null;
		if (total && !failed) toastStore.success(formatDeleteResult(total));
		if (total && failed) toastStore.info(`일부만 처리되었습니다. ${formatDeleteResult(total)}`);
		ondone(failed ? null : total);
	}
</script>

<Modal {isOpen} title="수업 삭제" position="center" onclose={handleClose}>
	<div class="slot-delete">
		<p class="slot-delete__message">
			수업 <strong>{slots.length}건</strong>을 삭제하시겠습니까?
		</p>

		{#if reserved.length > 0}
			<p class="slot-delete__warning" role="alert">
				예약 회원 {reservedMemberCount}명의 예약이 취소되고, 회원에게 취소 알림이 전송됩니다.
			</p>
			<ul class="slot-delete__reserved" aria-label="예약 회원 목록">
				{#each reserved as slot (slot.slot_id)}
					<li class="slot-delete__reserved-item">
						<span class="slot-delete__reserved-time">{formatSlotLabel(slot)}</span>
						<span class="slot-delete__reserved-names">
							{slot.reservations.map((r) => r.member_name).join(', ')}
						</span>
					</li>
				{/each}
			</ul>
			<div class="slot-delete__field">
				<label class="slot-delete__label" for="slot-delete-reason">취소 사유 (선택)</label>
				<textarea
					id="slot-delete-reason"
					class="slot-delete__textarea"
					bind:value={reason}
					placeholder="미입력 시 '관리자 수업 삭제'로 안내됩니다"
					rows="2"
					maxlength={CANCEL_REASON_MAX}
				></textarea>
			</div>
		{:else}
			<p class="slot-delete__notice">예약이 없는 수업만 삭제됩니다.</p>
		{/if}

		<div class="slot-delete__actions">
			<Button variant="danger" fullWidth loading={submitting} onclick={handleSubmit}>
				{reserved.length > 0 ? '예약 취소 후 삭제' : '삭제'}
			</Button>
			<Button variant="secondary" fullWidth disabled={submitting} onclick={handleClose}>
				닫기
			</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.slot-delete {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__message {
			font-size: var(--font-size-base);
			color: var(--color-text);
			line-height: var(--line-height-base);

			:global(strong) {
				font-weight: var(--font-weight-semibold);
			}
		}

		&__warning,
		&__notice {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-sm);
		}

		&__warning {
			color: var(--color-danger);
			background: var(--color-danger-bg);
		}

		&__notice {
			color: var(--color-info);
			background: var(--color-info-bg);
		}

		&__reserved {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			max-height: 200px;
			overflow-y: auto;
			margin: 0;
			padding: var(--space-sm) var(--space-md);
			list-style: none;
			background: var(--color-bg);
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
		}

		&__reserved-item {
			display: flex;
			flex-direction: column;
			gap: var(--space-2xs);
		}

		&__reserved-time {
			color: var(--color-text-muted);
		}

		&__reserved-names {
			color: var(--color-text);
			font-weight: var(--font-weight-medium);
		}

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			font-weight: var(--font-weight-medium);
		}

		&__textarea {
			width: 100%;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			outline: none;
			resize: vertical;
			font-family: inherit;
			line-height: var(--line-height-base);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary);
			}
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-sm);
		}
	}
</style>
