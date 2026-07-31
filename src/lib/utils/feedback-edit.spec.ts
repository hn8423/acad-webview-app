import { describe, it, expect } from 'vitest';
import { buildSkillEditState, buildSkillDetailsPayload } from './feedback-edit';
import type { SkillDetail } from '$lib/types/feedback';

function makeDetail(overrides: Partial<SkillDetail> = {}): SkillDetail {
	return {
		category_id: 1,
		category_name: '리듬',
		score: 4,
		comment: '좋아요',
		...overrides
	};
}

describe('buildSkillEditState', () => {
	it('should map scores and comments by category_id from details', () => {
		const details = [
			makeDetail({ category_id: 1, score: 4, comment: '좋아요' }),
			makeDetail({ category_id: 2, score: 2, comment: '연습 필요' })
		];
		expect(buildSkillEditState(details)).toEqual({
			scores: { 1: 4, 2: 2 },
			comments: { 1: '좋아요', 2: '연습 필요' }
		});
	});

	it('should default missing comment to empty string', () => {
		const details = [makeDetail({ category_id: 3, comment: undefined })];
		expect(buildSkillEditState(details).comments).toEqual({ 3: '' });
	});

	it('should return empty state for empty details', () => {
		expect(buildSkillEditState([])).toEqual({ scores: {}, comments: {} });
	});
});

describe('buildSkillDetailsPayload', () => {
	it('should build payload from details with edited values', () => {
		const details = [
			makeDetail({ category_id: 1, score: 4 }),
			makeDetail({ category_id: 2, score: 2, comment: '연습 필요' })
		];
		const payload = buildSkillDetailsPayload(
			details,
			{ 1: 5, 2: 2 },
			{ 1: '많이 늘었어요', 2: '연습 필요' }
		);
		expect(payload).toEqual([
			{ category_id: 1, score: 5, comment: '많이 늘었어요' },
			{ category_id: 2, score: 2, comment: '연습 필요' }
		]);
	});

	it('should fall back to existing detail values when form state is missing entries', () => {
		const details = [makeDetail({ category_id: 7, score: 3, comment: '기존 코멘트' })];
		const payload = buildSkillDetailsPayload(details, {}, {});
		expect(payload).toEqual([{ category_id: 7, score: 3, comment: '기존 코멘트' }]);
	});

	it('should send undefined comment when trimmed comment is empty', () => {
		const details = [makeDetail({ category_id: 1, comment: '지움' })];
		const payload = buildSkillDetailsPayload(details, { 1: 4 }, { 1: '   ' });
		expect(payload).toEqual([{ category_id: 1, score: 4, comment: undefined }]);
	});

	it('should return empty payload for empty details regardless of form state', () => {
		expect(buildSkillDetailsPayload([], { 1: 5 }, { 1: 'x' })).toEqual([]);
	});

	it('should preserve details order and ignore unknown form entries', () => {
		const details = [makeDetail({ category_id: 2, score: 1 }), makeDetail({ category_id: 1 })];
		const payload = buildSkillDetailsPayload(details, { 99: 5 }, { 99: '무관' });
		expect(payload.map((p) => p.category_id)).toEqual([2, 1]);
	});
});
