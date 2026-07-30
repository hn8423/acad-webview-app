import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EnsembleComments from './EnsembleComments.svelte';
import { getComments, createComment, deleteComment } from '$lib/api/ensemble';
import type { EnsembleComment } from '$lib/types/ensemble';

vi.mock('$lib/api/ensemble', () => ({
	getComments: vi.fn(),
	createComment: vi.fn(),
	deleteComment: vi.fn()
}));

vi.mock('$lib/stores/academy.svelte', () => ({
	academyStore: { academyId: 1, memberId: 10 }
}));

const mockedGetComments = vi.mocked(getComments);
const mockedCreateComment = vi.mocked(createComment);
const mockedDeleteComment = vi.mocked(deleteComment);

function makeComment(overrides: Partial<EnsembleComment> = {}): EnsembleComment {
	return {
		id: 1,
		member_id: 10,
		user_name: '김현인',
		profile_img: '',
		content: '이번 주 토요일 연습 어때요?',
		created_at: new Date().toISOString(),
		...overrides
	};
}

function ok<T>(data: T) {
	return { status: true, message: '', data };
}

describe('EnsembleComments', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('댓글 목록을 렌더링한다', async () => {
		mockedGetComments.mockResolvedValue(
			ok([
				makeComment(),
				makeComment({ id: 2, member_id: 20, user_name: 'xpxpxp', content: '좋아요! 3시에 봬요' })
			])
		);

		render(EnsembleComments, { ensembleId: 5 });

		await expect.element(page.getByText('댓글 (2)')).toBeInTheDocument();
		await expect.element(page.getByText('김현인')).toBeInTheDocument();
		await expect.element(page.getByText('좋아요! 3시에 봬요')).toBeInTheDocument();
	});

	it('댓글이 없으면 빈 상태 문구를 표시한다', async () => {
		mockedGetComments.mockResolvedValue(ok([]));

		render(EnsembleComments, { ensembleId: 5 });

		await expect.element(page.getByText('첫 댓글을 남겨보세요.')).toBeInTheDocument();
	});

	it('댓글을 작성하면 목록에 추가되고 입력창이 초기화된다', async () => {
		mockedGetComments.mockResolvedValue(ok([]));
		mockedCreateComment.mockResolvedValue(ok(makeComment({ id: 3, content: '새 댓글입니다' })));

		render(EnsembleComments, { ensembleId: 5 });

		const input = page.getByPlaceholder('댓글을 입력하세요');
		await input.fill('새 댓글입니다');
		await page.getByRole('button', { name: '등록' }).click();

		expect(mockedCreateComment).toHaveBeenCalledWith(1, 5, { content: '새 댓글입니다' });
		await expect.element(page.getByText('새 댓글입니다')).toBeInTheDocument();
		await expect.element(input).toHaveValue('');
	});

	it('내용이 비어 있으면 등록 버튼이 비활성화된다', async () => {
		mockedGetComments.mockResolvedValue(ok([]));

		render(EnsembleComments, { ensembleId: 5 });

		await expect.element(page.getByRole('button', { name: '등록' })).toBeDisabled();
		expect(mockedCreateComment).not.toHaveBeenCalled();
	});

	it('본인 댓글에만 삭제 버튼이 노출된다', async () => {
		mockedGetComments.mockResolvedValue(
			ok([
				makeComment({ id: 1, member_id: 10, content: '내 댓글' }),
				makeComment({ id: 2, member_id: 20, user_name: 'xpxpxp', content: '남의 댓글' })
			])
		);

		render(EnsembleComments, { ensembleId: 5 });

		await expect.element(page.getByText('내 댓글')).toBeInTheDocument();
		const deleteButtons = page.getByRole('button', { name: '삭제' });
		await expect.element(deleteButtons).toBeInTheDocument();
		expect(deleteButtons.elements()).toHaveLength(1);
	});

	it('삭제 확인 시 댓글이 목록에서 제거된다', async () => {
		mockedGetComments.mockResolvedValue(ok([makeComment({ id: 7, content: '삭제할 댓글' })]));
		mockedDeleteComment.mockResolvedValue(ok(null));

		render(EnsembleComments, { ensembleId: 5 });

		await page.getByRole('button', { name: '삭제' }).click();
		await expect.element(page.getByText('댓글을 삭제하시겠습니까?')).toBeInTheDocument();
		await page.getByRole('button', { name: '확인' }).click();

		expect(mockedDeleteComment).toHaveBeenCalledWith(1, 5, 7);
		await expect.element(page.getByText('삭제할 댓글')).not.toBeInTheDocument();
	});

	it('삭제 취소 시 댓글이 유지된다', async () => {
		mockedGetComments.mockResolvedValue(ok([makeComment({ id: 7, content: '유지할 댓글' })]));

		render(EnsembleComments, { ensembleId: 5 });

		await page.getByRole('button', { name: '삭제' }).click();
		await page.getByRole('button', { name: '취소' }).click();

		expect(mockedDeleteComment).not.toHaveBeenCalled();
		await expect.element(page.getByText('유지할 댓글')).toBeInTheDocument();
	});
});
