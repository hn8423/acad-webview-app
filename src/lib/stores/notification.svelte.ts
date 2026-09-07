import { getUnreadCount } from '$lib/api/notification';
import { academyStore } from './academy.svelte';
import { pushStore } from './push.svelte';

const POLL_INTERVAL_MS = 30_000;

let unreadCount = $state(0);
let pollInterval: ReturnType<typeof setInterval> | null = null;

/** 미읽음 개수는 앱 아이콘 배지와 항상 같이 움직여야 한다. */
function setUnreadCount(next: number): void {
	// 30초마다 도는 폴링이 같은 값으로 네이티브를 왕복하지 않도록 변화가 있을 때만 알린다.
	if (next === unreadCount) return;

	unreadCount = next;
	pushStore.syncBadge(next);
}

export function getNotificationStore() {
	async function fetchUnreadCount(): Promise<void> {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		try {
			const res = await getUnreadCount(academyId);
			if (res.status && res.data) {
				setUnreadCount(res.data.unread_count);
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
			setUnreadCount(unreadCount - 1);
		}
	}

	function clearUnread(): void {
		setUnreadCount(0);
	}

	function clear(): void {
		setUnreadCount(0);
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
