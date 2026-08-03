export interface SuggestionStatusBadge {
	variant: 'warning' | 'success';
	label: string;
}

/**
 * 건의사항 상태 배지 정보.
 * 관리자가 답글을 달면 백엔드가 ANSWERED로 전이시킨다.
 * 알 수 없는 값은 아직 처리 전으로 간주해 '대기'로 표시한다.
 */
export function getSuggestionStatusBadge(status: string): SuggestionStatusBadge {
	return status === 'ANSWERED'
		? { variant: 'success', label: '답변완료' }
		: { variant: 'warning', label: '대기' };
}
