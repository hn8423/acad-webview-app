<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isOpen: boolean;
		title?: string;
		onclose: () => void;
		children: Snippet;
	}

	let { isOpen = $bindable(false), title = '', onclose, children }: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={isOpen ? handleKeydown : undefined} />

{#if isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="modal">
			<div class="modal__handle">
				<span class="modal__handle-bar"></span>
			</div>
			{#if title}
				<div class="modal__header">
					<h2 class="modal__title">{title}</h2>
					<button class="modal__close" onclick={onclose} aria-label="닫기">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
			<div class="modal__body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: var(--z-modal-backdrop);
		padding: 0;
	}

	.modal {
		background-color: var(--color-white);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
		z-index: var(--z-modal);
		box-shadow: var(--shadow-xl);
		animation: slide-up 300ms cubic-bezier(0.32, 0.72, 0, 1);

		&__handle {
			display: flex;
			justify-content: center;
			padding: 12px 0 4px;
		}

		&__handle-bar {
			width: 36px;
			height: 4px;
			background-color: var(--color-divider);
			border-radius: var(--radius-full);
		}

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: var(--space-md) var(--space-lg);
		}

		&__title {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
		}

		&__close {
			width: 44px;
			height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--radius-full);
			color: var(--color-text-secondary);
			transition: background-color var(--transition-fast);

			&:hover {
				background-color: var(--color-bg);
				color: var(--color-text);
			}
		}

		&__body {
			padding: var(--space-sm) var(--space-lg) var(--space-2xl);
		}
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
