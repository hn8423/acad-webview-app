<script lang="ts">
	import { isImageType, isVideoType } from '$lib/api/upload';

	interface Props {
		url: string;
		alt?: string;
	}

	let { url, alt = '첨부 미디어' }: Props = $props();

	const isImage = $derived(isImageType(url));
	const isVideo = $derived(isVideoType(url));
</script>

<div class="media-display">
	{#if isImage}
		<img src={url} {alt} class="media-display__image" />
	{:else if isVideo}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video src={url} class="media-display__video" controls preload="metadata"></video>
	{:else}
		<a href={url} target="_blank" rel="noopener noreferrer" class="media-display__link">
			미디어 보기
		</a>
	{/if}
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.media-display {
		border-radius: var(--radius-md);
		overflow: hidden;

		&__image {
			width: 100%;
			max-height: 400px;
			object-fit: contain;
			display: block;
			border-radius: var(--radius-md);
		}

		&__video {
			width: 100%;
			max-height: 400px;
			display: block;
			border-radius: var(--radius-md);
		}

		&__link {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			text-decoration: underline;
		}
	}
</style>
