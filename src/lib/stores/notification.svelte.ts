import { getUnreadCount } from '$lib/api/notification';
import { academyStore } from './academy.svelte';

const POLL_INTERVAL_MS = 30_000;

let unreadCount = $state(0);
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function getNotificationStore() {
	async function fetchUnreadCount(): Promise<void> {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const res = await getUnreadCount(academyId);
			if (res.status && res.data) {
				unreadCount = res.data.unread_count;
			}
		} catch {
			// silent fail — badge is non-critical
		}
	}

	function startPolling(): void {
		stopPolling();
		fetchUnreadCount();
		pollInterval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
	}

	function stopPolling(): void {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	function decrementUnread(): void {
		if (unreadCount > 0) {
			unreadCount = unreadCount - 1;
		}
	}

	function clearUnread(): void {
		unreadCount = 0;
	}

	function clear(): void {
		unreadCount = 0;
		stopPolling();
	}

	return {
		get unreadCount() {
			return unreadCount;
		},
		fetchUnreadCount,
		startPolling,
		stopPolling,
		decrementUnread,
		clearUnread,
		clear
	};
}

export const notificationStore = getNotificationStore();
