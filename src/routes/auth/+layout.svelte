<script lang="ts">
	let { children } = $props();
</script>

<div class="auth-layout">
	{@render children()}
</div>

<style lang="scss">
	.auth-layout {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		padding: var(--space-lg);
		background: linear-gradient(180deg, rgba(139, 92, 246, 0.15) 0%, var(--color-bg) 50%);
	}
</style>
