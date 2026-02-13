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
		background: linear-gradient(180deg, var(--color-primary-bg) 0%, var(--color-bg) 40%);
	}
</style>
