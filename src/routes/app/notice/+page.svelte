<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getNotices } from '$lib/api/academy';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatDate } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { Notice } from '$lib/types/academy';
	import { onMount } from 'svelte';

	let notices = $state<Notice[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	const LIMIT = 10;

	onMount(() => {
		fetchNotices();
	});

	async function fetchNotices() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getNotices(academyId, currentPage, LIMIT);
			if (res.status && res.data) {
				notices = res.data.list;
				totalPages = Math.ceil(res.data.meta.total / LIMIT);
			}
		} catch {
			// handle error
		} finally {
			loading = false;
		}
	}

	async function goToPage(page: number) {
		currentPage = page;
		await fetchNotices();
	}
</script>

<div class="notice-page">
	<BackHeader title="공지사항" onback={() => goto('/app')} />

	<div class="notice-page__content">
		{#if loading}
			<div class="notice-page__loading">
				<Spinner />
			</div>
		{:else if notices.length === 0}
			<p class="notice-page__empty">공지사항이 없습니다.</p>
		{:else}
			<div class="notice-section">
				{#each notices as notice, i}
					<button type="button" class="notice-row" onclick={() => goto(`/app/notice/${notice.id}`)}>
						<div class="notice-row__left">
							{#if notice.is_pinned}
								<Badge variant="info">고정</Badge>
							{/if}
							<h3 class="notice-row__title">{notice.title}</h3>
						</div>
						<div class="notice-row__right">
							<span class="notice-row__date">{formatDate(notice.created_at)}</span>
						</div>
					</button>
					{#if i < notices.length - 1}
						<div class="notice-divider"></div>
					{/if}
				{/each}
			</div>

			{#if totalPages > 1}
				<div class="pagination">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
						<button
							class="pagination__btn"
							class:pagination__btn--active={page === currentPage}
							onclick={() => goToPage(page)}
						>
							{page}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	.notice-page {
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

	.notice-section {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-sm) var(--space-lg);
	}

	.notice-divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.notice-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: 14px 0;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.6;
		}

		&__left {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			flex: 1;
			min-width: 0;
		}

		&__title {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: var(--color-text);
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
		}
	}

	.pagination {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);

		&__btn {
			width: 36px;
			height: 36px;
			border-radius: var(--radius-full);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			background: none;
			border: none;
			cursor: pointer;
			transition: all var(--transition-fast);

			&:hover {
				background-color: var(--color-divider);
			}

			&--active {
				background: var(--color-primary-gradient);
				color: var(--color-white);
			}
		}
	}
</style>
