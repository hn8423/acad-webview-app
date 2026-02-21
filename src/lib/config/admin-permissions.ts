import type { MemberRole } from '$lib/types/auth';

/**
 * Admin 라우트별 접근 허용 역할 매핑.
 * 역할별 허용 페이지를 변경하려면 이 설정만 수정하면 됨.
 */
const ROUTE_ROLES: Record<string, readonly MemberRole[]> = {
	'/admin/notices': ['ADMIN'],
	'/admin/instructors': ['ADMIN'],
	'/admin/students/*/passes': ['ADMIN'],
	'/admin/students/*/drinks': ['ADMIN'],
	'/admin/students': ['ADMIN', 'INSTRUCTOR'],
	'/admin/feedback': ['ADMIN', 'INSTRUCTOR'],
	'/admin/ensembles': ['ADMIN', 'INSTRUCTOR'],
	'/admin/reservations': ['ADMIN', 'INSTRUCTOR'],
	'/admin/pass-types': ['ADMIN'],
	'/admin/holdings': ['ADMIN'],
	'/admin/nav': ['ADMIN', 'INSTRUCTOR'],
	'/admin/notifications': ['ADMIN', 'INSTRUCTOR']
};

function matchRoute(route: string, pattern: string): boolean {
	if (!pattern.includes('*')) return route.startsWith(pattern);

	const routeSegments = route.split('/');
	const patternSegments = pattern.split('/');
	if (routeSegments.length < patternSegments.length) return false;

	return patternSegments.every((seg, i) => seg === '*' || seg === routeSegments[i]);
}

export function isRouteAllowed(route: string, role: MemberRole | null): boolean {
	if (!role) return false;
	if (route === '/admin' || route === '/admin/') return true;

	const matches = Object.entries(ROUTE_ROLES).filter(([path]) => matchRoute(route, path));
	if (matches.length === 0) return false;

	const mostSpecific = matches.sort((a, b) => {
		const segDiff = b[0].split('/').length - a[0].split('/').length;
		if (segDiff !== 0) return segDiff;
		const aWildcards = (a[0].match(/\*/g) ?? []).length;
		const bWildcards = (b[0].match(/\*/g) ?? []).length;
		return aWildcards - bWildcards;
	})[0];
	return mostSpecific[1].includes(role);
}
