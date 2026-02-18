<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import {
		getNotifications,
		markAsRead,
		markAllAsRead,
		deleteNotification
	} from '$lib/api/notification';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { getRelativeTime } from '$lib/utils/format';
	import type { Notification, NotificationType } from '$lib/types/notification';

	const LIMIT = 20;

	let notifications = $state<Notification[]>([]);
	let loading = $state(true);
	let markingAllRead = $state(false);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let deleteTarget = $state<Notification | null>(null);
	let showDeleteModal = $state(false);

	let hasUnread = $derived(notifications.some((n) => !n.is_read));

	onMount(() => {
		fetchNotifications();
	});

	async function fetchNotifications() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getNotifications(academyId, currentPage, LIMIT);
			if (res.status && res.data) {
				notifications = res.data.list;
				totalPages = Math.ceil(res.data.meta.total / LIMIT);
			}
		} catch {
			// handled by client.ts toast
		} finally {
			loading = false;
		}
	}

	async function handleNotificationClick(notification: Notification) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		if (!notification.is_read) {
			notifications = notifications.map((n) =>
				n.id === notification.id ? { ...n, is_read: true } : n
			);
			notificationStore.decrementUnread();

			try {
				await markAsRead(academyId, notification.id);
			} catch {
				notifications = notifications.map((n) =>
					n.id === notification.id ? { ...n, is_read: false } : n
				);
				notificationStore.fetchUnreadCount();
			}
		}

		if (notification.reference_id && notification.reference_type) {
			if (notification.reference_type === 'FEEDBACK') {
				goto(`/admin/feedback/${notification.reference_id}`);
			} else if (notification.reference_type === 'LESSON') {
				goto('/admin/reservations');
			}
		}
	}

	async function handleMarkAllRead() {
		const academyId = academyStore.academyId;
		if (!academyId || !hasUnread) return;

		markingAllRead = true;
		try {
			const res = await markAllAsRead(academyId);
			if (res.status) {
				notifications = notifications.map((n) => ({ ...n, is_read: true }));
				notificationStore.clearUnread();
			}
		} catch {
			// handled by client.ts toast
		} finally {
			markingAllRead = false;
		}
	}

	function confirmDelete(e: MouseEvent, notification: Notification) {
		e.stopPropagation();
		deleteTarget = notification;
		showDeleteModal = true;
	}

	async function handleDelete() {
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		try {
			await deleteNotification(academyId, deleteTarget.id);
			showDeleteModal = false;
			deleteTarget = null;
			await fetchNotifications();
			notificationStore.fetchUnreadCount();
		} catch {
			// handled by client.ts toast
		}
	}

	async function goToPage(page: number) {
		currentPage = page;
		await fetchNotifications();
	}

	function getTypeLabel(type: NotificationType): string {
		switch (type) {
			case 'RESERVATION':
				return '예약';
			case 'FEEDBACK':
				return '피드백';
			default:
				return '일반';
		}
	}

	function getTypeBadgeVariant(type: NotificationType): 'success' | 'warning' | 'neutral' {
		switch (type) {
			case 'RESERVATION':
				return 'warning';
			case 'FEEDBACK':
				return 'success';
			default:
				return 'neutral';
		}
	}
</script>

<div class="admin-notifications">
	<div class="admin-notifications__header">
		<h1 class="admin-notifications__title">알림</h1>
		{#if hasUnread}
			<button
				type="button"
				class="admin-notifications__read-all"
				disabled={markingAllRead}
				onclick={handleMarkAllRead}
			>
				모두 읽음 처리
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="admin-notifications__loading">
			<Spinner />
		</div>
	{:else if notifications.length === 0}
		<p class="admin-notifications__empty">알림이 없습니다.</p>
	{:else}
		<div class="notification-list">
			{#each notifications as notification, i}
				<div
					class="notification-row"
					class:notification-row--unread={!notification.is_read}
					role="button"
					tabindex="0"
					onclick={() => handleNotificationClick(notification)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleNotificationClick(notification);
						}
					}}
				>
					<div class="notification-row__main">
						<div class="notification-row__header">
							<Badge variant={getTypeBadgeVariant(notification.notification_type)}>
								{getTypeLabel(notification.notification_type)}
							</Badge>
							{#if !notification.is_read}
								<span class="notification-row__dot"></span>
							{/if}
							<span class="notification-row__time">
								{getRelativeTime(notification.created_at)}
							</span>
						</div>
						<h3 class="notification-row__title">{notification.title}</h3>
						<p class="notification-row__body">{notification.content}</p>
					</div>
					<button
						type="button"
						class="notification-row__delete"
						onclick={(e) => confirmDelete(e, notification)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.stopPropagation();
							}
						}}
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
				{#if i < notifications.length - 1}
					<div class="notification-list__divider"></div>
				{/if}
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
					<button
						class="pagination__btn"
						class:pagination__btn--active={page === currentPage}
						onclick={() => goToPage(page)}
					>
						{page}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<Modal isOpen={showDeleteModal} title="알림 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">이 알림을 삭제하시겠습니까?</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<style lang="scss">
	.admin-notifications {
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

		&__read-all {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
			background: none;
			border: none;
			cursor: pointer;
			padding: var(--space-xs) var(--space-sm);
			border-radius: var(--radius-sm);
			transition: opacity var(--transition-fast);

			&:active {
				opacity: 0.6;
			}

			&:disabled {
				opacity: 0.4;
				cursor: default;
			}
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

	.notification-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: hidden;

		&__divider {
			height: 1px;
			background-color: var(--color-divider);
			margin-left: var(--space-md);
		}
	}

	.notification-row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-md);
		border-left: 4px solid transparent;
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			border-color var(--transition-fast);

		&:active {
			opacity: 0.6;
		}

		&--unread {
			border-left-color: var(--color-primary);
			background-color: var(--color-primary-bg);
		}

		&__main {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__header {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__dot {
			width: 6px;
			height: 6px;
			border-radius: var(--radius-full);
			background-color: var(--color-primary);
			flex-shrink: 0;
		}

		&__time {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-left: auto;
		}

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		&__body {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			line-height: 1.4;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}

		&__delete {
			flex-shrink: 0;
			color: var(--color-text-muted);
			padding: 6px;
			border-radius: var(--radius-sm);
			margin-top: var(--space-2xs);
			transition: all var(--transition-fast);

			&:hover {
				color: var(--color-danger);
				background-color: var(--color-danger-bg);
			}
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
			border-radius: var(--radius-full);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			background: none;
			border: none;
			cursor: pointer;
			transition: all var(--transition-fast);

			&:hover {
				background-color: var(--color-divider);
			}

			&--active {
				background: var(--color-primary-gradient);
				color: var(--color-white);
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
