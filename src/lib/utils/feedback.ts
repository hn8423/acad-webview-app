export const SCORE_LEVELS = [
	{ max: 4, group: 'Beginner', shortLabel: 'Beg', color: '#f59e0b' },
	{ max: 8, group: 'Intermediate', shortLabel: 'Int', color: '#10b981' },
	{ max: 12, group: 'Advanced', shortLabel: 'Adv', color: '#6c5ce7' },
	{ max: 16, group: 'Expert', shortLabel: 'Exp', color: '#ef4444' },
	{ max: 20, group: 'Master', shortLabel: 'Mas', color: '#8b5cf6' }
] as const;

export const SUB_LEVELS = ['Pre', 'Low', 'Mid', 'High'] as const;

export function getLevelInfo(score: number): { group: string; color: string } {
	const clamped = Math.max(1, Math.min(20, score));
	const level = SCORE_LEVELS.find((l) => clamped <= l.max);
	return level ?? SCORE_LEVELS[SCORE_LEVELS.length - 1];
}

export function getLevelColor(score: number): string {
	return getLevelInfo(score).color;
}

export function scoreToIndices(score: number): { levelIndex: number; subIndex: number } {
	const clamped = Math.max(1, Math.min(20, score));
	return {
		levelIndex: Math.floor((clamped - 1) / 4),
		subIndex: (clamped - 1) % 4
	};
}

export function indicesToScore(levelIndex: number, subIndex: number): number {
	const clampedLevel = Math.max(0, Math.min(4, levelIndex));
	const clampedSub = Math.max(0, Math.min(3, subIndex));
	return clampedLevel * 4 + clampedSub + 1;
}

export function getFullLevelLabel(score: number): string {
	const { levelIndex, subIndex } = scoreToIndices(score);
	return `${SCORE_LEVELS[levelIndex].group} ${SUB_LEVELS[subIndex]}`;
}
