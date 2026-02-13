<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		loading?: boolean;
		disabled?: boolean;
		fullWidth?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: () => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		fullWidth = false,
		type = 'button',
		onclick,
		children
	}: Props = $props();
</script>

<button
	class="btn btn--{variant} btn--{size}"
	class:btn--full={fullWidth}
	class:btn--loading={loading}
	{type}
	disabled={disabled || loading}
	{onclick}
>
	{#if loading}
		<span class="btn__spinner"></span>
	{/if}
	<span class="btn__content" class:btn__content--hidden={loading}>
		{@render children()}
	</span>
</button>

<style lang="scss">
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		border-radius: var(--radius-lg);
		font-weight: var(--font-weight-semibold);
		position: relative;
		transition: transform 150ms ease;

		&:active:not(:disabled) {
			transform: scale(0.97);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&--primary {
			background: var(--color-primary-gradient);
			color: var(--color-white);

			&:hover:not(:disabled) {
				background: var(--color-primary-gradient-hover);
			}
		}

		&--secondary {
			background-color: var(--color-bg);
			color: var(--color-text);

			&:hover:not(:disabled) {
				background-color: var(--color-divider);
			}
		}

		&--ghost {
			background-color: transparent;
			color: var(--color-primary);

			&:hover:not(:disabled) {
				background-color: var(--color-primary-bg);
			}
		}

		&--danger {
			background-color: var(--color-danger-bg);
			color: var(--color-danger);

			&:hover:not(:disabled) {
				background-color: #fde8e8;
			}
		}

		&--sm {
			padding: 8px 16px;
			font-size: var(--font-size-sm);
		}

		&--md {
			padding: 14px 24px;
			font-size: var(--font-size-base);
		}

		&--lg {
			padding: 18px 32px;
			font-size: var(--font-size-lg);
		}

		&--full {
			width: 100%;
		}
	}

	.btn__spinner {
		width: 18px;
		height: 18px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		position: absolute;
	}

	.btn__content {
		&--hidden {
			visibility: hidden;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
