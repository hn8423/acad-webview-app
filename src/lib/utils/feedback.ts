const SCORE_LEVELS = [
	{ max: 4, group: 'Beginner', color: '#f59e0b' },
	{ max: 8, group: 'Intermediate', color: '#10b981' },
	{ max: 12, group: 'Advanced', color: '#6c5ce7' },
	{ max: 16, group: 'Expert', color: '#ef4444' },
	{ max: 20, group: 'Master', color: '#8b5cf6' }
] as const;

export function getLevelInfo(score: number): { group: string; color: string } {
	const level = SCORE_LEVELS.find((l) => score <= l.max);
	return level ?? SCORE_LEVELS[SCORE_LEVELS.length - 1];
}

export function getLevelColor(score: number): string {
	return getLevelInfo(score).color;
}
