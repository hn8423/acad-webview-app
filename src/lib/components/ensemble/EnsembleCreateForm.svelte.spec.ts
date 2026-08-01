import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EnsembleCreateForm from './EnsembleCreateForm.svelte';
import { createEnsemble, updateEnsemble } from '$lib/api/ensemble';
import type { EnsembleDetail } from '$lib/types/ensemble';

vi.mock('$lib/api/ensemble', () => ({
	createEnsemble: vi.fn(),
	updateEnsemble: vi.fn()
}));

vi.mock('$lib/stores/academy.svelte', () => ({
	academyStore: { academyId: 1, memberId: 10 }
}));

vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

// Input.svelte의 label에는 for 연결이 없어 getByLabel을 쓸 수 없다. placeholder로 찾는다.
const NAME_PLACEHOLDER = '예: 밴드 합주 모집';
const ROLE_PLACEHOLDER = '예: 기타, 드럼, 보컬';
const DESCRIPTION_PLACEHOLDER = '합주조를 소개해주세요';

const mockedCreate = vi.mocked(createEnsemble);
const mockedUpdate = vi.mocked(updateEnsemble);

function makeEnsemble(overrides: Partial<EnsembleDetail> = {}): EnsembleDetail {
	return {
		id: 7,
		group_name: '토요일 밴드',
		description: '주말 합주 모집합니다',
		creator: { member_id: 10, user_name: '김현인' },
		max_members: 4,
		current_members: 2,
		practice_date: null,
		practice_time: null,
		status: 'RECRUITING',
		my_status: 'JOINED',
		members: [],
		created_at: new Date().toISOString(),
		...overrides
	};
}

function ok<T>(data: T) {
	return { status: true, message: '', data };
}

describe('EnsembleCreateForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('생성 모드', () => {
		it('내 파트 입력과 만들기 버튼을 노출한다', async () => {
			render(EnsembleCreateForm, { oncreate: vi.fn() });

			await expect.element(page.getByPlaceholder(ROLE_PLACEHOLDER)).toBeInTheDocument();
			await expect.element(page.getByRole('button', { name: '만들기' })).toBeInTheDocument();
		});

		it('그룹명과 파트를 채우면 createEnsemble을 호출한다', async () => {
			const oncreate = vi.fn();
			mockedCreate.mockResolvedValue(ok(makeEnsemble()));

			render(EnsembleCreateForm, { oncreate });

			await page.getByPlaceholder(NAME_PLACEHOLDER).fill('새 합주조');
			await page.getByPlaceholder(ROLE_PLACEHOLDER).fill('기타');
			await page.getByRole('button', { name: '만들기' }).click();

			await vi.waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
			expect(mockedCreate).toHaveBeenCalledWith(1, {
				group_name: '새 합주조',
				role: '기타',
				description: undefined,
				max_members: 5
			});
			expect(mockedUpdate).not.toHaveBeenCalled();
			await vi.waitFor(() => expect(oncreate).toHaveBeenCalled());
		});

		it('파트를 비우면 검증 오류를 보여주고 API를 호출하지 않는다', async () => {
			render(EnsembleCreateForm, { oncreate: vi.fn() });

			await page.getByPlaceholder(NAME_PLACEHOLDER).fill('새 합주조');
			await page.getByRole('button', { name: '만들기' }).click();

			await expect.element(page.getByText('파트를 입력해주세요')).toBeInTheDocument();
			expect(mockedCreate).not.toHaveBeenCalled();
		});
	});

	describe('수정 모드', () => {
		it('기존 값으로 폼을 채우고 수정하기 버튼을 노출한다', async () => {
			render(EnsembleCreateForm, { oncreate: vi.fn(), editTarget: makeEnsemble() });

			await expect.element(page.getByPlaceholder(NAME_PLACEHOLDER)).toHaveValue('토요일 밴드');
			await expect
				.element(page.getByPlaceholder(DESCRIPTION_PLACEHOLDER))
				.toHaveValue('주말 합주 모집합니다');
			await expect.element(page.getByRole('button', { name: '수정하기' })).toBeInTheDocument();
		});

		// 백엔드 PATCH가 role을 처리하지 않으므로 수정 모드에서는 노출하지 않는다
		it('내 파트 입력을 노출하지 않는다', async () => {
			render(EnsembleCreateForm, { oncreate: vi.fn(), editTarget: makeEnsemble() });

			await expect.element(page.getByPlaceholder(NAME_PLACEHOLDER)).toBeInTheDocument();
			expect(page.getByPlaceholder(ROLE_PLACEHOLDER).elements()).toHaveLength(0);
		});

		it('updateEnsemble을 그룹 id와 함께 호출한다', async () => {
			const oncreate = vi.fn();
			mockedUpdate.mockResolvedValue(ok(makeEnsemble()));

			render(EnsembleCreateForm, { oncreate, editTarget: makeEnsemble() });

			await page.getByPlaceholder(NAME_PLACEHOLDER).fill('일요일 밴드');
			await page.getByRole('button', { name: '수정하기' }).click();

			await vi.waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
			expect(mockedUpdate).toHaveBeenCalledWith(1, 7, {
				group_name: '일요일 밴드',
				description: '주말 합주 모집합니다',
				max_members: 4
			});
			expect(mockedCreate).not.toHaveBeenCalled();
			await vi.waitFor(() => expect(oncreate).toHaveBeenCalled());
		});

		it('파트가 비어 있어도 수정은 통과한다', async () => {
			mockedUpdate.mockResolvedValue(ok(makeEnsemble()));

			render(EnsembleCreateForm, { oncreate: vi.fn(), editTarget: makeEnsemble() });

			await page.getByRole('button', { name: '수정하기' }).click();

			await vi.waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
		});

		it('그룹명을 비우면 검증 오류를 보여주고 API를 호출하지 않는다', async () => {
			render(EnsembleCreateForm, { oncreate: vi.fn(), editTarget: makeEnsemble() });

			await page.getByPlaceholder(NAME_PLACEHOLDER).fill('');
			await page.getByRole('button', { name: '수정하기' }).click();

			await expect.element(page.getByText('그룹명을 입력해주세요')).toBeInTheDocument();
			expect(mockedUpdate).not.toHaveBeenCalled();
		});
	});
});
