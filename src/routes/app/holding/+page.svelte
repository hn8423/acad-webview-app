<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getMyPasses } from '$lib/api/member';
	import { getMyReservations } from '$lib/api/reservation';
	import { createMyHolding } from '$lib/api/holding';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate, formatTimeRange, getDayOfWeek } from '$lib/utils/format';
	import {
		isHoldable,
		getRemainingHoldDays,
		getPassDisplayName,
		calcHoldingDays,
		addDays,
		isActiveReservationStatus
	} from '$lib/utils/pass';
	import type { MemberPass } from '$lib/types/member';
	import type { MyReservation } from '$lib/types/reservation';

	let passes = $state<MemberPass[]>([]);
	let reservations = $state<MyReservation[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let error = $state('');
	let showConfirmSheet = $state(false);

	let selectedPassId = $state('');
	let startDate = $state('');
	let endDate = $state('');

	// 오늘(로컬 기준) — 시작일의 하한. 서버도 KST 오늘 이후만 허용한다.
	const today = new Date().toLocaleDateString('sv-SE');

	let holdablePasses = $derived(passes.filter(isHoldable));

	let selectedPass = $derived(
		holdablePasses.find((p) => String(p.id) === String(selectedPassId)) ?? null
	);

	let remainingHoldDays = $derived(selectedPass ? getRemainingHoldDays(selectedPass) : 0);

	let holdingDays = $derived(calcHoldingDays(startDate, endDate));

	// 홀딩 일수만큼 만료일이 밀린다
	let newEndDate = $derived(
		selectedPass && holdingDays > 0 ? addDays(selectedPass.end_date, holdingDays) : ''
	);

	// 홀딩 구간에 걸린 내 예약 — 이 건들이 자동 취소된다.
	// 과거 슬롯은 출결 이력으로 보존되므로 오늘 이후만 센다 (서버 정책과 동일).
	let affectedReservations = $derived.by(() => {
		if (!selectedPass || !startDate || !endDate || holdingDays <= 0) return [];
		const from = startDate > today ? startDate : today;
		return reservations.filter((r) => {
			if (!isActiveReservationStatus(r.status)) return false;
			if (r.member_pass_id !== undefined && r.member_pass_id !== selectedPass.id) return false;
			const date = r.slot_date?.slice(0, 10);
			return !!date && date >= from && date <= endDate;
		});
	});

	let validationError = $derived.by(() => {
		if (!selectedPass) return '홀딩할 수강권을 선택해주세요.';
		if (!startDate || !endDate) return '홀딩 기간을 선택해주세요.';
		if (holdingDays <= 0) return '종료일은 시작일보다 빠를 수 없습니다.';
		if (startDate < today) return '시작일은 오늘 이후여야 합니다.';
		if (endDate > selectedPass.end_date.slice(0, 10))
			return `종료일은 수강권 만료일(${formatDate(selectedPass.end_date)}) 이내여야 합니다.`;
		if (holdingDays > remainingHoldDays)
			return `잔여 홀딩 일수가 부족합니다. (신청 ${holdingDays}일 / 잔여 ${remainingHoldDays}일)`;
		return '';
	});

	let canSubmit = $derived(!validationError && !submitting);

	// 기간을 다 고른 뒤부터 안내한다 — 입력 도중에 빨간 글씨가 뜨는 것을 피하기 위함.
	// 버튼이 비활성인 이유를 항상 보이게 해서 "왜 안 눌리지" 상황을 없앤다.
	let inlineError = $derived(error || (startDate && endDate ? validationError : ''));

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const [passRes, reservationRes] = await Promise.allSettled([
				getMyPasses(academyId),
				getMyReservations(academyId)
			]);

			if (passRes.status === 'fulfilled' && passRes.value.status) {
				passes = passRes.value.data;
			}
			if (reservationRes.status === 'fulfilled' && reservationRes.value.status) {
				reservations = reservationRes.value.data;
			}

			// 수강권 카드에서 넘어온 경우 해당 수강권을 미리 선택
			const requested = page.url.searchParams.get('pass_id');
			const preselected = requested
				? passes.find((p) => String(p.id) === requested && isHoldable(p))
				: passes.filter(isHoldable)[0];
			if (preselected) selectedPassId = String(preselected.id);
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	});

	function openConfirm() {
		error = '';
		if (validationError) {
			error = validationError;
			return;
		}
		showConfirmSheet = true;
	}

	async function handleConfirm() {
		if (submitting || !selectedPass) return;
		const academyId = academyStore.academyId;
		if (!academyId) return;

		submitting = true;
		try {
			const res = await createMyHolding(academyId, selectedPass.id, {
				holding_start: startDate,
				holding_end: endDate
			});
			if (res.status) {
				toastStore.success(res.message || '홀딩이 신청되었습니다.');
				showConfirmSheet = false;
				goto('/app');
			} else {
				error = res.message || '홀딩 신청에 실패했습니다.';
				showConfirmSheet = false;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '홀딩 신청에 실패했습니다.';
			showConfirmSheet = false;
		} finally {
			submitting = false;
		}
	}
</script>

<div class="holding-page">
	<BackHeader title="수강권 홀딩" onback={() => goto('/app')} />

	<div class="holding-page__content">
		{#if loading}
			<div class="holding-page__loading"><Spinner /></div>
		{:else if holdablePasses.length === 0}
			<p class="holding-page__empty">홀딩할 수 있는 수강권이 없습니다.</p>
		{:else}
			<div class="holding-form">
				<div class="holding-form__field">
					<label class="holding-form__label" for="holding-pass">수강권</label>
					<select id="holding-pass" class="holding-form__select" bind:value={selectedPassId}>
						{#each holdablePasses as pass (pass.id)}
							<option value={String(pass.id)}>
								{getPassDisplayName(pass.pass_name, pass.pass_category)} · 홀딩 {getRemainingHoldDays(
									pass
								)}일 가능
							</option>
						{/each}
					</select>
				</div>

				{#if selectedPass}
					<div class="holding-summary">
						<div class="holding-summary__row">
							<span>현재 만료일</span>
							<strong>{formatDate(selectedPass.end_date)}</strong>
						</div>
						<div class="holding-summary__row">
							<span>잔여 홀딩</span>
							<strong data-testid="remaining-hold-days">{remainingHoldDays}일</strong>
						</div>
					</div>
				{/if}

				<div class="holding-form__row">
					<Input type="date" label="시작일" bind:value={startDate} min={today} />
					<Input type="date" label="종료일" bind:value={endDate} min={startDate || today} />
				</div>

				{#if holdingDays > 0}
					<div class="holding-preview">
						<div class="holding-preview__row">
							<span>홀딩 기간</span>
							<strong data-testid="holding-days">{holdingDays}일</strong>
						</div>
						{#if newEndDate}
							<div class="holding-preview__row">
								<span>만료일 연장</span>
								<strong>
									{formatDate(selectedPass?.end_date ?? '')} → {formatDate(newEndDate)}
								</strong>
							</div>
						{/if}
						{#if affectedReservations.length > 0}
							<p class="holding-preview__warning">
								이 기간의 예약 {affectedReservations.length}건이 취소됩니다.
							</p>
						{/if}
					</div>
				{/if}

				<p class="holding-form__notice">
					홀딩 기간에는 예약할 수 없고, 만료일은 홀딩한 일수만큼 늘어납니다. 신청 후에는 취소할 수
					없습니다.
				</p>

				{#if inlineError}
					<p class="holding-form__error">{inlineError}</p>
				{/if}

				<Button fullWidth onclick={openConfirm} disabled={!canSubmit}>홀딩 신청</Button>
			</div>
		{/if}
	</div>
</div>

<BottomSheet
	isOpen={showConfirmSheet}
	title="홀딩 신청 확인"
	onclose={() => (showConfirmSheet = false)}
>
	<div class="confirm-sheet">
		<div class="confirm-sheet__period">
			{formatDate(startDate)} ~ {formatDate(endDate)}
			<span class="confirm-sheet__days">({holdingDays}일)</span>
		</div>

		<div class="confirm-sheet__row">
			<span>잔여 홀딩</span>
			<strong>{remainingHoldDays}일 → {remainingHoldDays - holdingDays}일</strong>
		</div>
		<div class="confirm-sheet__row">
			<span>만료일</span>
			<strong>{formatDate(selectedPass?.end_date ?? '')} → {formatDate(newEndDate)}</strong>
		</div>

		{#if affectedReservations.length > 0}
			<div class="confirm-sheet__warning">
				<p class="confirm-sheet__warning-title">
					이 기간의 예약 {affectedReservations.length}건이 취소됩니다
				</p>
				<ul class="confirm-sheet__list">
					{#each affectedReservations as r (r.reservation_id)}
						<li>
							{formatDate(r.slot_date)}({getDayOfWeek(r.slot_date)})
							{formatTimeRange(r.start_time, r.end_time)}
							{#if r.instructor_name}
								· {r.instructor_name}
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="confirm-sheet__actions">
			<Button fullWidth onclick={handleConfirm} loading={submitting}>홀딩 신청</Button>
			<Button variant="secondary" fullWidth onclick={() => (showConfirmSheet = false)}>취소</Button>
		</div>
	</div>
</BottomSheet>

<style lang="scss">
	.holding-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-2xl);
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

	.holding-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
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
			background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238b95a1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
			background-repeat: no-repeat;
			background-position: right 16px center;
			padding-right: 40px;
			transition: box-shadow var(--transition-fast);

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__row {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-md);
		}

		&__notice {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			line-height: var(--line-height-base);
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}
	}

	.holding-summary,
	.holding-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-md);
		background: var(--color-bg);
		border-radius: var(--radius-md);

		&__row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);

			strong {
				color: var(--color-text);
				font-weight: var(--font-weight-medium);
			}
		}
	}

	.holding-preview__warning {
		margin-top: var(--space-xs);
		font-size: var(--font-size-sm);
		color: var(--color-warning);
	}

	.confirm-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&__period {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__days {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-regular);
			color: var(--color-text-secondary);
		}

		&__row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);

			strong {
				color: var(--color-text);
				font-weight: var(--font-weight-medium);
			}
		}

		&__warning {
			margin-top: var(--space-xs);
			padding: var(--space-md);
			background: var(--color-warning-bg, var(--color-bg));
			border-radius: var(--radius-md);
		}

		&__warning-title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-warning);
			margin-bottom: var(--space-xs);
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: 2px;
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			list-style: none;
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-md);
		}
	}
</style>
