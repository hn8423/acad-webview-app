import { describe, it, expect } from 'vitest';
import {
	buildInstructorColorMap,
	getInstructorColorIndex,
	INSTRUCTOR_PALETTE_SIZE,
	NEUTRAL_COLOR_INDEX
} from './instructor-colors';

describe('buildInstructorColorMap', () => {
	it('id 오름차순으로 0부터 인덱스를 부여한다', () => {
		const map = buildInstructorColorMap([7, 3, 5]);
		expect(map.get(3)).toBe(0);
		expect(map.get(5)).toBe(1);
		expect(map.get(7)).toBe(2);
	});

	it('입력 순서와 무관하게 같은 목록이면 같은 결과를 반환한다', () => {
		const a = buildInstructorColorMap([1, 2, 3]);
		const b = buildInstructorColorMap([3, 1, 2]);
		expect([...a.entries()]).toEqual([...b.entries()]);
	});

	it('중복 id는 제거된다', () => {
		const map = buildInstructorColorMap([2, 2, 4]);
		expect(map.size).toBe(2);
		expect(map.get(2)).toBe(0);
		expect(map.get(4)).toBe(1);
	});

	it('팔레트 크기를 초과하면 wrap-around 한다', () => {
		const ids = Array.from({ length: INSTRUCTOR_PALETTE_SIZE + 2 }, (_, i) => i + 1);
		const map = buildInstructorColorMap(ids);
		expect(map.get(INSTRUCTOR_PALETTE_SIZE + 1)).toBe(0);
		expect(map.get(INSTRUCTOR_PALETTE_SIZE + 2)).toBe(1);
	});

	it('빈 목록이면 빈 Map을 반환한다', () => {
		expect(buildInstructorColorMap([]).size).toBe(0);
	});
});

describe('getInstructorColorIndex', () => {
	const colorMap = buildInstructorColorMap([3, 5]);

	it('목록에 있는 강사는 해당 인덱스를 반환한다', () => {
		expect(getInstructorColorIndex(3, colorMap)).toBe(0);
		expect(getInstructorColorIndex(5, colorMap)).toBe(1);
	});

	it('null이면 중립 인덱스를 반환한다', () => {
		expect(getInstructorColorIndex(null, colorMap)).toBe(NEUTRAL_COLOR_INDEX);
	});

	it('목록에 없는 id면 중립 인덱스를 반환한다', () => {
		expect(getInstructorColorIndex(99, colorMap)).toBe(NEUTRAL_COLOR_INDEX);
	});
});
