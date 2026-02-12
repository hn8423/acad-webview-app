<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getNotices, deleteNotice } from '$lib/api/academy';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { formatDate } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { Notice } from '$lib/types/academy';
	import { onMount } from 'svelte';

	let notices = $state<Notice[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let deleteTarget = $state<Notice | null>(null);
	let showDeleteModal = $state(false);
	const LIMIT = 10;

	onMount(() => fetchNotices());

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

	function confirmDelete(notice: Notice) {
		deleteTarget = notice;
		showDeleteModal = true;
	}

	async function handleDelete() {
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		try {
			await deleteNotice(academyId, deleteTarget.id);
			showDeleteModal = false;
			deleteTarget = null;
			await fetchNotices();
		} catch {
			// handle error
		}
	}
</script>

<div class="admin-notices">
	<div class="admin-notices__header">
		<h1 class="admin-notices__title">공지사항 관리</h1>
		<Button size="sm" onclick={() => goto('/admin/notices/new')}>새 공지 작성</Button>
	</div>

	{#if loading}
		<div class="admin-notices__loading">
			<Spinner />
		</div>
	{:else if notices.length === 0}
		<p class="admin-notices__empty">공지사항이 없습니다.</p>
	{:else}
		<div class="notice-list">
			{#each notices as notice, i}
				<div class="notice-row" role="listitem">
					<div
						class="notice-row__left"
						role="button"
						tabindex="0"
						onclick={() => goto(`/admin/notices/${notice.id}`)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(`/admin/notices/${notice.id}`);
							}
						}}
					>
						{#if notice.is_pinned}
							<Badge variant="info">고정</Badge>
						{/if}
						<h3 class="notice-row__title">{notice.title}</h3>
					</div>
					<div class="notice-row__right">
						<span class="notice-row__date">{formatDate(notice.created_at)}</span>
						<button
							class="notice-row__delete"
							onclick={() => confirmDelete(notice)}
							aria-label="삭제"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
				</div>
				{#if i < notices.length - 1}
					<div class="notice-list__divider"></div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<Modal isOpen={showDeleteModal} title="공지 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">"{deleteTarget?.title}" 공지를 삭제하시겠습니까?</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<style lang="scss">
	.admin-notices {
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

	.notice-list {
		display: flex;
		flex-direction: column;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.notice-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.notice-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) 0;

		&__left {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			flex: 1;
			min-width: 0;
			cursor: pointer;
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

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
		}

		&__delete {
			color: var(--color-text-muted);
			padding: 6px;
			border-radius: var(--radius-sm);
			transition: all var(--transition-fast);

			&:hover {
				color: var(--color-danger);
				background-color: var(--color-danger-bg);
			}
		}
	}

	.modal-message {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		line-height: var(--line-height-base);
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}
</style>
