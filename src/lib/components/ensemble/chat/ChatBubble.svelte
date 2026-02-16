<script lang="ts">
	import { formatChatTime } from '$lib/utils/format';
	import type { EnsembleMessage } from '$lib/types/ensemble';

	interface Props {
		message: EnsembleMessage;
		isMine: boolean;
		showSender: boolean;
	}

	let { message, isMine, showSender }: Props = $props();

	let isSystem = $derived(message.message_type === 'SYSTEM');
</script>

{#if isSystem}
	<div class="bubble bubble--system">
		<p class="bubble__system-text">{message.message}</p>
	</div>
{:else}
	<div class="bubble" class:bubble--mine={isMine} class:bubble--other={!isMine}>
		{#if !isMine && showSender}
			<span class="bubble__sender">{message.sender_name}</span>
		{/if}
		<div class="bubble__content">
			<p class="bubble__text">{message.message}</p>
			<span class="bubble__time">{formatChatTime(message.created_at)}</span>
		</div>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.bubble {
		display: flex;
		flex-direction: column;
		max-width: 75%;

		&--mine {
			align-self: flex-end;
		}

		&--other {
			align-self: flex-start;
		}

		&--system {
			align-self: center;
			max-width: 85%;
		}

		&__sender {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-bottom: 2px;
			padding-left: 4px;
		}

		&__content {
			display: flex;
			align-items: flex-end;
			gap: var(--space-xs);

			.bubble--mine & {
				flex-direction: row-reverse;
			}
		}

		&__text {
			padding: 8px 12px;
			border-radius: var(--radius-md);
			font-size: var(--font-size-sm);
			line-height: 1.4;
			white-space: pre-wrap;
			word-break: break-word;

			.bubble--mine & {
				background-color: var(--color-primary);
				color: white;
				border-bottom-right-radius: 4px;
			}

			.bubble--other & {
				background-color: var(--color-bg);
				color: var(--color-text);
				border-bottom-left-radius: 4px;
			}
		}

		&__time {
			font-size: 10px;
			color: var(--color-text-muted);
			white-space: nowrap;
			flex-shrink: 0;
		}

		&__system-text {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			text-align: center;
			padding: var(--space-xs) var(--space-md);
		}
	}
</style>
