<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getEnsembleDetail,
		applyToEnsemble,
		acceptMember,
		rejectMember,
		leaveEnsemble
	} from '$lib/api/ensemble';
	import { sendNotification } from '$lib/api/notification';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import EnsembleChat from '$lib/components/ensemble/EnsembleChat.svelte';
	import EnsembleApplyModal from '$lib/components/ensemble/EnsembleApplyModal.svelte';
	import { formatDate } from '$lib/utils/format';
	import { z } from 'zod';
	import type { EnsembleDetail } from '$lib/types/ensemble';

	const ensembleId = $derived(Number(page.params.id));
	const roleSchema = z.string().trim().min(1, '파트를 입력해주세요').max(20, '20자 이내');

	let ensemble = $state<EnsembleDetail | null>(null);
	let loading = $state(true);
	let loadError = $state(false);
	let showApplyModal = $state(false);
	let submittingApply = $state(false);

	let acceptingMemberId = $state<number | null>(null);
	let acceptRole = $state('');
	let submittingAccept = $state(false);

	let confirmAction = $state<{
		type: 'reject' | 'leave' | 'cancel';
		message: string;
		targetId: number;
	} | null>(null);
	let processingConfirm = $state(false);

	let isLeader = $derived(
		ensemble !== null && ensemble.creator.member_id === academyStore.memberId
	);
	let myMembership = $derived(ensemble?.members.find((m) => m.member_id === academyStore.memberId));
	let isPending = $derived(myMembership?.member_status === 'PENDING');
	let isMember = $derived(
		myMembership?.member_status === 'MEMBER' || myMembership?.member_status === 'LEADER'
	);
	let canApply = $derived(!myMembership && ensemble?.status === 'RECRUITING');
	let pendingMembers = $derived(
		ensemble?.members.filter((m) => m.member_status === 'PENDING') ?? []
	);
	let activeMembers = $derived(
		ensemble?.members.filter((m) => m.member_status !== 'PENDING') ?? []
	);

	onMount(() => {
		fetchData();
	});

	async function fetchData() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		loadError = false;
		showApplyModal = false;
		acceptingMemberId = null;
		confirmAction = null;

		try {
			const res = await getEnsembleDetail(academyId, ensembleId);
			if (res.status) {
				ensemble = res.data;
			} else {
				loadError = true;
			}
		} catch {
			loadError = true;
		} finally {
			loading = false;
		}
	}

	async function handleApply(data: { role: string; introduction?: string }) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		submittingApply = true;
		try {
			const res = await applyToEnsemble(academyId, ensembleId, {
				role: data.role,
				...(data.introduction ? { introduction: data.introduction } : {})
			});
			if (res.status) {
				toastStore.success('참가 신청이 완료되었습니다.');
				showApplyModal = false;
				await fetchData();
			}
		} catch {
			// API client handles toast
		} finally {
			submittingApply = false;
		}
	}

	function startAccept(memberId: number, currentRole: string) {
		acceptingMemberId = memberId;
		acceptRole = currentRole;
	}

	function cancelAccept() {
		acceptingMemberId = null;
		acceptRole = '';
	}

	async function confirmAccept() {
		if (acceptingMemberId === null) return;

		const parsed = roleSchema.safeParse(acceptRole);
		if (!parsed.success) {
			toastStore.error(parsed.error.issues[0].message);
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		submittingAccept = true;
		try {
			const res = await acceptMember(academyId, ensembleId, acceptingMemberId, {
				role: parsed.data
			});
			if (res.status) {
				toastStore.success('멤버를 수락했습니다.');
				sendNotification(academyId, {
					recipient_member_ids: [acceptingMemberId],
					title: '합주조 참가 승인',
					content: `${ensemble?.group_name ?? '합주조'}에 참가가 승인되었습니다.`,
					notification_type: 'GENERAL'
				}).catch(() => {});
				acceptingMemberId = null;
				acceptRole = '';
				await fetchData();
			}
		} catch {
			// API client handles toast
		} finally {
			submittingAccept = false;
		}
	}

	function requestReject(memberId: number) {
		confirmAction = {
			type: 'reject',
			message: '신청을 거절하시겠습니까?',
			targetId: memberId
		};
	}

	function requestCancelApplication() {
		confirmAction = {
			type: 'cancel',
			message: '참가 신청을 취소하시겠습니까?',
			targetId: ensembleId
		};
	}

	function requestLeave() {
		const message = isLeader
			? '방장이 나가면 합주조가 취소됩니다. 정말 나가시겠습니까?'
			: '합주조에서 나가시겠습니까?';
		confirmAction = { type: 'leave', message, targetId: ensembleId };
	}

	async function executeConfirmAction() {
		if (!confirmAction) return;

		const academyId = academyStore.academyId;
		if (!academyId) return;

		processingConfirm = true;
		try {
			if (confirmAction.type === 'reject') {
				const rejectedMemberId = confirmAction.targetId;
				const res = await rejectMember(academyId, ensembleId, rejectedMemberId);
				if (res.status) {
					toastStore.success('신청을 거절했습니다.');
					sendNotification(academyId, {
						recipient_member_ids: [rejectedMemberId],
						title: '합주조 참가 거절',
						content: `${ensemble?.group_name ?? '합주조'} 참가 신청이 거절되었습니다.`,
						notification_type: 'GENERAL'
					}).catch(() => {});
					confirmAction = null;
					await fetchData();
				}
			} else if (confirmAction.type === 'cancel') {
				const res = await leaveEnsemble(academyId, ensembleId);
				if (res.status) {
					toastStore.success('참가 신청이 취소되었습니다.');
					confirmAction = null;
					await fetchData();
				}
			} else if (confirmAction.type === 'leave') {
				const res = await leaveEnsemble(academyId, ensembleId);
				if (res.status) {
					toastStore.success('합주조에서 나갔습니다.');
					goto('/app/ensemble');
				}
			}
		} catch {
			// API client handles toast
		} finally {
			processingConfirm = false;
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'RECRUITING':
				return '모집중';
			case 'FULL':
				return '마감';
			case 'CANCELLED':
				return '취소';
			default:
				return status;
		}
	}

	function getStatusVariant(status: string) {
		switch (status) {
			case 'RECRUITING':
				return 'success' as const;
			case 'FULL':
				return 'warning' as const;
			case 'CANCELLED':
				return 'neutral' as const;
			default:
				return 'neutral' as const;
		}
	}

	function getMemberStatusVariant(status: string) {
		switch (status) {
			case 'LEADER':
				return 'info' as const;
			case 'PENDING':
				return 'warning' as const;
			default:
				return 'neutral' as const;
		}
	}
</script>

<div class="ensemble-detail-page">
	<BackHeader title={ensemble?.group_name ?? '합주조'} />

	<div class="ensemble-detail-page__content">
		{#if loading}
			<div class="ensemble-detail-page__loading">
				<Spinner />
			</div>
		{:else if loadError}
			<p class="ensemble-detail-page__empty">합주조 정보를 불러오지 못했습니다.</p>
		{:else if ensemble}
			<div class="detail">
				<!-- Confirm Dialog -->
				{#if confirmAction}
					<div class="confirm-dialog">
						<p class="confirm-dialog__message">{confirmAction.message}</p>
						<div class="confirm-dialog__buttons">
							<Button
								size="sm"
								variant="secondary"
								onclick={() => (confirmAction = null)}
								disabled={processingConfirm}
							>
								취소
							</Button>
							<Button
								size="sm"
								variant="danger"
								loading={processingConfirm}
								onclick={executeConfirmAction}
							>
								확인
							</Button>
						</div>
					</div>
				{/if}

				<!-- Group Info -->
				<section class="detail__section">
					<div class="detail__info-row">
						<Badge variant={getStatusVariant(ensemble.status)}>
							{getStatusLabel(ensemble.status)}
						</Badge>
						<span class="detail__meta">
							{activeMembers.length}/{ensemble.max_members}명
						</span>
					</div>
					{#if ensemble.description}
						<p class="detail__description">{ensemble.description}</p>
					{/if}
					<div class="detail__meta-list">
						<span class="detail__meta">방장: {ensemble.creator.user_name}</span>
						{#if ensemble.practice_date}
							<span class="detail__meta">
								연습: {formatDate(ensemble.practice_date)}
								{ensemble.practice_time ?? ''}
							</span>
						{/if}
					</div>
				</section>

				<!-- Members -->
				<section class="detail__section">
					<h3 class="detail__section-title">멤버</h3>
					<div class="member-list">
						{#each activeMembers as member}
							<div class="member-item">
								<div class="member-item__info">
									<span class="member-item__name">{member.user_name}</span>
									<Badge variant={getMemberStatusVariant(member.member_status)}>
										{member.member_status === 'LEADER' ? '방장' : member.role}
									</Badge>
								</div>
							</div>
						{/each}
					</div>
				</section>

				<!-- Pending Members (Leader only) -->
				{#if isLeader && pendingMembers.length > 0}
					<section class="detail__section">
						<h3 class="detail__section-title">참가 신청 ({pendingMembers.length})</h3>
						<div class="member-list">
							{#each pendingMembers as member}
								<div class="member-item member-item--pending">
									<div class="member-item__info">
										<span class="member-item__name">{member.user_name}</span>
										<span class="member-item__role">{member.role}</span>
									</div>
									{#if member.introduction}
										<p class="member-item__introduction">{member.introduction}</p>
									{/if}
									{#if acceptingMemberId === member.member_id}
										<div class="member-item__accept-form">
											<input
												class="member-item__role-input"
												type="text"
												placeholder="파트"
												bind:value={acceptRole}
												maxlength={20}
											/>
											<Button
												size="sm"
												variant="primary"
												loading={submittingAccept}
												onclick={confirmAccept}
											>
												확인
											</Button>
											<Button size="sm" variant="secondary" onclick={cancelAccept}>취소</Button>
										</div>
									{:else}
										<div class="member-item__actions">
											<Button
												size="sm"
												variant="primary"
												onclick={() => startAccept(member.member_id, member.role)}
											>
												수락
											</Button>
											<Button
												size="sm"
												variant="danger"
												onclick={() => requestReject(member.member_id)}
											>
												거절
											</Button>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Chat -->
				<EnsembleChat {ensembleId} {isMember} />

				<!-- Action Buttons -->
				<section class="detail__actions">
					{#if canApply}
						<Button fullWidth onclick={() => (showApplyModal = true)}>참가 신청</Button>
					{:else if isPending}
						<div class="detail__pending-actions">
							<p class="detail__status-text">참가 신청 대기중입니다.</p>
							<Button fullWidth variant="danger" onclick={requestCancelApplication}
								>신청 취소</Button
							>
						</div>
					{:else if isMember}
						<Button fullWidth variant="danger" onclick={requestLeave}>나가기</Button>
					{/if}
				</section>
			</div>
		{/if}
	</div>
</div>

<EnsembleApplyModal
	isOpen={showApplyModal}
	onclose={() => (showApplyModal = false)}
	onsubmit={handleApply}
	submitting={submittingApply}
/>

<style lang="scss">
	.ensemble-detail-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md)
				calc(var(--bottom-nav-height) + var(--space-lg));
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

	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__section {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}

		&__section-title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__info-row {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__description {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			line-height: 1.5;
			white-space: pre-wrap;
		}

		&__meta-list {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		&__meta {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
		}

		&__actions {
			padding-top: var(--space-sm);
		}

		&__status-text {
			text-align: center;
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			padding: var(--space-md) 0;
		}

		&__pending-actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			align-items: center;
		}
	}

	.confirm-dialog {
		background-color: var(--color-warning-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&__message {
			font-size: var(--font-size-sm);
			color: var(--color-text);
			text-align: center;
		}

		&__buttons {
			display: flex;
			gap: var(--space-sm);
			justify-content: center;
		}
	}

	.member-list {
		display: flex;
		flex-direction: column;
	}

	.member-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 0;
		border-bottom: 1px solid var(--color-divider);

		&:last-child {
			border-bottom: none;
		}

		&--pending {
			flex-wrap: wrap;
			gap: var(--space-sm);
		}

		&__info {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__name {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__role {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__introduction {
			width: 100%;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.4;
			padding: var(--space-xs) 0;
		}

		&__actions {
			display: flex;
			gap: 6px;
		}

		&__accept-form {
			display: flex;
			align-items: center;
			gap: 6px;
			width: 100%;
		}

		&__role-input {
			flex: 1;
			padding: 8px 12px;
			border: none;
			border-radius: var(--radius-md);
			font-size: var(--font-size-sm);
			color: var(--color-text);
			background-color: var(--color-bg);
			outline: none;

			&:focus {
				background-color: var(--color-primary-bg);
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}
	}
</style>
