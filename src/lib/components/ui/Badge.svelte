<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
		children: Snippet;
	}

	let { variant = 'neutral', children }: Props = $props();
</script>

<span class="badge badge--{variant}">
	{@render children()}
</span>

<style lang="scss">
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		white-space: nowrap;

		&--success {
			background-color: var(--color-success-bg);
			color: #059669;
		}

		&--warning {
			background-color: var(--color-warning-bg);
			color: #d97706;
		}

		&--danger {
			background-color: var(--color-danger-bg);
			color: #dc2626;
		}

		&--info {
			background-color: var(--color-info-bg);
			color: var(--color-primary);
		}

		&--neutral {
			background-color: var(--color-bg);
			color: var(--color-text-secondary);
		}
	}
</style>
