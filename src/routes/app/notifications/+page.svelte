<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import { getNotifications, markAsRead, markAllAsRead } from '$lib/api/notification';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { getRelativeTime } from '$lib/utils/format';
	import type { Notification, NotificationType } from '$lib/types/notification';

	const LIMIT = 20;

	let notifications = $state<Notification[]>([]);
	let loading = $state(true);
	let markingAllRead = $state(false);
	let currentPage = $state(1);
	let totalPages = $state(1);

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
				goto(`/app/feedback/${notification.reference_id}`);
			} else if (notification.reference_type === 'LESSON') {
				goto('/app/reservation');
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

<div class="notifications-page">
	<BackHeader title="알림" />

	<div class="notifications-page__content">
		{#if loading}
			<div class="notifications-page__loading">
				<Spinner />
			</div>
		{:else if notifications.length === 0}
			<p class="notifications-page__empty">알림이 없습니다.</p>
		{:else}
			{#if hasUnread}
				<div class="notifications-page__actions">
					<button
						type="button"
						class="notifications-page__read-all"
						disabled={markingAllRead}
						onclick={handleMarkAllRead}
					>
						모두 읽음 처리
					</button>
				</div>
			{/if}

			<div class="notification-list">
				{#each notifications as notification, i}
					<button
						type="button"
						class="notification-row"
						class:notification-row--unread={!notification.is_read}
						onclick={() => handleNotificationClick(notification)}
					>
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
					</button>
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
</div>

<style lang="scss">
	.notifications-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
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

		&__actions {
			display: flex;
			justify-content: flex-end;
			margin-bottom: var(--space-sm);
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
	}

	.notification-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		overflow: hidden;

		&__divider {
			height: 1px;
			background-color: var(--color-divider);
			margin-left: var(--space-md);
		}
	}

	.notification-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-md);
		width: 100%;
		text-align: left;
		background: none;
		border: none;
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
				color: var(--color-on-primary);
			}
		}
	}
</style>
