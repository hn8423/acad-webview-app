<script lang="ts">
	import { page } from '$app/state';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getNoticeDetail } from '$lib/api/academy';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDateTime, formatFileSize } from '$lib/utils/format';
	import { processNoticeContent } from '$lib/utils/link';
	import type { Notice } from '$lib/types/academy';
	import { onMount } from 'svelte';

	let notice = $state<Notice | null>(null);
	let loading = $state(true);

	let processedContent = $derived(notice ? processNoticeContent(notice.content) : '');

	onMount(async () => {
		const academyId = academyStore.academyId;
		const noticeId = Number(page.params.id);
		if (!academyId || !noticeId) return;

		try {
			const res = await getNoticeDetail(academyId, noticeId);
			if (res.status && res.data) {
				notice = res.data;
			}
		} catch {
			// handle error
		} finally {
			loading = false;
		}
	});
</script>

<div class="notice-detail">
	<BackHeader title="공지사항" />

	<div class="notice-detail__content">
		{#if loading}
			<div class="notice-detail__loading">
				<Spinner />
			</div>
		{:else if notice}
			<article class="article">
				<header class="article__header">
					<h1 class="article__title">{notice.title}</h1>
					<div class="article__meta">
						<span>{notice.author_name}</span>
						<span class="article__meta-dot">&middot;</span>
						<span>{formatDateTime(notice.created_at)}</span>
					</div>
				</header>

				<div class="article__body">
					{@html processedContent}
				</div>

				{#if notice.files.length > 0}
					<div class="article__files">
						<h3 class="article__files-title">첨부파일</h3>
						{#each notice.files as file}
							<a href={file.file_url} class="file-item" download={file.file_name}>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
								</svg>
								<span class="file-item__name">{file.file_name}</span>
								<span class="file-item__size">{formatFileSize(file.file_size)}</span>
							</a>
						{/each}
					</div>
				{/if}
			</article>
		{:else}
			<p class="notice-detail__empty">공지사항을 찾을 수 없습니다.</p>
		{/if}
	</div>
</div>

<style lang="scss">
	.notice-detail {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-2xl);
		}
	}

	.article {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-xl) var(--space-lg);

		&__header {
			margin-bottom: var(--space-lg);
			padding-bottom: var(--space-md);
			border-bottom: 1px solid var(--color-divider);
		}

		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			line-height: var(--line-height-tight);
			margin-bottom: var(--space-sm);
		}

		&__meta {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__meta-dot {
			color: var(--color-text-muted);
		}

		&__body {
			font-size: var(--font-size-base);
			line-height: var(--line-height-base);
			word-break: break-word;

			:global(p) {
				margin-bottom: var(--space-sm);
			}

			:global(img) {
				max-width: 100%;
				border-radius: var(--radius-md);
			}

			:global(a) {
				color: var(--color-primary);
				text-decoration: underline;
				text-underline-offset: 2px;
				word-break: break-all;
				transition: opacity var(--transition-fast);

				&:active {
					opacity: 0.6;
				}
			}
		}

		&__files {
			margin-top: var(--space-xl);
			padding-top: var(--space-md);
			border-top: 1px solid var(--color-divider);
		}

		&__files-title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			margin-bottom: var(--space-sm);
			color: var(--color-text-secondary);
		}
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-xs);
		text-decoration: none;
		color: var(--color-text);
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-divider);
			text-decoration: none;
		}

		&__name {
			flex: 1;
			font-size: var(--font-size-sm);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		&__size {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
		}
	}
</style>
