<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
	}

	let { size = 'md' }: Props = $props();
</script>

<div class="spinner spinner--{size}">
	<div class="spinner__ring"></div>
</div>

<style lang="scss">
	.spinner {
		display: inline-flex;
		align-items: center;
		justify-content: center;

		&--sm {
			.spinner__ring {
				width: 20px;
				height: 20px;
				border-width: 2px;
			}
		}

		&--md {
			.spinner__ring {
				width: 32px;
				height: 32px;
				border-width: 3px;
			}
		}

		&--lg {
			.spinner__ring {
				width: 48px;
				height: 48px;
				border-width: 4px;
			}
		}
	}

	.spinner__ring {
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
