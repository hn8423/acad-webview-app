<script lang="ts">
	interface Props {
		message: string;
		type?: 'success' | 'error' | 'info';
	}

	let { message, type = 'info' }: Props = $props();
</script>

<div class="toast toast--{type}" role="alert" aria-live="assertive">
	<span class="toast__icon">
		{#if type === 'success'}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
			>
				<path d="M20 6L9 17l-5-5" />
			</svg>
		{:else if type === 'error'}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M15 9l-6 6M9 9l6 6" />
			</svg>
		{:else}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M12 16v-4M12 8h.01" />
			</svg>
		{/if}
	</span>
	<span class="toast__message">{message}</span>
</div>

<style lang="scss">
	.toast {
		position: fixed;
		bottom: calc(var(--bottom-nav-height, 0px) + 16px);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 12px 20px;
		border-radius: var(--radius-full);
		background: rgba(25, 31, 40, 0.9);
		backdrop-filter: blur(8px);
		color: var(--color-white);
		z-index: var(--z-toast);
		animation: toast-in 300ms cubic-bezier(0.32, 0.72, 0, 1);
		white-space: nowrap;
		max-width: calc(100vw - 32px);

		&--success {
			.toast__icon {
				color: #34d399;
			}
		}

		&--error {
			.toast__icon {
				color: #f87171;
			}
		}

		&--info {
			.toast__icon {
				color: var(--color-primary-light);
			}
		}
	}

	.toast__icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.toast__message {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	@keyframes toast-in {
		from {
			transform: translateX(-50%) translateY(100px);
			opacity: 0;
		}
		to {
			transform: translateX(-50%) translateY(0);
			opacity: 1;
		}
	}
</style>
