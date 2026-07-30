<script lang="ts">
	import { getComments, createComment, deleteComment } from '$lib/api/ensemble';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { getRelativeTime } from '$lib/utils/format';
	import { z } from 'zod';
	import type { EnsembleComment } from '$lib/types/ensemble';

	interface Props {
		ensembleId: number;
	}

	let { ensembleId }: Props = $props();

	const commentSchema = z
		.string()
		.trim()
		.min(1, '댓글을 입력해주세요')
		.max(500, '500자 이내로 입력해주세요');

	let comments = $state<EnsembleComment[]>([]);
	let loading = $state(true);
	let content = $state('');
	let submitting = $state(false);
	let confirmDeleteId = $state<number | null>(null);
	let deleting = $state(false);

	$effect(() => {
		const signal = { cancelled: false };
		if (ensembleId) {
			loadComments(signal);
		}
		return () => {
			signal.cancelled = true;
			comments = [];
			loading = true;
			confirmDeleteId = null;
		};
	});

	async function loadComments(signal: { cancelled: boolean }) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getComments(academyId, ensembleId);
			if (!signal.cancelled && res.status) {
				comments = res.data;
			}
		} catch {
			// API client handles toast
		} finally {
			if (!signal.cancelled) {
				loading = false;
			}
		}
	}

	async function handleSubmit() {
		const parsed = commentSchema.safeParse(content);
		if (!parsed.success) {
			toastStore.error(parsed.error.issues[0].message);
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		submitting = true;
		try {
			const res = await createComment(academyId, ensembleId, { content: parsed.data });
			if (res.status) {
				comments = [...comments, res.data];
				content = '';
			}
		} catch {
			// API client handles toast
		} finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		const targetId = confirmDeleteId;
		const academyId = academyStore.academyId;
		if (targetId === null || !academyId) return;

		deleting = true;
		try {
			const res = await deleteComment(academyId, ensembleId, targetId);
			if (res.status) {
				comments = comments.filter((c) => c.id !== targetId);
				toastStore.success('댓글이 삭제되었습니다.');
			}
		} catch {
			// API client handles toast
		} finally {
			deleting = false;
			confirmDeleteId = null;
		}
	}
</script>

<section class="ensemble-comments">
	<h3 class="ensemble-comments__title">댓글 ({comments.length})</h3>

	{#if loading}
		<div class="ensemble-comments__loading">
			<Spinner />
		</div>
	{:else if comments.length === 0}
		<p class="ensemble-comments__empty">첫 댓글을 남겨보세요.</p>
	{:else}
		<ul class="comment-list">
			{#each comments as comment (comment.id)}
				<li class="comment-item">
					<div class="comment-item__header">
						<span class="comment-item__author">{comment.user_name}</span>
						<span class="comment-item__time">{getRelativeTime(comment.created_at)}</span>
						{#if comment.member_id === academyStore.memberId}
							<button
								type="button"
								class="comment-item__delete"
								onclick={() => (confirmDeleteId = comment.id)}
							>
								삭제
							</button>
						{/if}
					</div>
					<p class="comment-item__content">{comment.content}</p>
					{#if confirmDeleteId === comment.id}
						<div class="comment-item__confirm">
							<p class="comment-item__confirm-message">댓글을 삭제하시겠습니까?</p>
							<div class="comment-item__confirm-buttons">
								<Button
									size="sm"
									variant="secondary"
									onclick={() => (confirmDeleteId = null)}
									disabled={deleting}
								>
									취소
								</Button>
								<Button size="sm" variant="danger" loading={deleting} onclick={handleDelete}>
									확인
								</Button>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<form
		class="comment-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<textarea
			class="comment-form__input"
			placeholder="댓글을 입력하세요"
			bind:value={content}
			maxlength={500}
			rows={2}
			disabled={submitting}
		></textarea>
		<Button type="submit" size="sm" loading={submitting} disabled={!content.trim()}>등록</Button>
	</form>
</section>

<style lang="scss">
	.ensemble-comments {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		background-color: var(--color-bg-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-md);

		&__title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-lg);
		}

		&__empty {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			text-align: center;
			padding: var(--space-lg) 0;
		}
	}

	.comment-list {
		display: flex;
		flex-direction: column;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.comment-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px 0;
		border-bottom: 1px solid var(--color-divider);

		&:last-child {
			border-bottom: none;
		}

		&__header {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__author {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__time {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__delete {
			margin-left: auto;
			border: none;
			background: none;
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			cursor: pointer;
			padding: 4px;

			&:active {
				color: var(--color-danger);
			}
		}

		&__content {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			line-height: 1.5;
			white-space: pre-wrap;
			word-break: break-word;
		}

		&__confirm {
			background-color: var(--color-warning-bg);
			border-radius: var(--radius-md);
			padding: var(--space-sm);
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: 4px;
		}

		&__confirm-message {
			font-size: var(--font-size-sm);
			color: var(--color-text);
			text-align: center;
		}

		&__confirm-buttons {
			display: flex;
			gap: var(--space-sm);
			justify-content: center;
		}
	}

	.comment-form {
		display: flex;
		align-items: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);

		&__input {
			flex: 1;
			padding: 10px 14px;
			border: none;
			border-radius: var(--radius-md);
			font-size: var(--font-size-sm);
			font-family: inherit;
			color: var(--color-text);
			background-color: var(--color-bg);
			outline: none;
			resize: none;
			transition:
				background-color var(--transition-fast),
				box-shadow var(--transition-fast);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				background-color: var(--color-primary-bg);
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}
	}
</style>
