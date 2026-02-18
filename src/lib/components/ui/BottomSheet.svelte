<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		isOpen: boolean;
		title?: string;
		onclose: () => void;
		children: Snippet;
	}

	let { isOpen = $bindable(false), title = '', onclose, children }: Props = $props();

	let startY = $state(0);
	let currentY = $state(0);
	let isDragging = $state(false);

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

	function handleTouchStart(e: TouchEvent) {
		startY = e.touches[0].clientY;
		isDragging = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		currentY = Math.max(0, e.touches[0].clientY - startY);
	}

	function handleTouchEnd() {
		if (currentY > 100) {
			onclose();
		}
		currentY = 0;
		isDragging = false;
	}
</script>

<svelte:window onkeydown={isOpen ? handleKeydown : undefined} />

{#if isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="sheet-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="sheet"
			style:transform="translateY({currentY}px)"
			style:transition={isDragging ? 'none' : undefined}
		>
			<div
				class="sheet__handle"
				ontouchstart={handleTouchStart}
				ontouchmove={handleTouchMove}
				ontouchend={handleTouchEnd}
				role="presentation"
			>
				<span class="sheet__handle-bar"></span>
			</div>
			{#if title}
				<div class="sheet__header">
					<h2 class="sheet__title">{title}</h2>
				</div>
			{/if}
			<div class="sheet__body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background-color: var(--color-backdrop);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: var(--z-bottomsheet);
		padding: 0;
	}

	.sheet {
		background-color: var(--color-white);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: var(--shadow-xl);
		animation: slide-up 300ms cubic-bezier(0.32, 0.72, 0, 1);
		transition: transform var(--transition-spring);

		&__handle {
			display: flex;
			justify-content: center;
			padding: 12px 0 4px;
			cursor: grab;
			touch-action: none;
		}

		&__handle-bar {
			width: 36px;
			height: 4px;
			background-color: var(--color-divider);
			border-radius: var(--radius-full);
		}

		&__header {
			padding: var(--space-sm) var(--space-lg) var(--space-md);
		}

		&__title {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
		}

		&__body {
			padding: 0 var(--space-lg) var(--space-2xl);
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
