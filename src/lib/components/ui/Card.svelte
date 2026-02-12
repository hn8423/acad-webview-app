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
	{onclick}
	onkeydown={onclick
		? (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onclick?.();
				}
			}
		: undefined}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
>
	{@render children()}
</div>

<style lang="scss">
	.card {
		background-color: var(--color-bg-card);
		border-radius: var(--radius-lg);

		&--pad-sm {
			padding: 12px 16px;
		}

		&--pad-md {
			padding: var(--space-lg) var(--space-lg);
		}

		&--pad-lg {
			padding: var(--space-xl) var(--space-lg);
		}

		&--shadow {
			box-shadow: var(--shadow-card);
		}

		&--clickable {
			cursor: pointer;
			transition: transform 150ms ease;

			&:active {
				transform: scale(0.97);
			}

			&:hover {
				background-color: var(--color-bg);
			}
		}
	}
</style>
