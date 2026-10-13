import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InstructorsPage from './+page.svelte';
import { getInstructors, getInstructorStats } from '$lib/api/member';
import type { Instructor } from '$lib/types/member';

vi.mock('$lib/api/member', () => ({
	getInstructors: vi.fn(),
	getInstructorStats: vi.fn(),
	createInstructor: vi.fn(),
	getMembers: vi.fn(),
	getInstructorDetail: vi.fn(),
	updateInstructor: vi.fn(),
	deleteInstructor: vi.fn()
}));
vi.mock('$lib/api/reservation', () => ({ getInstructorUpcomingSlots: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const mockedGetInstructors = vi.mocked(getInstructors);
const mockedGetStats = vi.mocked(getInstructorStats);

function makeInstructor(id: number, name: string, isWithdrawn = false): Instructor {
	return {
		instructor_id: id,
		member_id: id * 10,
		user_name: name,
		profile_img: '',
		specialties: '',
		introduction: '',
		is_admin: 0,
		student_count: 0,
		is_withdrawn: isWithdrawn
	};
}

function listResponse(list: Instructor[]) {
	return { status: true, message: '', data: list };
}

describe('/admin/instructors — 해제된 강사', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('기본은 해제 강사를 요청하지 않는다', async () => {
		mockedGetInstructors.mockResolvedValue(listResponse([makeInstructor(1, '활성강사')]));

		render(InstructorsPage);

		await expect.element(page.getByText('활성강사')).toBeInTheDocument();
		expect(mockedGetInstructors).toHaveBeenCalledWith(1, { includeWithdrawn: false });
	});

	it('토글을 켜면 해제 강사를 배지와 함께 보여주고 수정·탈퇴 버튼은 숨긴다', async () => {
		mockedGetInstructors
			.mockResolvedValueOnce(listResponse([makeInstructor(1, '활성강사')]))
			.mockResolvedValueOnce(
				listResponse([makeInstructor(1, '활성강사'), makeInstructor(2, '해제강사', true)])
			);

		render(InstructorsPage);
		await expect.element(page.getByText('활성강사')).toBeInTheDocument();

		await page.getByRole('checkbox', { name: '해제된 강사 보기' }).click();

		await expect.element(page.getByText('해제강사')).toBeInTheDocument();
		expect(mockedGetInstructors).toHaveBeenLastCalledWith(1, { includeWithdrawn: true });
		await expect.element(page.getByText('해제됨')).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '해제강사 강사 통계 보기' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '해제강사 강사 정보 수정' }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '해제강사 강사 탈퇴' }))
			.not.toBeInTheDocument();
	});

	it('해제 강사 통계 버튼은 그 강사 id로 월별 통계를 조회한다', async () => {
		mockedGetInstructors
			.mockResolvedValueOnce(listResponse([]))
			.mockResolvedValueOnce(listResponse([makeInstructor(2, '해제강사', true)]));
		mockedGetStats.mockResolvedValue({
			status: true,
			message: '',
			data: {
				instructor_name: '해제강사',
				year: 2026,
				month: 10,
				total_lessons: 0,
				completed_lessons: 0,
				cancelled_lessons: 0,
				no_show_count: 0,
				total_students: 0,
				self_same_day_cancelled_count: 0
			}
		});

		render(InstructorsPage);
		await page.getByRole('checkbox', { name: '해제된 강사 보기' }).click();
		await page.getByRole('button', { name: '해제강사 강사 통계 보기' }).click();

		await vi.waitFor(() => expect(mockedGetStats).toHaveBeenCalled());
		expect(mockedGetStats.mock.calls[0][1]).toBe(2);
	});
});
