<script lang="ts">
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getCategories, createCategory, updateCategory, deleteCategory } from '$lib/api/feedback';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { FeedbackCategory } from '$lib/types/feedback';
	import { onMount } from 'svelte';

	let categories = $state<FeedbackCategory[]>([]);
	let loading = $state(true);
	let fetchError = $state('');
	let submitting = $state(false);
	let error = $state('');

	// 생성/수정 모달
	let showFormModal = $state(false);
	let editTarget = $state<FeedbackCategory | null>(null);
	let categoryName = $state('');
	let sortOrder = $state('');

	// 삭제 모달
	let showDeleteModal = $state(false);
	let deleteTarget = $state<FeedbackCategory | null>(null);
	let deleting = $state(false);

	let formTitle = $derived(editTarget ? '카테고리 수정' : '카테고리 추가');

	onMount(() => fetchCategories());

	async function fetchCategories() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		fetchError = '';
		try {
			const res = await getCategories(academyId);
			if (res.status && res.data) {
				categories = [...res.data].sort((a, b) => a.sort_order - b.sort_order);
			} else {
				categories = [];
				fetchError = res.message || '카테고리 목록을 불러오는데 실패했습니다.';
			}
		} catch {
			fetchError = '카테고리 목록을 불러오는데 실패했습니다.';
		} finally {
			loading = false;
		}
	}

	function openCreateModal() {
		editTarget = null;
		categoryName = '';
		sortOrder = String(categories.length);
		error = '';
		showFormModal = true;
	}

	function openEditModal(cat: FeedbackCategory) {
		editTarget = cat;
		categoryName = cat.category_name;
		sortOrder = String(cat.sort_order);
		error = '';
		showFormModal = true;
	}

	async function handleSubmit() {
		error = '';
		if (!categoryName.trim()) {
			error = '카테고리 이름을 입력해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		submitting = true;
		try {
			if (editTarget) {
				const res = await updateCategory(academyId, editTarget.id, {
					category_name: categoryName.trim(),
					sort_order: Number(sortOrder)
				});
				if (!res.status) {
					error = res.message || '카테고리 수정에 실패했습니다.';
					return;
				}
				toastStore.success('카테고리가 수정되었습니다.');
			} else {
				const res = await createCategory(academyId, {
					category_name: categoryName.trim(),
					sort_order: sortOrder ? Number(sortOrder) : undefined
				});
				if (!res.status) {
					error = res.message || '카테고리 추가에 실패했습니다.';
					return;
				}
				toastStore.success('카테고리가 추가되었습니다.');
			}
			showFormModal = false;
			await fetchCategories();
		} catch (err) {
			error = err instanceof Error ? err.message : '저장에 실패했습니다.';
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(cat: FeedbackCategory) {
		deleteTarget = cat;
		showDeleteModal = true;
	}

	async function handleDelete() {
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		deleting = true;
		try {
			const res = await deleteCategory(academyId, deleteTarget.id);
			if (!res.status) {
				toastStore.error(res.message || '카테고리 삭제에 실패했습니다.');
				return;
			}
			toastStore.success('카테고리가 삭제되었습니다.');
			showDeleteModal = false;
			deleteTarget = null;
			await fetchCategories();
		} catch {
			toastStore.error('카테고리 삭제에 실패했습니다.');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="categories-page">
	<BackHeader title="평가 카테고리 관리" onback={() => goto('/admin/feedback')} />

	<div class="categories-page__content">
		<div class="categories-page__header">
			<Button size="sm" onclick={openCreateModal}>카테고리 추가</Button>
		</div>

		{#if loading}
			<div class="categories-page__loading">
				<Spinner />
			</div>
		{:else if fetchError}
			<p class="categories-page__error">{fetchError}</p>
		{:else if categories.length === 0}
			<p class="categories-page__empty">등록된 카테고리가 없습니다.</p>
		{:else}
			<div class="category-list">
				{#each categories as cat, i}
					<div class="category-item">
						<div class="category-item__info">
							<span class="category-item__order">{cat.sort_order}</span>
							<span class="category-item__name">{cat.category_name}</span>
						</div>
						<div class="category-item__actions">
							<button class="action-btn" onclick={() => openEditModal(cat)}>수정</button>
							<button class="action-btn action-btn--danger" onclick={() => confirmDelete(cat)}>
								삭제
							</button>
						</div>
					</div>
					{#if i < categories.length - 1}
						<div class="category-list__divider"></div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- 생성/수정 모달 -->
<Modal isOpen={showFormModal} title={formTitle} onclose={() => (showFormModal = false)}>
	<form
		class="create-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<Input label="카테고리 이름" bind:value={categoryName} placeholder="예: 음정, 리듬감" />
		<Input type="number" label="정렬 순서" bind:value={sortOrder} />

		{#if error}
			<p class="create-form__error">{error}</p>
		{/if}

		<div class="create-form__actions">
			<Button type="submit" fullWidth loading={submitting}>
				{editTarget ? '수정하기' : '추가하기'}
			</Button>
			<Button variant="secondary" fullWidth onclick={() => (showFormModal = false)}>취소</Button>
		</div>
	</form>
</Modal>

<!-- 삭제 확인 모달 -->
<Modal isOpen={showDeleteModal} title="카테고리 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">"{deleteTarget?.category_name}" 카테고리를 삭제하시겠습니까?</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete} loading={deleting}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<style lang="scss">
	.categories-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__header {
			display: flex;
			justify-content: flex-end;
			margin-bottom: var(--space-md);
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

		&__error {
			text-align: center;
			color: var(--color-danger);
			padding: var(--space-2xl);
		}
	}

	.category-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.category-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.category-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) 0;

		&__info {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__order {
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: var(--color-bg);
			border-radius: var(--radius-full);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__actions {
			display: flex;
			gap: var(--space-sm);
		}
	}

	.action-btn {
		font-size: var(--font-size-sm);
		color: var(--color-primary);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);

		&:hover {
			background: var(--color-primary-bg);
		}

		&--danger {
			color: var(--color-danger);

			&:hover {
				background: var(--color-danger-bg);
			}
		}
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
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
