<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getSuggestions } from '$lib/api/suggestion';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { Suggestion } from '$lib/types/academy';
	import { onMount } from 'svelte';

	let suggestions = $state<Suggestion[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	const LIMIT = 10;

	onMount(() => fetchSuggestions());

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

<div class="admin-suggestions">
	<div class="admin-suggestions__header">
		<h1 class="admin-suggestions__title">건의사항 관리</h1>
	</div>

	{#if loading}
		<div class="admin-suggestions__loading">
			<Spinner />
		</div>
	{:else if suggestions.length === 0}
		<p class="admin-suggestions__empty">접수된 건의사항이 없습니다.</p>
	{:else}
		<div class="suggestion-list">
			{#each suggestions as suggestion, i}
				<button
					type="button"
					class="suggestion-row"
					onclick={() => goto(`/admin/suggestions/${suggestion.id}`)}
				>
					<div class="suggestion-row__left">
						{#if suggestion.status === 'PENDING'}
							<Badge variant="warning">대기</Badge>
						{/if}
						<h3 class="suggestion-row__title">{suggestion.title}</h3>
					</div>
					<div class="suggestion-row__right">
						<span class="suggestion-row__author">{suggestion.author_name}</span>
						<span class="suggestion-row__date">{formatDate(suggestion.created_at)}</span>
					</div>
				</button>
				{#if i < suggestions.length - 1}
					<div class="suggestion-list__divider"></div>
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

<style lang="scss">
	.admin-suggestions {
		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-lg);
		}

		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			color: var(--color-text);
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

	.suggestion-list {
		display: flex;
		flex-direction: column;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.suggestion-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.suggestion-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) 0;
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
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: var(--color-text);
		}

		&__right {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__author {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
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
