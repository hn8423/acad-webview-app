<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getNoticeDetail, createNotice, updateNotice } from '$lib/api/academy';
	import { sendNotification } from '$lib/api/notification';
	import { toastStore } from '$lib/stores/toast.svelte';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { onMount } from 'svelte';

	let isNew = $derived(page.params.id === 'new');
	let title = $state('');
	let content = $state('');
	let isPinned = $state(false);
	let loading = $state(false);
	let pageLoading = $state(true);
	let error = $state('');

	onMount(async () => {
		if (!isNew) {
			const academyId = academyStore.academyId;
			const noticeId = Number(page.params.id);
			if (!academyId || !noticeId) return;

			try {
				const res = await getNoticeDetail(academyId, noticeId);
				if (res.status && res.data) {
					title = res.data.title;
					content = res.data.content;
					isPinned = res.data.is_pinned === 1;
				}
			} catch {
				error = '공지를 불러오지 못했습니다.';
			}
		}
		pageLoading = false;
	});

	async function handleSubmit() {
		error = '';
		if (!title.trim()) {
			error = '제목을 입력해주세요.';
			return;
		}
		if (!content.trim()) {
			error = '내용을 입력해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const data = { title, content, is_pinned: isPinned ? 1 : 0 };

			if (isNew) {
				await createNotice(academyId, data);
				try {
					await sendNotification(academyId, {
						title,
						content: content.length > 100 ? content.slice(0, 100) + '...' : content,
						notification_type: 'GENERAL'
					});
				} catch {
					toastStore.error('공지는 등록되었으나 알림 발송에 실패했습니다.');
				}
			} else {
				await updateNotice(academyId, Number(page.params.id), data);
			}
			goto('/admin/notices', { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : '저장에 실패했습니다.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="notice-form">
	<BackHeader title={isNew ? '공지 작성' : '공지 수정'} onback={() => goto('/admin/notices')} />

	<div class="notice-form__content">
		{#if pageLoading}
			<div class="notice-form__loading">
				<Spinner />
			</div>
		{:else}
			<form
				class="form"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<Input label="제목" placeholder="공지 제목을 입력하세요" bind:value={title} />

				<div class="form__field">
					<label class="form__label" for="notice-content">내용</label>
					<textarea
						id="notice-content"
						class="form__textarea"
						placeholder="공지 내용을 입력하세요"
						bind:value={content}
					></textarea>
				</div>

				<div class="form__field">
					<label class="form__checkbox">
						<input type="checkbox" bind:checked={isPinned} />
						<span>상단 고정</span>
					</label>
				</div>

				{#if error}
					<p class="form__error">{error}</p>
				{/if}

				<Button type="submit" fullWidth {loading}>
					{isNew ? '작성하기' : '수정하기'}
				</Button>
			</form>
		{/if}
	</div>
</div>

<style lang="scss">
	.notice-form {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__textarea {
			width: 100%;
			min-height: 200px;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			font-family: inherit;
			resize: vertical;
			outline: none;
			color: var(--color-text);
			transition: box-shadow var(--transition-fast);

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}

			&::placeholder {
				color: var(--color-text-muted);
			}
		}

		&__checkbox {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			font-size: var(--font-size-base);
			cursor: pointer;
			color: var(--color-text);

			input {
				width: 20px;
				height: 20px;
				accent-color: var(--color-primary);
			}
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}
	}
</style>
