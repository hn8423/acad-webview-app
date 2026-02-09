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
	<div class="modal-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal">
			{#if title}
				<div class="modal__header">
					<h2 class="modal__title">{title}</h2>
					<button class="modal__close" onclick={onclose} aria-label="닫기">&times;</button>
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
		background-color: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: var(--z-modal-backdrop);
		padding: var(--space-md);
	}

	.modal {
		background-color: var(--color-white);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 440px;
		max-height: 80vh;
		overflow-y: auto;
		z-index: var(--z-modal);
		box-shadow: var(--shadow-lg);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: var(--space-md) var(--space-lg);
			border-bottom: 1px solid var(--color-border);
		}

		&__title {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
		}

		&__close {
			font-size: 24px;
			color: var(--color-text-secondary);
			line-height: 1;

			&:hover {
				color: var(--color-text);
			}
		}

		&__body {
			padding: var(--space-lg);
		}
	}
</style>
