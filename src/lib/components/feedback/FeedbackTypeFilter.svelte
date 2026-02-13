<script lang="ts">
	import type { FeedbackType } from '$lib/types/feedback';

	interface Props {
		selected: FeedbackType | undefined;
		onchange: (type: FeedbackType | undefined) => void;
	}

	let { selected, onchange }: Props = $props();

	const tabs: { label: string; value: FeedbackType | undefined }[] = [
		{ label: '전체', value: undefined },
		{ label: '위클리', value: 'WEEKLY' },
		{ label: '먼슬리', value: 'MONTHLY' }
	];
</script>

<div class="type-filter">
	{#each tabs as tab}
		<button
			class="type-filter__tab"
			class:type-filter__tab--active={selected === tab.value}
			onclick={() => onchange(tab.value)}
		>
			{tab.label}
		</button>
	{/each}
</div>

<style lang="scss">
	.type-filter {
		display: flex;
		gap: var(--space-xs);
		background: var(--color-bg);
		border-radius: var(--radius-md);
		padding: 4px;

		&__tab {
			flex: 1;
			padding: 8px 12px;
			border-radius: var(--radius-sm);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			transition: all var(--transition-fast);

			&--active {
				background: var(--color-white);
				color: var(--color-primary);
				font-weight: var(--font-weight-semibold);
				box-shadow: var(--shadow-sm);
			}
		}
	}
</style>
