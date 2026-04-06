<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import Spinner from './Spinner.svelte';

	interface Props {
		children: Snippet;
		threshold?: number;
		maxPull?: number;
	}

	let { children, threshold = 80, maxPull = 128 }: Props = $props();

	let containerEl: HTMLDivElement | undefined = $state();
	let pullDistance = $state(0);
	let isPulling = $state(false);
	let isRefreshing = $state(false);

	let startY = 0;
	let startX = 0;
	let isHorizontalSwipe = false;
	let directionLocked = false;

	function isInsideScrolledElement(target: EventTarget | null): boolean {
		let el = target as HTMLElement | null;
		while (el && el !== containerEl) {
			if (el.scrollTop > 0) return true;
			el = el.parentElement;
		}
		return false;
	}

	function handleTouchStart(e: TouchEvent) {
		if (isRefreshing) return;
		if (e.touches.length !== 1) return;
		if (window.scrollY > 0) return;
		if (isInsideScrolledElement(e.target)) return;

		startY = e.touches[0].clientY;
		startX = e.touches[0].clientX;
		isPulling = true;
		isHorizontalSwipe = false;
		directionLocked = false;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isPulling || isRefreshing) return;

		const currentY = e.touches[0].clientY;
		const currentX = e.touches[0].clientX;
		const deltaY = currentY - startY;
		const deltaX = currentX - startX;

		if (!directionLocked) {
			if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
				directionLocked = true;
				isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
			}
		}

		if (isHorizontalSwipe) {
			isPulling = false;
			pullDistance = 0;
			return;
		}

		if (deltaY <= 0) {
			pullDistance = 0;
			return;
		}

		e.preventDefault();
		pullDistance = Math.min(deltaY * 0.5, maxPull);
	}

	function handleTouchEnd() {
		if (!isPulling) return;
		isPulling = false;

		if (pullDistance >= threshold) {
			isRefreshing = true;
			pullDistance = 56;
			setTimeout(() => {
				location.reload();
			}, 200);
		} else {
			pullDistance = 0;
		}
	}

	onMount(() => {
		const el = containerEl;
		if (!el) return;

		el.addEventListener('touchmove', handleTouchMove, { passive: false });

		return () => {
			el.removeEventListener('touchmove', handleTouchMove);
		};
	});

	let indicatorOpacity = $derived(Math.min(pullDistance / threshold, 1));
	let arrowRotation = $derived(pullDistance >= threshold ? 180 : (pullDistance / threshold) * 180);
	let reachedThreshold = $derived(pullDistance >= threshold);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ptr"
	bind:this={containerEl}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	ontouchcancel={handleTouchEnd}
>
	<div
		class="ptr__indicator"
		style:opacity={indicatorOpacity}
		style:transform="translateY({pullDistance - 48}px)"
	>
		{#if isRefreshing}
			<Spinner size="sm" />
		{:else}
			<svg
				class="ptr__arrow"
				class:ptr__arrow--ready={reachedThreshold}
				style:transform="rotate({arrowRotation}deg)"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="12" y1="5" x2="12" y2="19" />
				<polyline points="19 12 12 19 5 12" />
			</svg>
		{/if}
	</div>
	<div
		class="ptr__content"
		style:transform="translateY({pullDistance}px)"
		style:transition={isPulling ? 'none' : undefined}
	>
		{@render children()}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.ptr {
		position: relative;

		&__indicator {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 48px;
			display: flex;
			align-items: center;
			justify-content: center;
			pointer-events: none;
			z-index: 1;
		}

		&__arrow {
			color: var(--color-text-muted);
			transition: color var(--transition-fast);

			&--ready {
				color: var(--color-primary);
			}
		}

		&__content {
			will-change: transform;
			transition: transform var(--transition-spring);
		}
	}
</style>
