<script lang="ts">
	import { getLevelColor } from '$lib/utils/feedback';

	interface Props {
		categoryName: string;
		score: number;
		level?: string;
		comment?: string;
	}

	let { categoryName, score, level, comment }: Props = $props();

	let color = $derived(getLevelColor(score));
	let percentage = $derived((score / 20) * 100);
</script>

<div class="score-display">
	<div class="score-display__header">
		<span class="score-display__category">{categoryName}</span>
		<span class="score-display__level" style="color: {color}">
			{level ?? `${score}/20`}
		</span>
	</div>
	<div class="score-display__bar">
		<div class="score-display__fill" style="width: {percentage}%; background-color: {color}"></div>
	</div>
	{#if comment}
		<p class="score-display__comment">{comment}</p>
	{/if}
</div>

<style lang="scss">
	.score-display {
		padding: var(--space-sm) 0;

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-xs);
		}

		&__category {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__level {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
		}

		&__bar {
			width: 100%;
			height: 6px;
			background: var(--color-divider);
			border-radius: var(--radius-full);
			overflow: hidden;
			margin-bottom: var(--space-xs);
		}

		&__fill {
			height: 100%;
			border-radius: var(--radius-full);
			transition: width var(--transition-base);
		}

		&__comment {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: var(--line-height-base);
		}
	}
</style>
