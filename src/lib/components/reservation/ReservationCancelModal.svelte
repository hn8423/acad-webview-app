<script lang="ts">
	import { z } from 'zod';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { updateReservationStatus } from '$lib/api/reservation';
	import type { ScheduleSlot, ScheduleSlotReservation } from '$lib/types/reservation';
	import { formatTimeRange, getDayOfWeek } from '$lib/utils/format';
	import { getPassCategoryLabel } from '$lib/utils/pass';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		isOpen: boolean;
		reservation: ScheduleSlotReservation | null;
		slot: ScheduleSlot | null;
		date: string;
		onclose: () => void;
		oncancelled: () => void;
	}

	let { isOpen, reservation, slot, date, onclose, oncancelled }: Props = $props();

	const CANCEL_REASON_MAX = 500;
	const reasonSchema = z.string().trim().min(1).max(CANCEL_REASON_MAX);

	let cancelReason = $state('');
	let submitting = $state(false);

	let parsedReason = $derived(reasonSchema.safeParse(cancelReason));

	function formatDateLabel(value: string): string {
		return `${value.substring(5, 7)}월 ${value.substring(8, 10)}일 (${getDayOfWeek(value)})`;
	}

	function handleClose() {
		if (submitting) return;
		cancelReason = '';
		onclose();
	}

	async function handleSubmit() {
		const academyId = academyStore.academyId;
		if (!academyId || !reservation || !parsedReason.success || submitting) return;

		submitting = true;
		try {
			const res = await updateReservationStatus(academyId, reservation.reservation_id, {
				status: 'CANCELLED',
				cancel_reason: parsedReason.data
			});
			if (!res.status) {
				// 200 + 실패 응답은 client.ts가 토스트를 띄우지 않는다
				toastStore.error(res.message || '예약을 취소하지 못했습니다');
				return;
			}
			toastStore.success('예약이 취소되었습니다');
			cancelReason = '';
			oncancelled();
		} catch {
			// 에러 토스트는 client.ts에서 처리
		} finally {
			submitting = false;
		}
	}
</script>

<Modal {isOpen} title="예약 취소" position="center" onclose={handleClose}>
	{#if reservation && slot}
		<div class="reservation-cancel">
			<p class="reservation-cancel__message">
				<strong>{reservation.member_name}</strong>님의 예약을 취소하시겠습니까?
			</p>
			<dl class="reservation-cancel__info">
				<div class="reservation-cancel__row">
					<dt>일시</dt>
					<dd>{formatDateLabel(date)} {formatTimeRange(slot.start_time, slot.end_time)}</dd>
				</div>
				<div class="reservation-cancel__row">
					<dt>강사</dt>
					<dd>{slot.instructor_name ?? '미지정'}</dd>
				</div>
				{#if reservation.pass_category}
					<div class="reservation-cancel__row">
						<dt>수강권</dt>
						<dd>{getPassCategoryLabel(reservation.pass_category)}</dd>
					</div>
				{/if}
			</dl>
			<p class="reservation-cancel__notice">취소 사유와 함께 학생에게 알림이 전송됩니다.</p>
			<div class="reservation-cancel__field">
				<label class="reservation-cancel__label" for="admin-cancel-reason">
					취소 사유 <span class="reservation-cancel__required" aria-hidden="true">*</span>
				</label>
				<textarea
					id="admin-cancel-reason"
					class="reservation-cancel__textarea"
					bind:value={cancelReason}
					placeholder="취소 사유를 입력해주세요"
					rows="3"
					maxlength={CANCEL_REASON_MAX}
					required
					aria-required="true"
					aria-invalid={cancelReason.length > 0 && !parsedReason.success}
				></textarea>
			</div>
			<div class="reservation-cancel__actions">
				<Button
					variant="danger"
					fullWidth
					loading={submitting}
					disabled={!parsedReason.success}
					onclick={handleSubmit}
				>
					예약 취소
				</Button>
				<Button variant="secondary" fullWidth disabled={submitting} onclick={handleClose}>
					닫기
				</Button>
			</div>
		</div>
	{/if}
</Modal>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.reservation-cancel {
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

		&__info {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			margin: 0;
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
		}

		&__row {
			display: flex;
			gap: var(--space-sm);

			dt {
				flex-shrink: 0;
				width: 48px;
				color: var(--color-text-muted);
			}

			dd {
				margin: 0;
				color: var(--color-text-secondary);
			}
		}

		&__notice {
			font-size: var(--font-size-sm);
			color: var(--color-info);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-info-bg);
			border-radius: var(--radius-sm);
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

		&__required {
			color: var(--color-danger);
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
			transition: box-shadow var(--transition-fast);

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
