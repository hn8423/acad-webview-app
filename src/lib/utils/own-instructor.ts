import { getInstructors } from '$lib/api/member';
import type { Instructor } from '$lib/types/member';

type InstructorListPayload = Instructor[] | { instructors?: Instructor[] } | null | undefined;

export function resolveOwnInstructorId(
	data: InstructorListPayload,
	memberId: number
): number | null {
	if (!data) return null;
	const list = Array.isArray(data) ? data : (data.instructors ?? []);
	const self = list.find((inst) => inst.member_id === memberId);
	if (!self) return null;
	return self.instructor_id ?? self.id ?? null;
}

const cache = new Map<string, number>();

// null = 본인 강사 레코드 없음(확정), API 실패는 throw. 성공 결과만 캐싱.
export async function findOwnInstructorId(
	academyId: number,
	memberId: number
): Promise<number | null> {
	const key = `${academyId}:${memberId}`;
	const cached = cache.get(key);
	if (cached !== undefined) return cached;

	const res = await getInstructors(academyId);
	if (!res.status) {
		throw new Error(res.message || '강사 목록을 불러오는데 실패했습니다.');
	}

	const resolved = resolveOwnInstructorId(res.data, memberId);
	if (resolved !== null) {
		cache.set(key, resolved);
	}
	return resolved;
}

export function clearOwnInstructorCache(): void {
	cache.clear();
}
