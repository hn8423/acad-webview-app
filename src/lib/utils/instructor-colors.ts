export const INSTRUCTOR_PALETTE_SIZE = 8;

export const NEUTRAL_COLOR_INDEX = -1;

/**
 * 강사 id 목록 → Map<instructor_id, 팔레트 인덱스(0~7)>.
 * 학원 전체 강사 목록(id 오름차순) 기준으로 인덱스를 부여하므로
 * 월 이동/필터와 무관하게 같은 강사는 항상 같은 색을 갖는다.
 */
export function buildInstructorColorMap(instructorIds: number[]): Map<number, number> {
	const sorted = [...new Set(instructorIds)].sort((a, b) => a - b);
	return new Map(sorted.map((id, index) => [id, index % INSTRUCTOR_PALETTE_SIZE]));
}

/**
 * 강사 id → 팔레트 인덱스. 목록에 없거나 null이면 중립색(-1).
 */
export function getInstructorColorIndex(
	instructorId: number | null,
	colorMap: Map<number, number>
): number {
	if (instructorId === null) return NEUTRAL_COLOR_INDEX;
	return colorMap.get(instructorId) ?? NEUTRAL_COLOR_INDEX;
}
