<script lang="ts">
	interface Props {
		variant?: 'text' | 'circle' | 'rect';
		width?: string;
		height?: string;
		lines?: number;
	}

	let { variant = 'rect', width = '100%', height = '16px', lines = 1 }: Props = $props();
</script>

{#if variant === 'text' && lines > 1}
	<div class="skeleton-lines">
		{#each Array(lines) as _, i}
			<div
				class="skeleton skeleton--text"
				style:width={i === lines - 1 ? '60%' : width}
				style:height
			></div>
		{/each}
	</div>
{:else if variant === 'circle'}
	<div class="skeleton skeleton--circle" style:width style:height={width}></div>
{:else}
	<div class="skeleton skeleton--rect" style:width style:height></div>
{/if}

<style lang="scss">
	.skeleton {
		background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;

		&--text {
			border-radius: var(--radius-sm);
		}

		&--circle {
			border-radius: 50%;
		}

		&--rect {
			border-radius: var(--radius-md);
		}
	}

	.skeleton-lines {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}
</style>
