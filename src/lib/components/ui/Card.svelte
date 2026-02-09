<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		padding?: 'sm' | 'md' | 'lg';
		shadow?: boolean;
		onclick?: () => void;
		children: Snippet;
	}

	let { padding = 'md', shadow = true, onclick, children }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="card card--pad-{padding}"
	class:card--shadow={shadow}
	class:card--clickable={!!onclick}
	onclick={onclick}
	onkeydown={onclick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick?.(); } } : undefined}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
>
	{@render children()}
</div>

<style lang="scss">
	.card {
		background-color: var(--color-bg-card);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);

		&--pad-sm {
			padding: var(--space-sm);
		}

		&--pad-md {
			padding: var(--space-md);
		}

		&--pad-lg {
			padding: var(--space-lg);
		}

		&--shadow {
			box-shadow: var(--shadow-sm);
			border: none;
		}

		&--clickable {
			cursor: pointer;
			transition: box-shadow var(--transition-fast);

			&:hover {
				box-shadow: var(--shadow-md);
			}
		}
	}
</style>
