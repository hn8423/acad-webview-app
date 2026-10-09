import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NewLevelTestPage from './+page.svelte';
import { getMembers } from '$lib/api/member';

vi.mock('$lib/api/member', () => ({
	getMembers: vi.fn(),
	getMemberPasses: vi.fn(),
	getInstructors: vi.fn()
}));
vi.mock('$lib/api/feedback', () => ({
	getCategories: vi.fn().mockResolvedValue({ status: true, message: '', data: [] }),
	createLevelTestFeedback: vi.fn()
}));
vi.mock('$lib/stores/academy.svelte', () => ({
	academyStore: { academyId: 1, memberRole: 'INSTRUCTOR', instructorId: 8 }
}));
vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { error: vi.fn(), success: vi.fn(), info: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const mockedGetMembers = vi.mocked(getMembers);

describe('/admin/feedback/new-level-test', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedGetMembers.mockResolvedValue({
			status: true,
			message: '',
			data: { list: [], next_cursor: null, has_more: false }
		});
	});

	it('강사는 소진·만료 수강권 학생까지 검색되도록 pass_status=ALL로 조회한다', async () => {
		render(NewLevelTestPage);

		await vi.waitFor(() => expect(mockedGetMembers).toHaveBeenCalled());
		const args = mockedGetMembers.mock.calls[0];
		expect(args[4]).toBe('STUDENT');
		expect(args[5]).toBe('ALL');
		expect(args[6]).toBe(8);
	});
});
