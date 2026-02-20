<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/global.scss';
	import '$lib/stores/auth.svelte';
	import '$lib/stores/academy.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

	let { children } = $props();

	onMount(() => {
		authStore.initialize();
		academyStore.initialize();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#110e1a" />
</svelte:head>

{@render children()}

<ToastContainer />
