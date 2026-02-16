<script lang="ts">
	import { tick, untrack } from 'svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import ChatBubble from './ChatBubble.svelte';
	import { formatChatDateSeparator, isSameDay, getRelativeTime } from '$lib/utils/format';
	import type { EnsembleMessage, EnsembleComment } from '$lib/types/ensemble';

	interface Props {
		messages: EnsembleMessage[];
		legacyComments: EnsembleComment[];
		currentMemberId: number;
		loading: boolean;
		loadingMore: boolean;
		hasMore: boolean;
		onloadmore: () => void;
	}

	let {
		messages,
		legacyComments,
		currentMemberId,
		loading,
		loadingMore,
		hasMore,
		onloadmore
	}: Props = $props();

	let scrollContainer: HTMLDivElement | undefined = $state();
	let isAtBottom = $state(true);
	let showLegacyComments = $state(false);
	let prevMessageCount = 0;

	function shouldShowSender(msg: EnsembleMessage, index: number): boolean {
		if (msg.sender_member_id === currentMemberId) return false;
		if (index === 0) return true;
		const prev = messages[index - 1];
		if (!prev) return true;
		return (
			prev.sender_member_id !== msg.sender_member_id ||
			!isSameDay(prev.created_at, msg.created_at)
		);
	}

	function shouldShowDateSeparator(msg: EnsembleMessage, index: number): boolean {
		if (index === 0) return true;
		const prev = messages[index - 1];
		if (!prev) return true;
		return !isSameDay(prev.created_at, msg.created_at);
	}

	function handleScroll() {
		if (!scrollContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
		isAtBottom = scrollHeight - scrollTop - clientHeight < 40;

		if (scrollTop < 50 && hasMore && !loading && !loadingMore) {
			onloadmore();
		}
	}

	async function scrollToBottom() {
		await tick();
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	$effect(() => {
		const currentCount = messages.length;
		const prev = untrack(() => prevMessageCount);
		if (currentCount > prev && isAtBottom) {
			scrollToBottom();
		}
		prevMessageCount = currentCount;
	});

	$effect(() => {
		if (!loading && messages.length > 0) {
			scrollToBottom();
		}
	});
</script>

<div class="message-list" bind:this={scrollContainer} onscroll={handleScroll}>
	{#if loading}
		<div class="message-list__loading">
			<Spinner />
		</div>
	{:else}
		<!-- Legacy Comments -->
		{#if legacyComments.length > 0}
			<div class="legacy-comments">
				<button
					class="legacy-comments__toggle"
					onclick={() => (showLegacyComments = !showLegacyComments)}
				>
					이전 댓글 ({legacyComments.length})
					<span
						class="legacy-comments__arrow"
						class:legacy-comments__arrow--open={showLegacyComments}
					>
						&#9662;
					</span>
				</button>
				{#if showLegacyComments}
					<div class="legacy-comments__list">
						{#each legacyComments as comment (comment.id)}
							<div class="legacy-comment">
								<div class="legacy-comment__header">
									<span class="legacy-comment__author">{comment.user_name}</span>
									<span class="legacy-comment__date">
										{getRelativeTime(comment.created_at)}
									</span>
								</div>
								<p class="legacy-comment__content">{comment.content}</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Messages -->
		{#if messages.length === 0}
			<p class="message-list__empty">아직 메시지가 없습니다.</p>
		{:else}
			{#each messages as msg, i (msg.id)}
				{#if shouldShowDateSeparator(msg, i)}
					<div class="date-separator">
						<span class="date-separator__text">
							{formatChatDateSeparator(msg.created_at)}
						</span>
					</div>
				{/if}
				<ChatBubble
					message={msg}
					isMine={msg.sender_member_id === currentMemberId}
					showSender={shouldShowSender(msg, i)}
				/>
			{/each}
		{/if}
	{/if}
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.message-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		overflow-y: auto;
		max-height: 50vh;
		padding: var(--space-sm) 0;
		-webkit-overflow-scrolling: touch;

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			text-align: center;
			padding: var(--space-xl) 0;
		}
	}

	.legacy-comments {
		margin-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-divider);
		padding-bottom: var(--space-sm);

		&__toggle {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			background: none;
			border: none;
			padding: var(--space-xs) 0;
			cursor: pointer;

			&:hover {
				color: var(--color-text-secondary);
			}
		}

		&__arrow {
			font-size: 10px;
			transition: transform var(--transition-fast);

			&--open {
				transform: rotate(180deg);
			}
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
			margin-top: var(--space-xs);
		}
	}

	.legacy-comment {
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg);
		border-radius: var(--radius-md);

		&__header {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: 2px;
		}

		&__author {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__date {
			font-size: 10px;
			color: var(--color-text-muted);
		}

		&__content {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.4;
			white-space: pre-wrap;
		}
	}

	.date-separator {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-sm) 0;

		&__text {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			background-color: var(--color-surface);
			padding: 2px var(--space-sm);
			border-radius: var(--radius-full);
		}
	}
</style>
