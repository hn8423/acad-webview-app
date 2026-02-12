<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import Toast from './Toast.svelte';

	let currentToast = $derived(toastStore.items[0] ?? null);
</script>

{#if currentToast}
	{#key currentToast.id}
		<Toast message={currentToast.message} type={currentToast.type} />
	{/key}
{/if}
