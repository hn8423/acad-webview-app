<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getMyPasses, getMyDrinkTickets, useDrinkTicket } from '$lib/api/member';
	import { getRecentNotices } from '$lib/api/academy';
	import { getMyReservations, cancelReservation, cancelReservationAsNoShow } from '$lib/api/reservation';
	import { createHolding } from '$lib/api/holding';
	import { login } from '$lib/api/auth';
	import { apiRequest } from '$lib/api/client';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import CalendarSection from '$lib/components/ui/CalendarSection.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import HoldingRequestModal from '$lib/components/holding/HoldingRequestModal.svelte';
	import DrinkRedeemModal from '$lib/components/drink/DrinkRedeemModal.svelte';
	import { formatDate, formatTimeRange, getDayOfWeek } from '$lib/utils/format';
	import { isReservationDay } from '$lib/utils/reservation';
	import {
		getPassStatusVariant,
		getPassStatusLabel,
		getTicketValue,
		getReservationWeight
	} from '$lib/utils/pass';
	import type { MemberPass, DrinkTicket } from '$lib/types/member';
	import type { MyReservation } from '$lib/types/reservation';
	import type { Notice } from '$lib/types/academy';
	import type { ApiResponse } from '$lib/types/api';
	import type { UserAcademy } from '$lib/types/auth';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let passes = $state<MemberPass[]>([]);
	let drinkTickets = $state<DrinkTicket[]>([]);
	let recentNotices = $state<Notice[]>([]);
	let myReservations = $state<MyReservation[]>([]);
	let loading = $state(true);

	let cancelSheetOpen = $state(false);
	let cancelTarget = $state<MyReservation | null>(null);
	let cancelling = $state(false);

	let isSameDayCancel = $derived(
		cancelTarget ? isReservationDay(cancelTarget.slot_date) : false
	);

	let showHoldingModal = $state(false);
	let holdingTargetPass = $state<MemberPass | null>(null);
	let holdingSubmitting = $state(false);
	let holdingError = $state('');
	let holdingRequestedPassIds = $state(new Set<number>());

	let showDrinkRedeemModal = $state(false);
	let drinkRedeemSubmitting = $state(false);
	let drinkRedeemError = $state('');

	onMount(async () => {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const [passRes, drinkRes, noticeRes, reservationRes] = await Promise.allSettled([
				getMyPasses(academyId),
				getMyDrinkTickets(academyId),
				getRecentNotices(academyId),
				getMyReservations(academyId)
			]);

			if (passRes.status === 'fulfilled' && passRes.value.status) {
				passes = passRes.value.data;
			}
			if (drinkRes.status === 'fulfilled' && drinkRes.value.status) {
				drinkTickets = drinkRes.value.data;
			}
			if (noticeRes.status === 'fulfilled' && noticeRes.value.status) {
				recentNotices = noticeRes.value.data;
			}
			if (reservationRes.status === 'fulfilled' && reservationRes.value.status) {
				myReservations = reservationRes.value.data;
			}
		} catch {
			// errors handled per-section
		} finally {
			loading = false;
		}
	});

	let totalDrinks = $derived(drinkTickets.reduce((sum, t) => sum + t.remaining_count, 0));

	function openHoldingModal(pass: MemberPass) {
		holdingTargetPass = pass;
		holdingError = '';
		showHoldingModal = true;
	}

	async function handleHoldingSubmit(data: {
		holding_start: string;
		holding_end: string;
		reason?: string;
	}) {
		const academyId = academyStore.academyId;
		if (!academyId || !holdingTargetPass) return;

		holdingSubmitting = true;
		holdingError = '';
		try {
			const res = await createHolding(academyId, holdingTargetPass.id, {
				holding_start: data.holding_start,
				holding_end: data.holding_end,
				reason: data.reason
			});
			if (res.status) {
				toastStore.success('홀딩 신청이 완료되었습니다.');
				holdingRequestedPassIds = new Set([...holdingRequestedPassIds, holdingTargetPass.id]);
				showHoldingModal = false;
				holdingTargetPass = null;
			} else {
				holdingError = res.message || '홀딩 신청에 실패했습니다.';
			}
		} catch (err) {
			holdingError = err instanceof Error ? err.message : '홀딩 신청에 실패했습니다.';
		} finally {
			holdingSubmitting = false;
		}
	}

	function openDrinkRedeemModal() {
		if (totalDrinks <= 0) return;
		drinkRedeemError = '';
		showDrinkRedeemModal = true;
	}

	async function handleDrinkRedeem(data: { phone: string; password: string }) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		drinkRedeemSubmitting = true;
		drinkRedeemError = '';

		try {
			const loginRes = await login({
				user_phone: data.phone,
				password: btoa(data.password),
				device_type: 'ANDROID'
			});

			if (!loginRes.status || !loginRes.data) {
				drinkRedeemError = '로그인에 실패했습니다. 번호와 비밀번호를 확인해주세요.';
				return;
			}

			const adminToken = loginRes.data.access_token;

			const academiesRes = await apiRequest<ApiResponse<UserAcademy[]>>(
				'/academic/auth/me/academies',
				{
					skipAuth: true,
					headers: { Authorization: `Bearer ${adminToken}` }
				}
			);

			if (!academiesRes.status || !academiesRes.data) {
				drinkRedeemError = '학원 정보를 조회할 수 없습니다.';
				return;
			}

			const adminAcademy = academiesRes.data.find(
				(a) => a.academy_id === academyId && a.member_role === 'ADMIN'
			);

			if (!adminAcademy) {
				drinkRedeemError = '관리자 권한이 없는 계정입니다.';
				return;
			}

			const ticket = drinkTickets.find((t) => t.remaining_count > 0);
			if (!ticket) {
				drinkRedeemError = '사용 가능한 음료권이 없습니다.';
				return;
			}

			const useRes = await useDrinkTicket(academyId, ticket.id, 1);

			if (useRes.status) {
				drinkTickets = drinkTickets.map((t) =>
					t.id === ticket.id
						? { ...t, remaining_count: useRes.data.remaining_count }
						: t
				);
				toastStore.success('음료권 1잔이 사용되었습니다.');
				showDrinkRedeemModal = false;
			} else {
				drinkRedeemError = useRes.message || '음료권 사용에 실패했습니다.';
			}
		} catch (err) {
			drinkRedeemError = err instanceof Error ? err.message : '음료권 사용에 실패했습니다.';
		} finally {
			drinkRedeemSubmitting = false;
		}
	}

	function handleCancelReservation(reservationId: number) {
		const target = myReservations.find((r) => r.reservation_id === reservationId);
		if (!target) return;
		cancelTarget = target;
		cancelSheetOpen = true;
	}

	async function handleConfirmCancel() {
		const academyId = academyStore.academyId;
		if (!academyId || !cancelTarget) return;

		cancelling = true;
		try {
			const noShow = isReservationDay(cancelTarget.slot_date);
			const res = noShow
				? await cancelReservationAsNoShow(academyId, cancelTarget.reservation_id)
				: await cancelReservation(academyId, cancelTarget.reservation_id);
			if (res.status) {
				toastStore.success(
					noShow ? '당일 취소로 노쇼 처리되었습니다.' : '예약이 취소되었습니다.'
				);
				cancelSheetOpen = false;
				cancelTarget = null;
				const refreshRes = await getMyReservations(academyId);
				if (refreshRes.status) {
					myReservations = refreshRes.data;
				}
			}
		} catch {
			// handled by client.ts
		} finally {
			cancelling = false;
		}
	}

	function getInstructorLabel(reservation: MyReservation): string {
		if (reservation.slot_type === 'ENSEMBLE') return '합주 수업';
		return reservation.instructor_name
			? `${reservation.instructor_name} 선생님`
			: '강사 미지정';
	}
</script>

<div class="main-page">
	{#if loading}
		<div class="main-page__loading">
			<Spinner />
		</div>
	{:else}
		<!-- 음료권 -->
		<section class="main-page__section">
			<div class="section-card">
				<h2 class="section-title">음료권</h2>
				<button
					type="button"
					class="drink-card"
					class:drink-card--disabled={totalDrinks <= 0}
					disabled={totalDrinks <= 0}
					onclick={openDrinkRedeemModal}
				>
					<div class="drink-card__icon">
						<svg
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-primary)"
							stroke-width="2"
						>
							<path
								d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"
							/>
						</svg>
					</div>
					<div class="drink-card__info">
						<span class="drink-card__count">{totalDrinks}</span>
						<span class="drink-card__label">잔 남음</span>
					</div>
					{#if totalDrinks > 0}
						<span class="drink-card__action">사용하기</span>
					{/if}
				</button>
			</div>
		</section>

		<!-- 수강권 -->
		<section class="main-page__section">
			<div class="section-card">
				<h2 class="section-title">수강권</h2>
				{#if passes.length === 0}
					<p class="empty-text">등록된 수강권이 없습니다.</p>
				{:else}
					<div class="pass-list">
						{#each passes as pass}
							<div class="pass-card">
								<div class="pass-card__header">
									<span class="pass-card__name">
									{pass.pass_name}
									{#if getTicketValue(pass.ticket_value) > 1}
										<span class="pass-card__ticket-badge">{getTicketValue(pass.ticket_value)}회 차감</span>
									{/if}
								</span>
									<Badge variant={getPassStatusVariant(pass.status)}>
										{getPassStatusLabel(pass.status)}
									</Badge>
								</div>
								<div class="pass-card__body">
									<div class="pass-card__instructor">{pass.instructor_name} 선생님</div>
									<div class="pass-card__progress">
										<div class="progress-bar">
											<div
												class="progress-bar__fill"
												style="width: {((pass.total_lessons - pass.remaining_lessons) /
													pass.total_lessons) *
													100}%"
											></div>
										</div>
										<span class="pass-card__remaining">
											잔여 {pass.remaining_lessons}/{pass.total_lessons}회
										</span>
									</div>
									<div class="pass-card__date">
										{formatDate(pass.start_date)} ~ {formatDate(pass.end_date)}
									</div>
									{#if holdingRequestedPassIds.has(pass.id)}
										<span class="pass-card__holding-status">홀딩 신청중</span>
									{:else if pass.status === 'ACTIVE'}
										<button class="pass-card__holding-btn" onclick={() => openHoldingModal(pass)}>
											홀딩 신청
										</button>
									{/if}
								</div>
							</div>
							{#if passes.indexOf(pass) < passes.length - 1}
								<div class="pass-divider"></div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<!-- 캘린더 조회 -->
		{#if academyStore.academyId}
			<section class="main-page__section">
				<CalendarSection
					academyId={academyStore.academyId}
					reservations={myReservations}
					oncancelreservation={handleCancelReservation}
				/>
			</section>
		{/if}

		<!-- 공지사항 -->
		<section class="main-page__section">
			<div class="section-card">
				<div class="section-header">
					<h2 class="section-title">공지사항</h2>
					<a href="/app/notice" class="section-more">더보기</a>
				</div>
				{#if recentNotices.length === 0}
					<p class="empty-text">공지사항이 없습니다.</p>
				{:else}
					<div class="notice-list">
						{#each recentNotices as notice, i}
							<button
								type="button"
								class="notice-item"
								onclick={() => goto(`/app/notice/${notice.id}`)}
							>
								<h3 class="notice-item__title">{notice.title}</h3>
								<span class="notice-item__date">{formatDate(notice.created_at)}</span>
							</button>
							{#if i < recentNotices.length - 1}
								<div class="notice-divider"></div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/if}
</div>

<HoldingRequestModal
	isOpen={showHoldingModal}
	passName={holdingTargetPass?.pass_name ?? ''}
	onclose={() => {
		showHoldingModal = false;
		holdingError = '';
	}}
	onsubmit={handleHoldingSubmit}
	submitting={holdingSubmitting}
	error={holdingError}
/>

<DrinkRedeemModal
	isOpen={showDrinkRedeemModal}
	{totalDrinks}
	onclose={() => {
		showDrinkRedeemModal = false;
		drinkRedeemError = '';
	}}
	onsubmit={handleDrinkRedeem}
	submitting={drinkRedeemSubmitting}
	error={drinkRedeemError}
/>

<!-- 예약 취소 확인 BottomSheet -->
<BottomSheet
	bind:isOpen={cancelSheetOpen}
	title="예약 취소"
	onclose={() => {
		cancelSheetOpen = false;
		cancelTarget = null;
	}}
>
	{#if cancelTarget}
		<div class="cancel-sheet">
			<p class="cancel-sheet__message">
				{isSameDayCancel
					? '당일 취소는 노쇼로 처리됩니다. 정말 취소하시겠습니까?'
					: '정말 예약을 취소하시겠습니까?'}
			</p>
			<div class="cancel-sheet__info">
				<div class="cancel-sheet__row">
					<span class="cancel-sheet__label">날짜</span>
					<span class="cancel-sheet__value">
						{formatDate(cancelTarget.slot_date)}
						({getDayOfWeek(cancelTarget.slot_date)})
					</span>
				</div>
				<div class="cancel-sheet__row">
					<span class="cancel-sheet__label">시간</span>
					<span class="cancel-sheet__value">
						{formatTimeRange(cancelTarget.start_time, cancelTarget.end_time)}
					</span>
				</div>
				<div class="cancel-sheet__row">
					<span class="cancel-sheet__label">{cancelTarget.slot_type === 'ENSEMBLE' ? '유형' : '강사'}</span>
					<span class="cancel-sheet__value">{getInstructorLabel(cancelTarget)}</span>
				</div>
				{#if cancelTarget.pass_name}
					<div class="cancel-sheet__row">
						<span class="cancel-sheet__label">수강권</span>
						<span class="cancel-sheet__value">{cancelTarget.pass_name}</span>
					</div>
				{/if}
			</div>
			{#if isSameDayCancel}
				<div class="cancel-sheet__noshow-warning">
					당일 취소는 노쇼(No-Show)로 처리됩니다.
					수강권이 차감되며 환불되지 않습니다.
				</div>
			{:else}
				{@const cancelWeight = getReservationWeight(cancelTarget.pass_category, cancelTarget.ticket_value)}
				{#if cancelWeight !== 1}
					<p class="cancel-sheet__refund-notice">
						취소 시 {cancelWeight}인원이 환원됩니다.
					</p>
				{/if}
				{#if getTicketValue(cancelTarget.ticket_value) > 1}
					<p class="cancel-sheet__refund-notice">
						취소 시 {getTicketValue(cancelTarget.ticket_value)}회가 환불됩니다.
					</p>
				{/if}
			{/if}
			<div class="cancel-sheet__buttons">
				<Button
					variant="secondary"
					fullWidth
					onclick={() => {
						cancelSheetOpen = false;
						cancelTarget = null;
					}}
				>
					닫기
				</Button>
				<Button variant="danger" fullWidth loading={cancelling} onclick={handleConfirmCancel}>
					{isSameDayCancel ? '노쇼 처리하기' : '취소하기'}
				</Button>
			</div>
		</div>
	{/if}
</BottomSheet>

<style lang="scss">
	.main-page {
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-section);

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__section {
			min-width: 0;
		}
	}

	.section-card {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-xl) var(--space-lg);
	}

	.section-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		margin-bottom: var(--space-md);
		letter-spacing: var(--letter-spacing-tight);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);

		.section-title {
			margin-bottom: 0;
		}
	}

	.section-more {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		text-decoration: none;
	}

	.empty-text {
		text-align: center;
		color: var(--color-text-muted);
		padding: var(--space-md) 0;
		font-size: var(--font-size-sm);
	}

	.drink-card {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.6;
		}

		&--disabled {
			cursor: default;
			opacity: 0.5;

			&:active {
				opacity: 0.5;
			}
		}

		&__icon {
			flex-shrink: 0;
		}

		&__info {
			display: flex;
			align-items: baseline;
			gap: var(--space-sm);
			flex: 1;
		}

		&__count {
			font-size: var(--font-size-4xl);
			font-weight: var(--font-weight-extrabold);
			letter-spacing: var(--letter-spacing-tight);
			line-height: var(--line-height-tight);
			background: var(--color-primary-gradient);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		&__label {
			font-size: var(--font-size-base);
			color: var(--color-text-secondary);
		}

		&__action {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-primary);
			white-space: nowrap;
		}
	}

	.pass-list {
		display: flex;
		flex-direction: column;
	}

	.pass-divider {
		height: 1px;
		background-color: var(--color-divider);
		margin: var(--space-md) 0;
	}

	.pass-card {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__name {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			font-weight: var(--font-weight-semibold);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__ticket-badge {
			padding: 2px 6px;
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-warning);
			background: var(--color-warning-bg);
			border-radius: var(--radius-full);
		}

		&__instructor {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-sm);
		}

		&__progress {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-xs);
		}

		&__remaining {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			white-space: nowrap;
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__holding-btn {
			margin-top: var(--space-sm);
			padding: 6px 12px;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-primary);
			background: var(--color-primary-bg);
			border: none;
			border-radius: var(--radius-sm);
			cursor: pointer;
			transition: all var(--transition-fast);
			align-self: flex-start;

			&:hover {
				background: var(--color-primary-light);
			}

			&:active {
				opacity: 0.7;
			}
		}

		&__holding-status {
			margin-top: var(--space-sm);
			padding: 6px 12px;
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-warning);
			background: var(--color-warning-bg);
			border-radius: var(--radius-sm);
			align-self: flex-start;
		}
	}

	.progress-bar {
		flex: 1;
		height: 8px;
		background-color: var(--color-divider);
		border-radius: var(--radius-full);
		overflow: hidden;

		&__fill {
			height: 100%;
			background: var(--color-primary-gradient);
			border-radius: var(--radius-full);
			transition: width var(--transition-base);
		}
	}

	.notice-list {
		display: flex;
		flex-direction: column;
	}

	.notice-divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.notice-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: 14px 0;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.6;
		}

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
			color: var(--color-text);
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
		}
	}

	.cancel-sheet {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__message {
			font-size: var(--font-size-base);
			color: var(--color-text);
			text-align: center;
		}

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

		&__refund-notice {
			font-size: var(--font-size-sm);
			color: var(--color-warning);
			text-align: center;
			font-weight: var(--font-weight-medium);
		}

		&__noshow-warning {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-danger-bg);
			border-radius: var(--radius-sm);
			text-align: center;
			line-height: 1.5;
		}

		&__buttons {
			display: flex;
			gap: var(--space-sm);
		}
	}
</style>
