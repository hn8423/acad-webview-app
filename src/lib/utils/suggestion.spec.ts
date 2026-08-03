import { describe, expect, it } from 'vitest';
import { getSuggestionStatusBadge } from './suggestion';

describe('getSuggestionStatusBadge', () => {
	it('ANSWERED면 답변완료 배지를 반환한다', () => {
		expect(getSuggestionStatusBadge('ANSWERED')).toEqual({
			variant: 'success',
			label: '답변완료'
		});
	});

	it('PENDING이면 대기 배지를 반환한다', () => {
		expect(getSuggestionStatusBadge('PENDING')).toEqual({
			variant: 'warning',
			label: '대기'
		});
	});

	it('알 수 없는 상태는 대기로 처리한다', () => {
		expect(getSuggestionStatusBadge('SOMETHING_ELSE').label).toBe('대기');
		expect(getSuggestionStatusBadge('').label).toBe('대기');
	});
});
