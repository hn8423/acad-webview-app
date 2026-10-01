<script lang="ts">
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RecurringBookingOptions from '$lib/components/reservation/RecurringBookingOptions.svelte';
	import { formatDate, formatTimeRange, getDayOfWeek } from '$lib/utils/format';
	import {
		getAvailableLessons,
		getPassDisplayName,
		getPendingCount,
		getReservationWeight,
		getTicketValue
	} from '$lib/utils/pass';
	import { getInstructorLabel } from '$lib/utils/reservation';
	import type { MemberPass } from '$lib/types/member';
	import type { AvailableSlot } from '$lib/types/reservation';

	interface Props {
		isOpen: boolean;
		slot: AvailableSlot | null;
		// 이 슬롯에 쓸 수 있는 수강권 (강사 매칭 반영)
		passes: MemberPass[];
		// 강사 담당 수강권만 추려서 보여주는 중인지 — 안내 문구 노출용
		instructorFiltered: boolean;
		selectedPassId: number | null;
		submitting: boolean;
		// 반복 예약이면 선택한 슬롯 id 목록, 단건 예약이면 null
		onconfirm: (recurringSlotIds: number[] | null) => void;
		onclose: () => void;
	}

	let {
		isOpen = $bindable(false),
		slot,
		passes,
		instructorFiltered,
		selectedPassId = $bindable(null),
		submitting,
		onconfirm,
		onclose
	}: Props = $props();

	// 어느 슬롯에 대한 반복 선택인지 함께 들고 있어, 다른 슬롯을 열면 이전 선택이 새지 않는다
	let recurring = $state<{ slotId: number; ids: number[] } | null>(null);

	let recurringIds = $derived(
		recurring && slot && recurring.slotId === slot.slot_id ? recurring.ids : null
	);
	let selectedPass = $derived(passes.find((p) => p.id === selectedPassId) ?? null);
	let ticketValue = $derived(selectedPass ? getTicketValue(selectedPass.ticket_value) : 1);
	let selectedPassWeight = $derived(
		selectedPass
			? getReservationWeight(selectedPass.pass_category, selectedPass.ticket_value, slot?.slot_type)
			: 1
	);
	let exceedsCapacity = $derived(
		slot && selectedPass
			? slot.slot_type !== 'ENSEMBLE' && slot.remaining_capacity < selectedPassWeight
			: false
	);
	let confirmDisabled = $derived(recurringIds ? recurringIds.length === 0 : exceedsCapacity);

	function handleSelectionChange(ids: number[] | null) {
		recurring = ids && slot ? { slotId: slot.slot_id, ids } : null;
	}

	function passFits(pass: MemberPass): boolean {
		if (!slot || slot.slot_type === 'ENSEMBLE') return true;
		return (
			slot.remaining_capacity >=
			getReservationWeight(pass.pass_category, pass.ticket_value, slot.slot_type)
		);
	}

	function passOptionLabel(pass: MemberPass): string {
		const pendingCount = getPendingCount(pass);
		const passTicketValue = getTicketValue(pass.ticket_value);
		const pending = pendingCount > 0 ? `, 예약중 ${pendingCount}회` : '';
		const ticket = passTicketValue > 1 ? ` [${passTicketValue}회 차감]` : '';
		const full = passFits(pass) ? '' : ' (마감)';
		return `${getPassDisplayName(pass.pass_name, pass.pass_category)} (예약 가능 ${getAvailableLessons(pass)}회${pending})${ticket}${full}`;
	}

	function handleClose() {
		recurring = null;
		onclose();
	}
</script>

<BottomSheet bind:isOpen title="예약 확인" onclose={handleClose}>
	{#if slot}
		<div class="booking-sheet">
			<div class="booking-sheet__info">
				<div class="booking-sheet__row">
					<span class="booking-sheet__label">날짜</span>
					<span class="booking-sheet__value">
						{formatDate(slot.slot_date)} ({getDayOfWeek(slot.slot_date)})
					</span>
				</div>
				<div class="booking-sheet__row">
					<span class="booking-sheet__label">시간</span>
					<span class="booking-sheet__value">
						{formatTimeRange(slot.start_time, slot.end_time)}
					</span>
				</div>
				<div class="booking-sheet__row">
					<span class="booking-sheet__label">{slot.slot_type === 'ENSEMBLE' ? '유형' : '강사'}</span
					>
					<span class="booking-sheet__value">{getInstructorLabel(slot)}</span>
				</div>
			</div>

			<div class="booking-sheet__field">
				<label class="booking-sheet__field-label" for="pass-select">사용할 수강권</label>
				<select
					id="pass-select"
					class="booking-sheet__select"
					bind:value={selectedPassId}
					aria-label="사용할 수강권 선택"
				>
					{#each passes as pass (pass.id)}
						<option value={pass.id} disabled={!passFits(pass)}>{passOptionLabel(pass)}</option>
					{/each}
				</select>
			</div>

			{#if slot.slot_type === 'ENSEMBLE'}
				<p class="booking-sheet__pass-notice booking-sheet__pass-notice--info">
					합주 수업은 모든 수강권으로 예약할 수 있습니다.
				</p>
			{:else if slot.instructor_name && instructorFiltered}
				<p class="booking-sheet__pass-notice">
					{slot.instructor_name} 선생님 담당 수강권만 표시됩니다.
				</p>
			{/if}

			{#if selectedPass && ticketValue > 1}
				<div class="booking-sheet__ticket-notice">
					이 수강권은 1회 수업당 {ticketValue}회가 차감됩니다.
				</div>
			{/if}

			{#if selectedPass && getPendingCount(selectedPass) > 0}
				<p class="booking-sheet__pass-notice booking-sheet__pass-notice--info">
					잔여 {selectedPass.remaining_lessons}회 중 {getPendingCount(selectedPass)}회는 이미
					예약되어 있습니다. (수업 완료 처리 시 차감)
				</p>
			{/if}

			<RecurringBookingOptions
				{slot}
				pass={selectedPass}
				onselectionchange={handleSelectionChange}
			/>

			{#if exceedsCapacity && !recurringIds}
				<div class="booking-sheet__capacity-warning">해당 시간은 예약이 마감되었습니다.</div>
			{/if}

			<Button
				fullWidth
				loading={submitting}
				disabled={confirmDisabled}
				onclick={() => onconfirm(recurringIds)}
			>
				{#if recurringIds}
					{recurringIds.length}회 예약하기
				{:else if ticketValue > 1}
					예약하기 ({ticketValue}회 차감)
				{:else}
					예약하기
				{/if}
			</Button>
		</div>
	{/if}
</BottomSheet>

<style lang="scss">
	.booking-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__info {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__row {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		&__label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__value {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}

		&__field-label {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__pass-notice {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-sm);

			&--info {
				color: var(--color-info);
				background: var(--color-info-bg);
			}
		}

		&__ticket-notice {
			font-size: var(--font-size-sm);
			color: var(--color-warning);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-warning-bg);
			border-radius: var(--radius-sm);
		}

		&__capacity-warning {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-danger-bg);
			border-radius: var(--radius-sm);
		}

		&__select {
			width: 100%;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			outline: none;
			appearance: none;
			background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
			background-repeat: no-repeat;
			background-position: right 16px center;
			padding-right: 40px;

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}
	}
</style>
