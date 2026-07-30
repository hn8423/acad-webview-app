import type { SkillDetail, UpdateLevelTestRequest } from '$lib/types/feedback';

export interface SkillEditState {
	scores: Record<number, number>;
	comments: Record<number, string>;
}

// 수정 모달 오픈 시 피드백에 저장된 skill_details를 폼 상태로 변환
export function buildSkillEditState(details: SkillDetail[]): SkillEditState {
	return {
		scores: Object.fromEntries(details.map((d) => [d.category_id, d.score])),
		comments: Object.fromEntries(details.map((d) => [d.category_id, d.comment ?? '']))
	};
}

// 저장 payload는 기존 details 목록 기준으로 생성 — 폼 상태에 없는 항목은 기존 값으로 폴백해 데이터 유실 방지
export function buildSkillDetailsPayload(
	details: SkillDetail[],
	scores: Record<number, number>,
	comments: Record<number, string>
): NonNullable<UpdateLevelTestRequest['skill_details']> {
	return details.map((d) => ({
		category_id: d.category_id,
		score: scores[d.category_id] ?? d.score,
		comment: (comments[d.category_id] ?? d.comment ?? '').trim() || undefined
	}));
}
