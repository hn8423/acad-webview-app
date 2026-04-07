export const SCORE_LEVELS = [
	{ score: 1, group: '1레벨', shortLabel: '1레벨', color: '#fbbf24' },
	{ score: 2, group: '2레벨', shortLabel: '2레벨', color: '#34d399' },
	{ score: 3, group: '3레벨', shortLabel: '3레벨', color: '#8b5cf6' },
	{ score: 4, group: '4레벨', shortLabel: '4레벨', color: '#f87171' },
	{ score: 5, group: '5레벨', shortLabel: '5레벨', color: '#c084fc' }
] as const;

export function getLevelInfo(score: number): { group: string; color: string } {
	const clamped = Math.max(1, Math.min(5, score));
	const level = SCORE_LEVELS[clamped - 1];
	return level ?? SCORE_LEVELS[SCORE_LEVELS.length - 1];
}

export function getLevelColor(score: number): string {
	return getLevelInfo(score).color;
}

export function getFullLevelLabel(score: number): string {
	return getLevelInfo(score).group;
}
