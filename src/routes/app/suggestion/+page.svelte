<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getSuggestions } from '$lib/api/suggestion';
	import { headerStore } from '$lib/stores/header.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatDate } from '$lib/utils/format';
	import { getSuggestionStatusBadge } from '$lib/utils/suggestion';
	import { goto } from '$app/navigation';
	import type { Suggestion } from '$lib/types/academy';
	import { onMount } from 'svelte';

	let suggestions = $state<Suggestion[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	const LIMIT = 10;

	$effect(() => {
		const token = headerStore.showBackHeader({
			title: '건의사항',
			onback: () => goto('/app/profile')
		});
		return () => headerStore.hideBackHeader(token);
	});

	onMount(() => {
		fetchSuggestions();
	});

	async function fetchSuggestions() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getSuggestions(academyId, currentPage, LIMIT);
			if (res.status && res.data) {
				suggestions = res.data.list;
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
		await fetchSuggestions();
	}
</script>

<div class="suggestion-page">
	<div class="suggestion-page__content">
		{#if loading}
			<div class="suggestion-page__loading">
				<Spinner />
			</div>
		{:else if suggestions.length === 0}
			<p class="suggestion-page__empty">작성한 건의사항이 없습니다.</p>
		{:else}
			<div class="suggestion-section">
				{#each suggestions as suggestion, i}
					{@const statusBadge = getSuggestionStatusBadge(suggestion.status)}
					<button
						type="button"
						class="suggestion-row"
						onclick={() => goto(`/app/suggestion/${suggestion.id}`)}
					>
						<div class="suggestion-row__left">
							<Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
							<h3 class="suggestion-row__title">{suggestion.title}</h3>
							{#if suggestion.reply_count > 0}
								<span class="suggestion-row__replies">답글 {suggestion.reply_count}</span>
							{/if}
						</div>
						<div class="suggestion-row__right">
							<span class="suggestion-row__date">{formatDate(suggestion.created_at)}</span>
						</div>
					</button>
					{#if i < suggestions.length - 1}
						<div class="suggestion-divider"></div>
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

		{#if !loading}
			<div class="suggestion-page__actions">
				<Button fullWidth onclick={() => goto('/app/suggestion/new')}>건의하기</Button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.suggestion-page {
		&__content {
			padding: var(--space-md);
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

		&__actions {
			margin-top: var(--space-lg);
		}
	}

	.suggestion-section {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-sm) var(--space-lg);
	}

	.suggestion-divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.suggestion-row {
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

		&__replies {
			font-size: var(--font-size-xs);
			color: var(--color-primary);
			white-space: nowrap;
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
				color: var(--color-on-primary);
			}
		}
	}
</style>
