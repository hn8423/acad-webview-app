import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InstructorStatsModal from './InstructorStatsModal.svelte';
import { getInstructorStats } from '$lib/api/member';

vi.mock('$lib/api/member', () => ({ getInstructorStats: vi.fn() }));
vi.mock('$lib/stores/academy.svelte', () => ({ academyStore: { academyId: 1 } }));

const mockedGetStats = vi.mocked(getInstructorStats);

describe('InstructorStatsModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('정산용으로 월 총 완료·총 노쇼 건수를 보여준다', async () => {
		mockedGetStats.mockResolvedValue({
			status: true,
			message: '',
			data: {
				instructor_name: '김강사',
				year: 2026,
				month: 10,
				total_lessons: 37,
				completed_lessons: 0,
				cancelled_lessons: 0,
				no_show_count: 4,
				total_students: 9,
				lessons_by_category: {},
				self_same_day_cancelled_count: 0
			}
		});

		render(InstructorStatsModal, {
			isOpen: true,
			instructor: { id: 5, name: '김강사' },
			onclose: vi.fn()
		});

		await expect.element(page.getByText('총 완료')).toBeInTheDocument();
		await expect.element(page.getByText('37')).toBeInTheDocument();
		await expect.element(page.getByText('총 노쇼')).toBeInTheDocument();
		await expect.element(page.getByText('4', { exact: true })).toBeInTheDocument();
	});
});
