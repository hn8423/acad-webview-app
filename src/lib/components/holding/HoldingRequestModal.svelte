<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { getTodayString } from '$lib/utils/format';

	interface Props {
		isOpen: boolean;
		passName: string;
		onclose: () => void;
		onsubmit: (data: { holding_start: string; holding_end: string; reason?: string }) => void;
		submitting?: boolean;
		error?: string;
	}

	let { isOpen = $bindable(false), passName, onclose, onsubmit, submitting = false, error = '' }: Props = $props();

	let holdingStart = $state('');
	let holdingEnd = $state('');
	let holdingReason = $state('');
	let validationError = $state('');

	let today = $derived(getTodayString());

	$effect(() => {
		if (isOpen) {
			holdingStart = today;
			holdingEnd = '';
			holdingReason = '';
			validationError = '';
		}
	});

	function handleSubmit() {
		validationError = '';

		if (!holdingStart) {
			validationError = '시작일을 선택해주세요.';
			return;
		}
		if (!holdingEnd) {
			validationError = '종료일을 선택해주세요.';
			return;
		}
		if (holdingStart < today) {
			validationError = '시작일은 오늘 이후여야 합니다.';
			return;
		}
		if (holdingEnd < holdingStart) {
			validationError = '종료일은 시작일 이후여야 합니다.';
			return;
		}

		onsubmit({
			holding_start: holdingStart,
			holding_end: holdingEnd,
			reason: holdingReason.trim() || undefined
		});
	}
</script>

<Modal {isOpen} title="홀딩 신청" {onclose}>
	<form
		class="holding-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<p class="holding-form__pass-name">{passName}</p>

		<Input type="date" label="시작일" bind:value={holdingStart} />
		<Input type="date" label="종료일" bind:value={holdingEnd} />

		<div class="holding-form__field">
			<label class="holding-form__label" for="holding-reason">사유 (선택)</label>
			<textarea
				id="holding-reason"
				class="holding-form__textarea"
				bind:value={holdingReason}
				placeholder="홀딩 사유를 입력해주세요"
				rows="3"
			></textarea>
		</div>

		{#if validationError || error}
			<p class="holding-form__error">{validationError || error}</p>
		{/if}

		<div class="holding-form__actions">
			<Button type="submit" fullWidth loading={submitting}>신청하기</Button>
			<Button variant="secondary" fullWidth onclick={onclose}>취소</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.holding-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__pass-name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
			background: var(--color-bg);
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-sm);
		}

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
