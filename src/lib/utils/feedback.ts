export const SCORE_LEVELS = [
	{ score: 1, group: 'Beginner', shortLabel: 'Beg', color: '#fbbf24' },
	{ score: 2, group: 'Intermediate', shortLabel: 'Int', color: '#34d399' },
	{ score: 3, group: 'Advanced', shortLabel: 'Adv', color: '#8b5cf6' },
	{ score: 4, group: 'Expert', shortLabel: 'Exp', color: '#f87171' },
	{ score: 5, group: 'Master', shortLabel: 'Mas', color: '#c084fc' }
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
