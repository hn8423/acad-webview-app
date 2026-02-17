<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { z } from 'zod';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		onsend: (content: string) => void;
		disabled?: boolean;
	}

	let { onsend, disabled = false }: Props = $props();

	const messageSchema = z.string().trim().min(1, '메시지를 입력해주세요').max(1000, '1000자 이내');

	let value = $state('');
	let sending = $state(false);

	async function handleSend() {
		const parsed = messageSchema.safeParse(value);
		if (!parsed.success) {
			toastStore.error(parsed.error.issues[0].message);
			return;
		}

		sending = true;
		try {
			onsend(parsed.data);
			value = '';
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}
</script>

<div class="chat-input">
	<input
		class="chat-input__field"
		type="text"
		placeholder="메시지를 입력하세요"
		bind:value
		maxlength={1000}
		{disabled}
		onkeydown={handleKeydown}
	/>
	<Button size="sm" loading={sending} disabled={disabled || !value.trim()} onclick={handleSend}>
		전송
	</Button>
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.chat-input {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background-color: var(--color-bg);
		border-top: 1px solid var(--color-divider);

		&__field {
			flex: 1;
			padding: 10px 14px;
			border: 1px solid var(--color-divider);
			border-radius: var(--radius-full);
			font-size: var(--font-size-sm);
			color: var(--color-text);
			background-color: var(--color-bg-card);
			outline: none;
			transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				border-color: var(--color-primary-light);
				box-shadow: 0 0 0 2px var(--color-primary-bg);
				background-color: var(--color-bg-card);
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
	}
</style>
