import type { NavItem, NavFeature } from '$lib/types/academy';
import type { MemberRole } from '$lib/types/auth';
import { isRouteAllowed } from './admin-permissions';

/**
 * feature_key → 라우트 경로 매핑.
 * 새 feature_key가 추가되면 여기에 한 줄만 추가하면 됨.
 */
export const FEATURE_ROUTE_MAP: Record<string, string> = {
	NOTICE_MANAGING: '/admin/notices',
	INSTRUCTOR_MANAGING: '/admin/instructors',
	STUDENT_MANAGING: '/admin/students',
	WEEKLY_FEEDBACK_SHEET_MANAGING: '/admin/feedback/new-weekly',
	MONTHLY_FEEDBACK_SHEET_MANAGING: '/admin/feedback/new-monthly',
	RESERVATION_MANAGING: '/admin/reservations',
	PASS_TYPE_MANAGING: '/admin/pass-types',
	HOLDING_MANAGING: '/admin/holdings',
	SCHEDULE_ALERM_MANAGING: '/admin/scheduled-alarms'
};

/**
 * feature_key → SVG path data 매핑.
 */
export const FEATURE_ICON_MAP: Record<string, string> = {
	NOTICE_MANAGING:
		'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
	INSTRUCTOR_MANAGING: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
	STUDENT_MANAGING:
		'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
	WEEKLY_FEEDBACK_SHEET_MANAGING:
		'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
	MONTHLY_FEEDBACK_SHEET_MANAGING:
		'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
	RESERVATION_MANAGING:
		'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
	PASS_TYPE_MANAGING:
		'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
	HOLDING_MANAGING: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z',
	SCHEDULE_ALERM_MANAGING:
		'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
};

const DEFAULT_ICON = 'M4 6h16M4 12h16M4 18h16';

export function getFeatureRoute(featureKey: string): string | null {
	return FEATURE_ROUTE_MAP[featureKey] ?? null;
}

export function getFeatureIcon(featureKey: string): string {
	return FEATURE_ICON_MAP[featureKey] ?? DEFAULT_ICON;
}

/**
 * NavItem에서 활성화 + 라우트 매핑 + 역할 권한이 있는 feature 배열 반환.
 */
export function getAccessibleFeatures(navItem: NavItem, role: MemberRole | null): NavFeature[] {
	return navItem.features.filter((feature) => {
		if (!feature.is_enabled) return false;
		const route = FEATURE_ROUTE_MAP[feature.feature_key];
		if (!route) return false;
		return isRouteAllowed(route, role);
	});
}

/**
 * 단일 feature nav의 직접 라우트 반환. 복수 feature면 null.
 */
export function getSingleFeatureRoute(navItem: NavItem, role: MemberRole | null): string | null {
	const features = getAccessibleFeatures(navItem, role);
	if (features.length !== 1) return null;
	return FEATURE_ROUTE_MAP[features[0].feature_key] ?? null;
}

export function isIconUrl(icon: string): boolean {
	return icon.startsWith('http://') || icon.startsWith('https://');
}
