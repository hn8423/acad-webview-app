<script lang="ts">
	import { page } from '$app/state';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getSuggestionDetail } from '$lib/api/suggestion';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SuggestionReplies from '$lib/components/suggestion/SuggestionReplies.svelte';
	import { formatDateTime } from '$lib/utils/format';
	import { getSuggestionStatusBadge } from '$lib/utils/suggestion';
	import { goto } from '$app/navigation';
	import type { SuggestionDetail } from '$lib/types/academy';
	import { onMount } from 'svelte';

	let suggestion = $state<SuggestionDetail | null>(null);
	let loading = $state(true);

	// 관리자가 답글을 달면 백엔드가 ANSWERED로 전이시키므로 배지를 즉시 맞춰준다.
	function markAnswered() {
		if (!suggestion) return;
		suggestion = { ...suggestion, status: 'ANSWERED' };
	}

	onMount(async () => {
		const academyId = academyStore.academyId;
		const suggestionId = Number(page.params.id);
		if (!academyId || !suggestionId) {
			loading = false;
			return;
		}

		try {
			const res = await getSuggestionDetail(academyId, suggestionId);
			if (res.status && res.data) {
				suggestion = res.data;
			}
		} catch {
			// handle error
		} finally {
			loading = false;
		}
	});
</script>

<div class="suggestion-detail">
	<BackHeader title="건의사항" onback={() => goto('/admin/suggestions')} />

	{#if loading}
		<div class="suggestion-detail__loading">
			<Spinner />
		</div>
	{:else if suggestion}
		{@const statusBadge = getSuggestionStatusBadge(suggestion.status)}
		<article class="article">
			<header class="article__header">
				<div class="article__title-row">
					<Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
					<h1 class="article__title">{suggestion.title}</h1>
				</div>
				<div class="article__meta">
					<span>{suggestion.author_name}</span>
					<span class="article__meta-dot">&middot;</span>
					<span>{formatDateTime(suggestion.created_at)}</span>
				</div>
			</header>
			<div class="article__body">{suggestion.content}</div>
		</article>

		<div class="suggestion-detail__replies">
			<SuggestionReplies suggestionId={suggestion.id} onreplied={markAnswered} />
		</div>
	{:else}
		<p class="suggestion-detail__empty">건의사항을 찾을 수 없습니다.</p>
	{/if}
</div>

<style lang="scss">
	.suggestion-detail {
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

		&__replies {
			margin-top: var(--space-md);
		}
	}

	.article {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: var(--space-xl) var(--space-lg);
		margin-top: var(--space-md);

		&__header {
			margin-bottom: var(--space-lg);
			padding-bottom: var(--space-md);
			border-bottom: 1px solid var(--color-divider);
		}

		&__title-row {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-sm);
		}

		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			line-height: var(--line-height-tight);
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
			white-space: pre-line;
		}
	}
</style>
