<script lang="ts">
	import {
		SCORE_LEVELS,
		SUB_LEVELS,
		getLevelInfo,
		getFullLevelLabel,
		scoreToIndices,
		indicesToScore
	} from '$lib/utils/feedback';

	interface Props {
		categoryName: string;
		score: number;
		comment: string;
		onscorechange: (score: number) => void;
		oncommentchange: (comment: string) => void;
	}

	let { categoryName, score, comment, onscorechange, oncommentchange }: Props = $props();

	let indices = $derived(scoreToIndices(score));
	let levelInfo = $derived(getLevelInfo(score));
	let fullLabel = $derived(getFullLevelLabel(score));

	function handleLevelTap(levelIndex: number) {
		onscorechange(indicesToScore(levelIndex, indices.subIndex));
	}

	function handleSubTap(subIndex: number) {
		onscorechange(indicesToScore(indices.levelIndex, subIndex));
	}

	function handleLevelKeydown(e: KeyboardEvent, currentIndex: number) {
		let nextIndex = currentIndex;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			nextIndex = currentIndex < SCORE_LEVELS.length - 1 ? currentIndex + 1 : 0;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			nextIndex = currentIndex > 0 ? currentIndex - 1 : SCORE_LEVELS.length - 1;
		} else {
			return;
		}
		e.preventDefault();
		handleLevelTap(nextIndex);
		const group = (e.currentTarget as HTMLElement).parentElement;
		const buttons = group?.querySelectorAll<HTMLButtonElement>('button');
		buttons?.[nextIndex]?.focus();
	}

	function handleSubKeydown(e: KeyboardEvent, currentIndex: number) {
		let nextIndex = currentIndex;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			nextIndex = currentIndex < SUB_LEVELS.length - 1 ? currentIndex + 1 : 0;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			nextIndex = currentIndex > 0 ? currentIndex - 1 : SUB_LEVELS.length - 1;
		} else {
			return;
		}
		e.preventDefault();
		handleSubTap(nextIndex);
		const group = (e.currentTarget as HTMLElement).parentElement;
		const buttons = group?.querySelectorAll<HTMLButtonElement>('button');
		buttons?.[nextIndex]?.focus();
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
		{#each SCORE_LEVELS as level, i}
			<button
				class="score-input__chip"
				class:score-input__chip--active={indices.levelIndex === i}
				style="--chip-color: {level.color}"
				role="radio"
				aria-checked={indices.levelIndex === i}
				aria-label={level.group}
				tabindex={indices.levelIndex === i ? 0 : -1}
				onclick={() => handleLevelTap(i)}
				onkeydown={(e) => handleLevelKeydown(e, i)}
			>
				{level.shortLabel}
			</button>
		{/each}
	</div>

	<div class="score-input__subs" role="radiogroup" aria-label="{categoryName} 세부 레벨 선택">
		{#each SUB_LEVELS as sub, i}
			<button
				class="score-input__chip score-input__chip--sub"
				class:score-input__chip--active={indices.subIndex === i}
				style="--chip-color: {levelInfo.color}"
				role="radio"
				aria-checked={indices.subIndex === i}
				aria-label={sub}
				tabindex={indices.subIndex === i ? 0 : -1}
				onclick={() => handleSubTap(i)}
				onkeydown={(e) => handleSubKeydown(e, i)}
			>
				{sub}
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

		&__levels,
		&__subs {
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

			&--sub {
				min-height: 36px;
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
