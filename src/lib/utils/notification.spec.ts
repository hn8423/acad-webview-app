import { describe, expect, it } from 'vitest';
import type { Notification } from '$lib/types/notification';
import { getAdminNotificationRoute, getNotificationTypeBadge } from './notification';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
	return {
		id: 1,
		title: '새 건의사항',
		content: '건의사항이 등록되었습니다: 연습실 예약',
		notification_type: 'SUGGESTION_CREATED',
		is_read: false,
		reference_id: 42,
		reference_type: 'SUGGESTION',
		created_at: '2026-09-23T09:00:00.000Z',
		...overrides
	};
}

describe('getAdminNotificationRoute', () => {
	it('건의사항 알림은 관리자 건의사항 상세로 보낸다', () => {
		expect(getAdminNotificationRoute(makeNotification())).toBe('/admin/suggestions/42');
	});

	it('피드백 알림은 피드백 상세로 보낸다', () => {
		const notification = makeNotification({
			notification_type: 'FEEDBACK',
			reference_type: 'FEEDBACK',
			reference_id: 7
		});
		expect(getAdminNotificationRoute(notification)).toBe('/admin/feedback/7');
	});

	it('수업 알림은 예약 목록으로 보낸다', () => {
		const notification = makeNotification({
			notification_type: 'RESERVATION',
			reference_type: 'LESSON',
			reference_id: 3
		});
		expect(getAdminNotificationRoute(notification)).toBe('/admin/reservations');
	});

	it('reference_id가 없으면 이동하지 않는다', () => {
		expect(getAdminNotificationRoute(makeNotification({ reference_id: null }))).toBeNull();
	});

	it('reference_type이 없거나 이동 대상이 아니면 이동하지 않는다', () => {
		expect(getAdminNotificationRoute(makeNotification({ reference_type: null }))).toBeNull();
		expect(
			getAdminNotificationRoute(
				makeNotification({ notification_type: 'PASS_EXPIRED', reference_type: 'PASS_EXPIRED' })
			)
		).toBeNull();
	});
});

describe('getNotificationTypeBadge', () => {
	it('건의사항 알림은 건의 배지로 표시한다', () => {
		expect(getNotificationTypeBadge('SUGGESTION_CREATED')).toEqual({
			label: '건의',
			variant: 'info'
		});
	});

	it('예약과 피드백 배지는 기존 표시를 유지한다', () => {
		expect(getNotificationTypeBadge('RESERVATION')).toEqual({
			label: '예약',
			variant: 'warning'
		});
		expect(getNotificationTypeBadge('FEEDBACK')).toEqual({
			label: '피드백',
			variant: 'success'
		});
	});

	it('그 외 타입은 일반으로 표시한다', () => {
		expect(getNotificationTypeBadge('GENERAL')).toEqual({ label: '일반', variant: 'neutral' });
		expect(getNotificationTypeBadge('PASS_EXPIRED')).toEqual({
			label: '일반',
			variant: 'neutral'
		});
	});
});
