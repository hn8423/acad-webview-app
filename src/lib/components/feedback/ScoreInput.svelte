<script lang="ts">
	import { getLevelInfo } from '$lib/utils/feedback';

	interface Props {
		categoryName: string;
		score: number;
		comment: string;
		onscorechange: (score: number) => void;
		oncommentchange: (comment: string) => void;
	}

	let { categoryName, score, comment, onscorechange, oncommentchange }: Props = $props();

	let levelInfo = $derived(getLevelInfo(score));
</script>

<div class="score-input">
	<div class="score-input__header">
		<span class="score-input__category">{categoryName}</span>
		<span
			class="score-input__level"
			style="background-color: {levelInfo.color}15; color: {levelInfo.color}"
		>
			{levelInfo.group} {score}/20
		</span>
	</div>
	<input
		type="range"
		min="1"
		max="20"
		value={score}
		class="score-input__slider"
		style="--track-color: {levelInfo.color}"
		oninput={(e) => onscorechange(Number((e.target as HTMLInputElement).value))}
	/>
	<input
		type="text"
		placeholder="코멘트 (선택)"
		value={comment}
		class="score-input__comment"
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

		&__level {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			padding: 2px 8px;
			border-radius: var(--radius-full);
		}

		&__slider {
			width: 100%;
			height: 6px;
			appearance: none;
			background: var(--color-divider);
			border-radius: var(--radius-full);
			outline: none;
			margin-bottom: var(--space-sm);

			&::-webkit-slider-thumb {
				appearance: none;
				width: 20px;
				height: 20px;
				border-radius: 50%;
				background: var(--track-color, var(--color-primary));
				cursor: pointer;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
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
