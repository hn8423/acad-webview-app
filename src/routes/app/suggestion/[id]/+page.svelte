<script lang="ts">
	import { page } from '$app/state';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getSuggestionDetail, createSuggestion } from '$lib/api/suggestion';
	import { headerStore } from '$lib/stores/header.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { formatDateTime } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { SuggestionDetail } from '$lib/types/academy';
	import { onMount } from 'svelte';
	import { z } from 'zod';

	let isNew = $derived(page.params.id === 'new');

	let suggestion = $state<SuggestionDetail | null>(null);
	let loading = $state(true);

	let title = $state('');
	let content = $state('');
	let errors = $state<Record<string, string>>({});
	let submitting = $state(false);

	const schema = z.object({
		title: z.string().min(1, '제목을 입력해주세요').max(200, '200자 이내로 입력해주세요'),
		content: z.string().min(1, '내용을 입력해주세요').max(2000, '2000자 이내로 입력해주세요')
	});

	$effect(() => {
		const token = headerStore.showBackHeader({
			title: isNew ? '건의하기' : '건의사항',
			onback: () => goto('/app/suggestion')
		});
		return () => headerStore.hideBackHeader(token);
	});

	onMount(async () => {
		if (page.params.id === 'new') {
			loading = false;
			return;
		}

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

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errors = {};
		const academyId = academyStore.academyId;
		if (!academyId) return;

		const parsed = schema.safeParse({
			title: title.trim(),
			content: content.trim()
		});

		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const field = String(issue.path[0]);
				if (!fieldErrors[field]) {
					fieldErrors[field] = issue.message;
				}
			}
			errors = fieldErrors;
			return;
		}

		submitting = true;
		try {
			const res = await createSuggestion(academyId, parsed.data);
			if (res.status) {
				toastStore.success('건의사항이 등록되었습니다.');
				goto('/app/suggestion');
			}
		} catch {
			// API client handles toast
		} finally {
			submitting = false;
		}
	}
</script>

<div class="suggestion-detail">
	<div class="suggestion-detail__content">
		{#if isNew}
			<form class="create-form" onsubmit={handleSubmit}>
				<Input
					label="제목"
					placeholder="건의사항 제목을 입력해주세요"
					bind:value={title}
					error={errors.title}
					maxlength={200}
				/>
				<div class="create-form__field">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="create-form__label">내용</label>
					<textarea
						class="create-form__textarea"
						class:create-form__textarea--error={!!errors.content}
						placeholder="건의하실 내용을 자유롭게 작성해주세요"
						bind:value={content}
						maxlength={2000}
						rows={8}
					></textarea>
					{#if errors.content}
						<span class="create-form__error">{errors.content}</span>
					{/if}
				</div>
				<div class="create-form__actions">
					<Button type="submit" fullWidth loading={submitting}>등록하기</Button>
				</div>
			</form>
		{:else if loading}
			<div class="suggestion-detail__loading">
				<Spinner />
			</div>
		{:else if suggestion}
			<article class="article">
				<header class="article__header">
					<h1 class="article__title">{suggestion.title}</h1>
					<div class="article__meta">
						<span>{formatDateTime(suggestion.created_at)}</span>
					</div>
				</header>
				<div class="article__body">{suggestion.content}</div>
			</article>
		{:else}
			<p class="suggestion-detail__empty">건의사항을 찾을 수 없습니다.</p>
		{/if}
	</div>
</div>

<style lang="scss">
	.suggestion-detail {
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
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-xl) var(--space-lg);

		&__field {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__textarea {
			width: 100%;
			padding: 14px 16px;
			border: none;
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			font-family: inherit;
			color: var(--color-text);
			background-color: var(--color-bg);
			outline: none;
			resize: vertical;
			min-height: 160px;
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

			&--error {
				background-color: var(--color-danger-bg);
				box-shadow: 0 0 0 2px var(--color-danger);
			}
		}

		&__error {
			font-size: var(--font-size-xs);
			color: var(--color-danger);
		}

		&__actions {
			padding-top: var(--space-sm);
		}
	}

	.article {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-xl) var(--space-lg);

		&__header {
			margin-bottom: var(--space-lg);
			padding-bottom: var(--space-md);
			border-bottom: 1px solid var(--color-divider);
		}

		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			line-height: var(--line-height-tight);
			margin-bottom: var(--space-sm);
		}

		&__meta {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__body {
			font-size: var(--font-size-base);
			line-height: var(--line-height-base);
			word-break: break-word;
			white-space: pre-line;
		}
	}
</style>
