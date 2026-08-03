<script lang="ts">
	import {
		getSuggestionReplies,
		createSuggestionReply,
		deleteSuggestionReply
	} from '$lib/api/suggestion';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { getRelativeTime } from '$lib/utils/format';
	import { z } from 'zod';
	import type { SuggestionReply } from '$lib/types/academy';

	interface Props {
		suggestionId: number;
		/** 답글 등록 성공 시 호출. 관리자 화면에서 상태 배지를 갱신하는 용도. */
		onreplied?: () => void;
	}

	let { suggestionId, onreplied }: Props = $props();

	const MAX_REPLY_LENGTH = 2000;

	const replySchema = z
		.string()
		.trim()
		.min(1, '답글을 입력해주세요')
		.max(MAX_REPLY_LENGTH, `${MAX_REPLY_LENGTH}자 이내로 입력해주세요`);

	let replies = $state<SuggestionReply[]>([]);
	let loading = $state(true);
	let loadError = $state(false);
	let content = $state('');
	let submitting = $state(false);
	let confirmDeleteId = $state<number | null>(null);
	let deleting = $state(false);

	$effect(() => {
		const signal = { cancelled: false };
		if (suggestionId) {
			loadReplies(signal);
		} else {
			loading = false;
		}
		return () => {
			signal.cancelled = true;
			replies = [];
			loading = true;
			loadError = false;
			confirmDeleteId = null;
		};
	});

	async function loadReplies(signal: { cancelled: boolean }) {
		const academyId = academyStore.academyId;
		if (!academyId) {
			loading = false;
			return;
		}

		loading = true;
		loadError = false;
		try {
			const res = await getSuggestionReplies(academyId, suggestionId);
			if (signal.cancelled) return;
			if (res.status) {
				replies = res.data;
			} else {
				loadError = true;
			}
		} catch {
			if (!signal.cancelled) {
				loadError = true;
			}
		} finally {
			if (!signal.cancelled) {
				loading = false;
			}
		}
	}

	function retryLoad() {
		loadReplies({ cancelled: false });
	}

	async function handleSubmit() {
		const parsed = replySchema.safeParse(content);
		if (!parsed.success) {
			toastStore.error(parsed.error.issues[0].message);
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		submitting = true;
		try {
			const res = await createSuggestionReply(academyId, suggestionId, { content: parsed.data });
			if (res.status) {
				replies = [...replies, res.data];
				content = '';
				onreplied?.();
			} else {
				toastStore.error(res.message || '답글 등록에 실패했습니다.');
			}
		} catch {
			// HTTP 에러 toast는 API client가 처리
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
			const res = await deleteSuggestionReply(academyId, suggestionId, targetId);
			if (res.status) {
				replies = replies.filter((r) => r.id !== targetId);
				toastStore.success('답글이 삭제되었습니다.');
			} else {
				toastStore.error(res.message || '답글 삭제에 실패했습니다.');
			}
		} catch {
			// HTTP 에러 toast는 API client가 처리
		} finally {
			deleting = false;
			confirmDeleteId = null;
		}
	}
</script>

<section class="suggestion-replies">
	<h3 class="suggestion-replies__title">
		{loading || loadError ? '답글' : `답글 (${replies.length})`}
	</h3>

	{#if loading}
		<div class="suggestion-replies__loading">
			<Spinner />
		</div>
	{:else if loadError}
		<div class="suggestion-replies__error">
			<p>답글을 불러오지 못했습니다.</p>
			<Button size="sm" variant="secondary" onclick={retryLoad}>다시 시도</Button>
		</div>
	{:else if replies.length === 0}
		<p class="suggestion-replies__empty">아직 답글이 없습니다.</p>
	{:else}
		<ul class="reply-list">
			{#each replies as reply (reply.id)}
				<li class="reply-item">
					<div class="reply-item__header">
						<span class="reply-item__author">{reply.author_name}</span>
						{#if reply.author_role === 'ADMIN'}
							<Badge variant="info">관리자</Badge>
						{/if}
						<span class="reply-item__time">{getRelativeTime(reply.created_at)}</span>
						{#if reply.author_member_id === academyStore.memberId}
							<button
								type="button"
								class="reply-item__delete"
								aria-label="{reply.author_name}님의 답글 삭제"
								disabled={deleting}
								onclick={() => (confirmDeleteId = reply.id)}
							>
								삭제
							</button>
						{/if}
					</div>
					<p class="reply-item__content">{reply.content}</p>
					{#if confirmDeleteId === reply.id}
						<div class="reply-item__confirm" role="alertdialog" aria-label="답글 삭제 확인">
							<p class="reply-item__confirm-message">답글을 삭제하시겠습니까?</p>
							<div class="reply-item__confirm-buttons">
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
		class="reply-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<textarea
			class="reply-form__input"
			placeholder="답글을 입력하세요"
			aria-label="답글 입력"
			bind:value={content}
			maxlength={MAX_REPLY_LENGTH}
			rows={2}
			disabled={submitting}
		></textarea>
		<Button type="submit" size="sm" loading={submitting} disabled={!content.trim()}>등록</Button>
	</form>
</section>

<style lang="scss">
	.suggestion-replies {
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

		&__error {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: var(--space-sm);
			padding: var(--space-lg) 0;

			p {
				font-size: var(--font-size-sm);
				color: var(--color-text-muted);
			}
		}

		&__empty {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			text-align: center;
			padding: var(--space-lg) 0;
		}
	}

	.reply-list {
		display: flex;
		flex-direction: column;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.reply-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
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
			padding: var(--space-sm);
			margin-right: calc(var(--space-sm) * -1);

			&:active:not(:disabled) {
				color: var(--color-danger);
			}

			&:focus-visible {
				outline: 2px solid var(--color-primary-light);
				border-radius: var(--radius-sm);
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
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
			margin-top: var(--space-xs);
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

	.reply-form {
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
