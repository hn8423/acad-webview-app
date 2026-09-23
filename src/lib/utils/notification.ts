import type { Notification, NotificationType } from '$lib/types/notification';

export interface NotificationTypeBadge {
	label: string;
	variant: 'success' | 'warning' | 'info' | 'neutral';
}

/**
 * 관리자 알림을 탭했을 때 이동할 경로.
 * reference_id/reference_type 은 백엔드가 채우며, 매핑이 없는 알림은 목록에 머문다.
 */
export function getAdminNotificationRoute(notification: Notification): string | null {
	const { reference_id, reference_type } = notification;
	if (!reference_id || !reference_type) return null;

	switch (reference_type) {
		case 'SUGGESTION':
			return `/admin/suggestions/${reference_id}`;
		case 'FEEDBACK':
			return `/admin/feedback/${reference_id}`;
		case 'LESSON':
			return '/admin/reservations';
		default:
			return null;
	}
}

/** 알림 목록의 타입 배지. 매핑이 없는 타입은 '일반'으로 묶는다. */
export function getNotificationTypeBadge(type: NotificationType): NotificationTypeBadge {
	switch (type) {
		case 'SUGGESTION_CREATED':
			return { label: '건의', variant: 'info' };
		case 'RESERVATION':
			return { label: '예약', variant: 'warning' };
		case 'FEEDBACK':
			return { label: '피드백', variant: 'success' };
		default:
			return { label: '일반', variant: 'neutral' };
	}
}
