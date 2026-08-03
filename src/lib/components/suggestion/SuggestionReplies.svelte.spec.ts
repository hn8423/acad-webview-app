import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SuggestionReplies from './SuggestionReplies.svelte';
import {
	getSuggestionReplies,
	createSuggestionReply,
	deleteSuggestionReply
} from '$lib/api/suggestion';
import type { SuggestionReply } from '$lib/types/academy';

vi.mock('$lib/api/suggestion', () => ({
	getSuggestionReplies: vi.fn(),
	createSuggestionReply: vi.fn(),
	deleteSuggestionReply: vi.fn()
}));

vi.mock('$lib/stores/academy.svelte', () => ({
	academyStore: { academyId: 1, memberId: 10 }
}));

vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

const mockedGetReplies = vi.mocked(getSuggestionReplies);
const mockedCreateReply = vi.mocked(createSuggestionReply);
const mockedDeleteReply = vi.mocked(deleteSuggestionReply);

function makeReply(overrides: Partial<SuggestionReply> = {}): SuggestionReply {
	return {
		id: 1,
		author_member_id: 10,
		author_name: '김현인',
		author_role: 'STUDENT',
		content: '연습실 예약 시간 조정 가능할까요?',
		created_at: new Date().toISOString(),
		...overrides
	};
}

function ok<T>(data: T) {
	return { status: true, message: '', data };
}

describe('SuggestionReplies', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('답글 목록을 렌더링한다', async () => {
		mockedGetReplies.mockResolvedValue(
			ok([
				makeReply(),
				makeReply({
					id: 2,
					author_member_id: 20,
					author_name: '관리자',
					author_role: 'ADMIN',
					content: '다음 주부터 반영하겠습니다'
				})
			])
		);

		render(SuggestionReplies, { suggestionId: 5 });

		await expect.element(page.getByText('답글 (2)')).toBeInTheDocument();
		await expect.element(page.getByText('김현인')).toBeInTheDocument();
		await expect.element(page.getByText('다음 주부터 반영하겠습니다')).toBeInTheDocument();
	});

	it('답글이 없으면 빈 상태 문구를 표시한다', async () => {
		mockedGetReplies.mockResolvedValue(ok([]));

		render(SuggestionReplies, { suggestionId: 5 });

		await expect.element(page.getByText('아직 답글이 없습니다.')).toBeInTheDocument();
	});

	it('ADMIN이 작성한 답글에만 관리자 배지를 표시한다', async () => {
		// 작성자명이 '관리자'면 배지 텍스트와 겹치므로 다른 이름을 쓴다
		mockedGetReplies.mockResolvedValue(
			ok([
				makeReply({ id: 1, author_role: 'STUDENT', content: '학생 답글' }),
				makeReply({
					id: 2,
					author_member_id: 20,
					author_name: '박원장',
					author_role: 'ADMIN',
					content: '원장 답글'
				})
			])
		);

		render(SuggestionReplies, { suggestionId: 5 });

		await expect.element(page.getByText('원장 답글')).toBeInTheDocument();
		const badges = page.getByText('관리자', { exact: true });
		await expect.element(badges).toBeInTheDocument();
		expect(badges.elements()).toHaveLength(1);
	});

	it('답글을 작성하면 목록에 추가되고 입력창이 초기화된다', async () => {
		mockedGetReplies.mockResolvedValue(ok([]));
		mockedCreateReply.mockResolvedValue(ok(makeReply({ id: 3, content: '새 답글입니다' })));

		render(SuggestionReplies, { suggestionId: 5 });

		const input = page.getByPlaceholder('답글을 입력하세요');
		await input.fill('새 답글입니다');
		await page.getByRole('button', { name: '등록' }).click();

		expect(mockedCreateReply).toHaveBeenCalledWith(1, 5, { content: '새 답글입니다' });
		await expect.element(page.getByText('새 답글입니다')).toBeInTheDocument();
		await expect.element(input).toHaveValue('');
	});

	it('등록에 성공하면 onreplied 콜백을 호출한다', async () => {
		mockedGetReplies.mockResolvedValue(ok([]));
		mockedCreateReply.mockResolvedValue(ok(makeReply({ id: 3, content: '관리자 답변' })));
		const onreplied = vi.fn();

		render(SuggestionReplies, { suggestionId: 5, onreplied });

		await page.getByPlaceholder('답글을 입력하세요').fill('관리자 답변');
		await page.getByRole('button', { name: '등록' }).click();

		await expect.element(page.getByText('관리자 답변')).toBeInTheDocument();
		expect(onreplied).toHaveBeenCalledTimes(1);
	});

	it('내용이 비어 있으면 등록 버튼이 비활성화된다', async () => {
		mockedGetReplies.mockResolvedValue(ok([]));

		render(SuggestionReplies, { suggestionId: 5 });

		await expect.element(page.getByRole('button', { name: '등록' })).toBeDisabled();
		expect(mockedCreateReply).not.toHaveBeenCalled();
	});

	it('본인 답글에만 삭제 버튼이 노출된다', async () => {
		mockedGetReplies.mockResolvedValue(
			ok([
				makeReply({ id: 1, author_member_id: 10, content: '내 답글' }),
				makeReply({
					id: 2,
					author_member_id: 20,
					author_name: '관리자',
					author_role: 'ADMIN',
					content: '남의 답글'
				})
			])
		);

		render(SuggestionReplies, { suggestionId: 5 });

		await expect.element(page.getByText('내 답글')).toBeInTheDocument();
		const deleteButtons = page.getByRole('button', { name: '삭제' });
		await expect.element(deleteButtons).toBeInTheDocument();
		expect(deleteButtons.elements()).toHaveLength(1);
	});

	it('삭제 확인 시 답글이 목록에서 제거된다', async () => {
		mockedGetReplies.mockResolvedValue(ok([makeReply({ id: 7, content: '삭제할 답글' })]));
		mockedDeleteReply.mockResolvedValue(ok(null));

		render(SuggestionReplies, { suggestionId: 5 });

		await page.getByRole('button', { name: '삭제' }).click();
		await expect.element(page.getByText('답글을 삭제하시겠습니까?')).toBeInTheDocument();
		await page.getByRole('button', { name: '확인' }).click();

		expect(mockedDeleteReply).toHaveBeenCalledWith(1, 5, 7);
		await expect.element(page.getByText('삭제할 답글')).not.toBeInTheDocument();
	});

	it('삭제 취소 시 답글이 유지된다', async () => {
		mockedGetReplies.mockResolvedValue(ok([makeReply({ id: 7, content: '유지할 답글' })]));

		render(SuggestionReplies, { suggestionId: 5 });

		await page.getByRole('button', { name: '삭제' }).click();
		await page.getByRole('button', { name: '취소' }).click();

		expect(mockedDeleteReply).not.toHaveBeenCalled();
		await expect.element(page.getByText('유지할 답글')).toBeInTheDocument();
	});

	it('로드 실패 시 에러 상태와 재시도 버튼을 표시하고, 재시도로 복구된다', async () => {
		mockedGetReplies
			.mockRejectedValueOnce(new Error('network'))
			.mockResolvedValueOnce(ok([makeReply({ content: '복구된 답글' })]));

		render(SuggestionReplies, { suggestionId: 5 });

		await expect.element(page.getByText('답글을 불러오지 못했습니다.')).toBeInTheDocument();
		await page.getByRole('button', { name: '다시 시도' }).click();

		await expect.element(page.getByText('복구된 답글')).toBeInTheDocument();
		expect(mockedGetReplies).toHaveBeenCalledTimes(2);
	});

	it('등록이 비즈니스 실패(status false)하면 에러 토스트를 표시한다', async () => {
		const { toastStore } = await import('$lib/stores/toast.svelte');
		mockedGetReplies.mockResolvedValue(ok([]));
		mockedCreateReply.mockResolvedValue({
			status: false,
			message: '건의사항을 찾을 수 없습니다',
			data: makeReply()
		});

		render(SuggestionReplies, { suggestionId: 5 });

		await page.getByPlaceholder('답글을 입력하세요').fill('실패할 답글');
		await page.getByRole('button', { name: '등록' }).click();

		expect(vi.mocked(toastStore.error)).toHaveBeenCalledWith('건의사항을 찾을 수 없습니다');
		await expect.element(page.getByText('아직 답글이 없습니다.')).toBeInTheDocument();
	});
});
