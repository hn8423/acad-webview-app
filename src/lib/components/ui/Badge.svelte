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
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;

		&--success {
			background-color: #e8f5e9;
			color: #2e7d32;
		}

		&--warning {
			background-color: #fff3e0;
			color: #e65100;
		}

		&--danger {
			background-color: #ffebee;
			color: #c62828;
		}

		&--info {
			background-color: #e3f2fd;
			color: #1565c0;
		}

		&--neutral {
			background-color: var(--color-bg);
			color: var(--color-text-secondary);
		}
	}
</style>
