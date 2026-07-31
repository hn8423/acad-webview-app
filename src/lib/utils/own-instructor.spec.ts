import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	resolveOwnInstructorId,
	findOwnInstructorId,
	clearOwnInstructorCache
} from './own-instructor';
import { getInstructors } from '$lib/api/member';
import type { Instructor } from '$lib/types/member';

vi.mock('$lib/api/member', () => ({
	getInstructors: vi.fn()
}));

const mockedGetInstructors = vi.mocked(getInstructors);

function makeInstructor(overrides: Partial<Instructor> = {}): Instructor {
	return {
		id: 1,
		instructor_id: 10,
		member_id: 100,
		user_name: '강사',
		profile_img: '',
		specialties: '',
		introduction: '',
		is_admin: 0,
		...overrides
	};
}

describe('resolveOwnInstructorId', () => {
	it('should resolve instructor_id from array payload by member_id match', () => {
		const data = [makeInstructor({ member_id: 99 }), makeInstructor({ member_id: 100 })];
		expect(resolveOwnInstructorId(data, 100)).toBe(10);
	});

	it('should resolve from object payload with instructors key', () => {
		const data = { instructors: [makeInstructor({ member_id: 100, instructor_id: 7 })] };
		expect(resolveOwnInstructorId(data, 100)).toBe(7);
	});

	it('should fall back to id when instructor_id is missing', () => {
		const data = [makeInstructor({ member_id: 100, instructor_id: undefined, id: 3 })];
		expect(resolveOwnInstructorId(data, 100)).toBe(3);
	});

	it('should return null when both instructor_id and id are missing', () => {
		const data = [makeInstructor({ member_id: 100, instructor_id: undefined, id: undefined })];
		expect(resolveOwnInstructorId(data, 100)).toBeNull();
	});

	it('should return null when no member_id matches', () => {
		const data = [makeInstructor({ member_id: 99 })];
		expect(resolveOwnInstructorId(data, 100)).toBeNull();
	});

	it('should return null for null or undefined payload', () => {
		expect(resolveOwnInstructorId(null, 100)).toBeNull();
		expect(resolveOwnInstructorId(undefined, 100)).toBeNull();
	});

	it('should return null for object payload with undefined instructors', () => {
		expect(resolveOwnInstructorId({ instructors: undefined }, 100)).toBeNull();
	});
});

describe('findOwnInstructorId', () => {
	beforeEach(() => {
		clearOwnInstructorCache();
		vi.clearAllMocks();
	});

	function mockSuccess(instructors: Instructor[]) {
		mockedGetInstructors.mockResolvedValue({
			status: true,
			message: 'ok',
			data: instructors
		});
	}

	it('should return resolved instructor id on success', async () => {
		mockSuccess([makeInstructor({ member_id: 100, instructor_id: 10 })]);
		await expect(findOwnInstructorId(1, 100)).resolves.toBe(10);
	});

	it('should cache resolved id and skip refetch for same academy and member', async () => {
		mockSuccess([makeInstructor({ member_id: 100, instructor_id: 10 })]);
		await findOwnInstructorId(1, 100);
		await expect(findOwnInstructorId(1, 100)).resolves.toBe(10);
		expect(mockedGetInstructors).toHaveBeenCalledTimes(1);
	});

	it('should fetch separately for different academy or member', async () => {
		mockSuccess([
			makeInstructor({ member_id: 100, instructor_id: 10 }),
			makeInstructor({ member_id: 200, instructor_id: 20 })
		]);
		await expect(findOwnInstructorId(1, 100)).resolves.toBe(10);
		await expect(findOwnInstructorId(1, 200)).resolves.toBe(20);
		await expect(findOwnInstructorId(2, 100)).resolves.toBe(10);
		expect(mockedGetInstructors).toHaveBeenCalledTimes(3);
	});

	it('should throw when response status is false', async () => {
		mockedGetInstructors.mockResolvedValue({
			status: false,
			message: '조회 실패',
			data: []
		});
		await expect(findOwnInstructorId(1, 100)).rejects.toThrow('조회 실패');
	});

	it('should propagate rejection and retry on next call (failure not cached)', async () => {
		mockedGetInstructors.mockRejectedValueOnce(new Error('network'));
		await expect(findOwnInstructorId(1, 100)).rejects.toThrow('network');

		mockSuccess([makeInstructor({ member_id: 100, instructor_id: 10 })]);
		await expect(findOwnInstructorId(1, 100)).resolves.toBe(10);
		expect(mockedGetInstructors).toHaveBeenCalledTimes(2);
	});

	it('should not cache null result and refetch next time', async () => {
		mockSuccess([makeInstructor({ member_id: 999 })]);
		await expect(findOwnInstructorId(1, 100)).resolves.toBeNull();

		mockSuccess([makeInstructor({ member_id: 100, instructor_id: 10 })]);
		await expect(findOwnInstructorId(1, 100)).resolves.toBe(10);
		expect(mockedGetInstructors).toHaveBeenCalledTimes(2);
	});

	it('should refetch after clearOwnInstructorCache', async () => {
		mockSuccess([makeInstructor({ member_id: 100, instructor_id: 10 })]);
		await findOwnInstructorId(1, 100);
		clearOwnInstructorCache();
		await expect(findOwnInstructorId(1, 100)).resolves.toBe(10);
		expect(mockedGetInstructors).toHaveBeenCalledTimes(2);
	});
});
