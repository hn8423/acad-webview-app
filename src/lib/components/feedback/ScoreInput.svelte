<script lang="ts">
	import { SCORE_LEVELS, getLevelInfo, getFullLevelLabel } from '$lib/utils/feedback';

	interface Props {
		categoryName: string;
		score: number;
		comment: string;
		onscorechange: (score: number) => void;
		oncommentchange: (comment: string) => void;
	}

	let { categoryName, score, comment, onscorechange, oncommentchange }: Props = $props();

	let levelInfo = $derived(getLevelInfo(score));
	let fullLabel = $derived(getFullLevelLabel(score));

	function handleLevelTap(levelScore: number) {
		onscorechange(levelScore);
	}

	function handleLevelKeydown(e: KeyboardEvent, currentScore: number) {
		let nextScore = currentScore;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			nextScore = currentScore < 5 ? currentScore + 1 : 1;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			nextScore = currentScore > 1 ? currentScore - 1 : 5;
		} else {
			return;
		}
		e.preventDefault();
		handleLevelTap(nextScore);
		const group = (e.currentTarget as HTMLElement).parentElement;
		const buttons = group?.querySelectorAll<HTMLButtonElement>('button');
		buttons?.[nextScore - 1]?.focus();
	}
</script>

<div class="score-input">
	<div class="score-input__header">
		<span class="score-input__category">{categoryName}</span>
		<span
			class="score-input__badge"
			style="background-color: {levelInfo.color}15; color: {levelInfo.color}"
		>
			{fullLabel}
		</span>
	</div>

	<div class="score-input__levels" role="radiogroup" aria-label="{categoryName} 레벨 선택">
		{#each SCORE_LEVELS as level}
			<button
				type="button"
				class="score-input__chip"
				class:score-input__chip--active={score === level.score}
				style="--chip-color: {level.color}"
				role="radio"
				aria-checked={score === level.score}
				aria-label={level.group}
				tabindex={score === level.score ? 0 : -1}
				onclick={() => handleLevelTap(level.score)}
				onkeydown={(e) => handleLevelKeydown(e, level.score)}
			>
				{level.shortLabel}
			</button>
		{/each}
	</div>

	<input
		type="text"
		placeholder="코멘트 (선택)"
		value={comment}
		class="score-input__comment"
		aria-label="{categoryName} 코멘트"
		oninput={(e) => oncommentchange((e.target as HTMLInputElement).value)}
	/>
</div>

<style lang="scss">
	.score-input {
		padding: var(--space-md);
		background: var(--color-bg);
		border-radius: var(--radius-md);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__category {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__badge {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			padding: 2px var(--space-sm);
			border-radius: var(--radius-full);
			transition:
				background-color var(--transition-fast),
				color var(--transition-fast);
		}

		&__levels {
			display: flex;
			gap: 6px;
			margin-bottom: var(--space-sm);
		}

		&__chip {
			flex: 1;
			min-height: 40px;
			padding: 6px 2px;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			background: var(--color-white);
			border: 1.5px solid var(--color-border);
			cursor: pointer;
			text-align: center;
			white-space: nowrap;
			transition:
				background-color var(--transition-fast),
				color var(--transition-fast),
				border-color var(--transition-fast),
				transform 150ms ease;

			&:active {
				transform: scale(0.95);
			}

			&--active {
				background-color: var(--chip-color);
				color: var(--color-on-primary);
				border-color: var(--chip-color);
				font-weight: var(--font-weight-semibold);
				box-shadow: var(--shadow-md);
			}
		}

		&__comment {
			width: 100%;
			padding: 10px 12px;
			border: none;
			background: var(--color-white);
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
			color: var(--color-text);
			outline: none;

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}
	}
</style>
