<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { z } from 'zod';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onsubmit: (data: { role: string; introduction?: string }) => void;
		submitting?: boolean;
	}

	let { isOpen = $bindable(false), onclose, onsubmit, submitting = false }: Props = $props();

	let role = $state('');
	let introduction = $state('');
	let validationError = $state('');

	const schema = z.object({
		role: z.string().trim().min(1, '파트를 입력해주세요').max(20, '20자 이내로 입력해주세요'),
		introduction: z
			.string()
			.max(200, '200자 이내로 입력해주세요')
			.optional()
			.transform((v) => v?.trim() || undefined)
	});

	$effect(() => {
		if (isOpen) {
			role = '';
			introduction = '';
			validationError = '';
		}
	});

	function handleSubmit() {
		validationError = '';

		const parsed = schema.safeParse({ role, introduction: introduction || undefined });
		if (!parsed.success) {
			validationError = parsed.error.issues[0].message;
			return;
		}

		onsubmit(parsed.data);
	}
</script>

<Modal {isOpen} title="참가 신청" {onclose}>
	<form
		class="apply-modal"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<Input label="파트" placeholder="예: 기타, 드럼, 보컬" bind:value={role} maxlength={20} />

		<div class="apply-modal__field">
			<label class="apply-modal__label" for="apply-introduction">자기소개 (선택)</label>
			<textarea
				id="apply-introduction"
				class="apply-modal__textarea"
				bind:value={introduction}
				placeholder="간단한 자기소개를 입력해주세요"
				maxlength={200}
				rows="3"
			></textarea>
			<span class="apply-modal__char-count">{introduction.length}/200</span>
		</div>

		{#if validationError}
			<p class="apply-modal__error">{validationError}</p>
		{/if}

		<div class="apply-modal__actions">
			<Button type="submit" fullWidth loading={submitting}>신청하기</Button>
			<Button variant="secondary" fullWidth onclick={onclose}>취소</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.apply-modal {
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
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			outline: none;
			resize: vertical;
			font-family: inherit;
			transition: box-shadow var(--transition-fast);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__char-count {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			text-align: right;
		}

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
</style>
