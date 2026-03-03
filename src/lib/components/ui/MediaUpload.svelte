<script lang="ts">
	import Spinner from './Spinner.svelte';
	import { uploadMedia, validateMediaFile, isImageType, isVideoType } from '$lib/api/upload';

	interface Props {
		value?: string;
		label?: string;
		disabled?: boolean;
	}

	let { value = $bindable(''), label = '미디어 첨부', disabled = false }: Props = $props();

	let uploading = $state(false);
	let error = $state('');
	let dragOver = $state(false);
	let fileInputRef: HTMLInputElement | undefined = $state(undefined);

	const hasMedia = $derived(!!value);
	const mediaIsImage = $derived(value ? isImageType(value) : false);
	const mediaIsVideo = $derived(value ? isVideoType(value) : false);

	async function handleFile(file: File) {
		if (uploading) return;

		error = '';
		const validationError = validateMediaFile(file);
		if (validationError) {
			error = validationError;
			return;
		}

		uploading = true;
		try {
			const res = await uploadMedia(file);
			if (res.status && res.data?.uploaded_files?.length > 0) {
				value = res.data.uploaded_files[0].file_url;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '업로드에 실패했습니다.';
		} finally {
			uploading = false;
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
		input.value = '';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) handleFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragOver = false;
	}

	function handleRemove() {
		value = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fileInputRef?.click();
		}
	}
</script>

<div class="media-upload" class:media-upload--disabled={disabled}>
	{#if label}
		<span class="media-upload__label">{label}</span>
	{/if}

	{#if uploading}
		<div class="media-upload__zone media-upload__zone--uploading">
			<Spinner />
			<span class="media-upload__hint">업로드 중...</span>
		</div>
	{:else if hasMedia}
		<div class="media-upload__preview">
			{#if mediaIsImage}
				<img src={value} alt="첨부된 이미지" class="media-upload__image" />
			{:else if mediaIsVideo}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={value} class="media-upload__video" controls preload="metadata"></video>
			{:else}
				<a href={value} target="_blank" rel="noopener noreferrer" class="media-upload__link">
					파일 링크
				</a>
			{/if}
			{#if !disabled}
				<button class="media-upload__remove" onclick={handleRemove} type="button" aria-label="삭제">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M4 4L12 12M12 4L4 12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			{/if}
		</div>
	{:else}
		<div
			class="media-upload__zone"
			class:media-upload__zone--drag={dragOver}
			role="button"
			tabindex="0"
			aria-label="미디어 파일 업로드"
			onclick={() => fileInputRef?.click()}
			onkeydown={handleKeydown}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<svg
				class="media-upload__icon"
				width="32"
				height="32"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="17 8 12 3 7 8" />
				<line x1="12" y1="3" x2="12" y2="15" />
			</svg>
			<span class="media-upload__text">파일을 선택하거나 드래그하세요</span>
			<span class="media-upload__hint">이미지 또는 영상 (최대 100MB)</span>
		</div>
	{/if}

	{#if error}
		<span class="media-upload__error">{error}</span>
	{/if}

	<input
		bind:this={fileInputRef}
		type="file"
		accept="image/*,video/*"
		class="media-upload__input"
		onchange={handleFileSelect}
		{disabled}
	/>
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.media-upload {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__zone {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: var(--space-sm);
			padding: var(--space-xl) var(--space-md);
			border: 2px dashed var(--color-border);
			border-radius: var(--radius-md);
			background: var(--color-bg);
			cursor: pointer;
			transition:
				border-color var(--transition-fast),
				background-color var(--transition-fast);

			&:hover {
				border-color: var(--color-primary-light);
			}

			&--drag {
				border-color: var(--color-primary);
				background: var(--color-primary-bg);
			}

			&--uploading {
				cursor: default;
				pointer-events: none;
			}
		}

		&__icon {
			color: var(--color-text-muted);
		}

		&__text {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__hint {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__preview {
			position: relative;
			border-radius: var(--radius-md);
			overflow: hidden;
			background: var(--color-bg);
		}

		&__image {
			width: 100%;
			max-height: 300px;
			object-fit: contain;
			display: block;
			border-radius: var(--radius-md);
		}

		&__video {
			width: 100%;
			max-height: 300px;
			display: block;
			border-radius: var(--radius-md);
		}

		&__link {
			display: block;
			padding: var(--space-md);
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			text-decoration: underline;
			word-break: break-all;
		}

		&__remove {
			position: absolute;
			top: var(--space-sm);
			right: var(--space-sm);
			width: 32px;
			height: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(0, 0, 0, 0.6);
			border: none;
			border-radius: var(--radius-full);
			color: #fff;
			cursor: pointer;
			transition: background-color var(--transition-fast);

			&:hover {
				background: rgba(0, 0, 0, 0.8);
			}
		}

		&__error {
			font-size: var(--font-size-xs);
			color: var(--color-danger);
		}

		&__input {
			display: none;
		}

		&--disabled {
			opacity: 0.5;
			pointer-events: none;
		}
	}
</style>
