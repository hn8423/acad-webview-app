import type { MemberRole } from '$lib/types/auth';

/**
 * Admin 라우트별 접근 허용 역할 매핑.
 * 역할별 허용 페이지를 변경하려면 이 설정만 수정하면 됨.
 */
const ROUTE_ROLES: Record<string, readonly MemberRole[]> = {
	'/admin/notices': ['ADMIN'],
	'/admin/instructors': ['ADMIN'],
	'/admin/students': ['ADMIN', 'INSTRUCTOR'],
	'/admin/feedback': ['ADMIN', 'INSTRUCTOR'],
	'/admin/ensembles': ['ADMIN', 'INSTRUCTOR'],
	'/admin/reservations': ['ADMIN', 'INSTRUCTOR'],
	'/admin/pass-types': ['ADMIN'],
	'/admin/holdings': ['ADMIN']
};

export function isRouteAllowed(route: string, role: MemberRole | null): boolean {
	if (!role) return false;
	if (route === '/admin' || route === '/admin/') return true;

	const entry = Object.entries(ROUTE_ROLES).find(([path]) => route.startsWith(path));
	if (!entry) return false;
	return entry[1].includes(role);
}
