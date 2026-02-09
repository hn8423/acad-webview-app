<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/global.scss';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		authStore.initialize();
		academyStore.initialize();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#4a90d9" />
</svelte:head>

{@render children()}
