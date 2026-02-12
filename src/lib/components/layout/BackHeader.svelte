<script lang="ts">
	interface Props {
		title: string;
		onback?: () => void;
	}

	let { title, onback }: Props = $props();

	function handleBack() {
		if (onback) {
			onback();
		} else if (typeof window !== 'undefined') {
			window.history.back();
		}
	}
</script>

<header class="back-header">
	<button class="back-header__btn" onclick={handleBack} aria-label="뒤로가기">
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		>
			<path d="M15 18l-6-6 6-6" />
		</svg>
	</button>
	<h1 class="back-header__title">{title}</h1>
	<div class="back-header__spacer"></div>
</header>

<style lang="scss">
	.back-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--header-height);
		background-color: var(--color-white);
		display: flex;
		align-items: center;
		padding: 0 var(--space-xs);
		z-index: var(--z-header);

		&__btn {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 44px;
			height: 44px;
			border-radius: var(--radius-full);
			color: var(--color-text);
			transition: background-color var(--transition-fast);

			&:hover {
				background-color: var(--color-bg);
			}
		}

		&__title {
			flex: 1;
			text-align: center;
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-bold);
		}

		&__spacer {
			width: 44px;
		}
	}
</style>
