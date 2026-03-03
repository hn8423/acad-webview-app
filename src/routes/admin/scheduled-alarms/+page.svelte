<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import {
		getScheduledAlarms,
		deleteScheduledAlarm,
		toggleScheduledAlarm
	} from '$lib/api/scheduled-alarm';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { formatTime, formatDate } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { ScheduledAlarm } from '$lib/types/scheduled-alarm';
	import { onMount } from 'svelte';

	const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
	const LIMIT = 10;

	let alarms = $state<ScheduledAlarm[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let deleteTarget = $state<ScheduledAlarm | null>(null);
	let showDeleteModal = $state(false);

	onMount(() => fetchAlarms());

	async function fetchAlarms() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getScheduledAlarms(academyId, currentPage, LIMIT);
			if (res.status && res.data) {
				alarms = res.data.list;
				totalPages = Math.ceil(res.data.meta.total / LIMIT);
			}
		} catch {
			// error handled by client.ts toast
		} finally {
			loading = false;
		}
	}

	function formatScheduleLabel(alarm: ScheduledAlarm): string {
		const time = formatTime(alarm.schedule_time);
		switch (alarm.schedule_type) {
			case 'DAILY':
				return `매일 ${time}`;
			case 'WEEKLY':
				return `매주 ${DAY_LABELS[alarm.schedule_day ?? 0]}요일 ${time}`;
			case 'MONTHLY_START':
				return `매월 ${alarm.schedule_day}일 ${time}`;
			case 'MONTHLY_END':
				return `매월 말일 ${time}`;
			default:
				return time;
		}
	}

	function confirmDelete(alarm: ScheduledAlarm) {
		deleteTarget = alarm;
		showDeleteModal = true;
	}

	async function handleDelete() {
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		try {
			await deleteScheduledAlarm(academyId, deleteTarget.id);
			showDeleteModal = false;
			deleteTarget = null;
			await fetchAlarms();
		} catch {
			// error handled by client.ts toast
		}
	}

	async function handleToggle(alarm: ScheduledAlarm) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const res = await toggleScheduledAlarm(academyId, alarm.id);
			if (res.status) {
				alarms = alarms.map((a) =>
					a.id === alarm.id ? { ...a, is_active: res.data.is_active } : a
				);
			}
		} catch {
			// error handled by client.ts toast
		}
	}

	async function handlePageChange(page: number) {
		currentPage = page;
		await fetchAlarms();
	}
</script>

<div class="scheduled-alarms">
	<div class="scheduled-alarms__header">
		<h1 class="scheduled-alarms__title">정기 알림 관리</h1>
		<Button size="sm" onclick={() => goto('/admin/scheduled-alarms/new')}>새 알림 등록</Button>
	</div>

	{#if loading}
		<div class="scheduled-alarms__loading">
			<Spinner />
		</div>
	{:else if alarms.length === 0}
		<p class="scheduled-alarms__empty">등록된 정기 알림이 없습니다.</p>
	{:else}
		<div class="alarm-list">
			{#each alarms as alarm, i}
				<div class="alarm-row" role="listitem">
					<div
						class="alarm-row__left"
						role="button"
						tabindex="0"
						onclick={() => goto(`/admin/scheduled-alarms/${alarm.id}`)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(`/admin/scheduled-alarms/${alarm.id}`);
							}
						}}
					>
						<div class="alarm-row__info">
							<h3 class="alarm-row__title">{alarm.title}</h3>
							<span class="alarm-row__schedule">{formatScheduleLabel(alarm)}</span>
							{#if alarm.next_send_at}
								<span class="alarm-row__next">
									다음 발송: {formatDate(alarm.next_send_at)}
								</span>
							{/if}
						</div>
					</div>
					<div class="alarm-row__right">
						<button
							class="toggle-switch"
							class:toggle-switch--active={alarm.is_active}
							onclick={() => handleToggle(alarm)}
							aria-label={alarm.is_active ? '비활성화' : '활성화'}
						>
							<span class="toggle-switch__thumb"></span>
						</button>
						<button
							class="alarm-row__delete"
							onclick={() => confirmDelete(alarm)}
							aria-label="삭제"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
				</div>
				{#if i < alarms.length - 1}
					<div class="alarm-list__divider"></div>
				{/if}
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
					<button
						class="pagination__btn"
						class:pagination__btn--active={pageNum === currentPage}
						onclick={() => handlePageChange(pageNum)}
					>
						{pageNum}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<Modal isOpen={showDeleteModal} title="정기 알림 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">"{deleteTarget?.title}" 알림을 삭제하시겠습니까?</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<style lang="scss">
	.scheduled-alarms {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-lg);
		}

		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			color: var(--color-text);
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

	.alarm-list {
		display: flex;
		flex-direction: column;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.alarm-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.alarm-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) 0;

		&__left {
			flex: 1;
			min-width: 0;
			cursor: pointer;
		}

		&__info {
			display: flex;
			flex-direction: column;
			gap: var(--space-2xs);
		}

		&__title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: var(--color-text);
		}

		&__schedule {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
		}

		&__next {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__right {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			flex-shrink: 0;
		}

		&__delete {
			color: var(--color-text-muted);
			padding: 6px;
			border-radius: var(--radius-sm);
			transition: all var(--transition-fast);

			&:hover {
				color: var(--color-danger);
				background-color: var(--color-danger-bg);
			}
		}
	}

	.toggle-switch {
		position: relative;
		width: 44px;
		height: 24px;
		border-radius: var(--radius-full);
		background-color: var(--color-border);
		transition: background-color var(--transition-fast);
		cursor: pointer;

		&--active {
			background-color: var(--color-primary);
		}

		&__thumb {
			position: absolute;
			top: 2px;
			left: 2px;
			width: 20px;
			height: 20px;
			border-radius: var(--radius-full);
			background-color: var(--color-white);
			transition: transform var(--transition-fast);
			box-shadow: var(--shadow-sm);
		}

		&--active &__thumb {
			transform: translateX(20px);
		}
	}

	.pagination {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);

		&__btn {
			width: 36px;
			height: 36px;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			transition: all var(--transition-fast);

			&:hover {
				background-color: var(--color-bg);
			}

			&--active {
				background-color: var(--color-primary);
				color: var(--color-white);
				font-weight: var(--font-weight-semibold);
			}
		}
	}

	.modal-message {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		line-height: var(--line-height-base);
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}
</style>
