<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { isValidUrl } from '$lib/utils/link';

	interface Props {
		isOpen: boolean;
		initialText?: string;
		onclose: () => void;
		oninsert: (url: string, displayText: string) => void;
	}

	let { isOpen = $bindable(false), initialText = '', onclose, oninsert }: Props = $props();

	let url = $state('');
	let displayText = $state('');
	let urlError = $state('');

	$effect(() => {
		if (isOpen) {
			url = '';
			displayText = initialText;
			urlError = '';
		}
	});

	function handleInsert() {
		urlError = '';

		const trimmedUrl = url.trim();
		if (!trimmedUrl) {
			urlError = 'URL을 입력해주세요.';
			return;
		}

		const finalUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

		if (!isValidUrl(finalUrl)) {
			urlError = '올바른 URL을 입력해주세요.';
			return;
		}

		oninsert(finalUrl, displayText.trim() || finalUrl);
		onclose();
	}
</script>

<Modal {isOpen} title="링크 삽입" {onclose}>
	<form
		class="link-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleInsert();
		}}
	>
		<Input label="URL" placeholder="https://example.com" bind:value={url} error={urlError} />
		<Input
			label="표시 텍스트 (선택)"
			placeholder="링크 텍스트를 입력하세요"
			bind:value={displayText}
		/>
		<p class="link-form__hint">표시 텍스트를 비우면 URL이 그대로 표시됩니다.</p>

		<div class="link-form__actions">
			<Button type="submit" fullWidth>삽입</Button>
			<Button variant="secondary" fullWidth onclick={onclose}>취소</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.link-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__hint {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-top: calc(-1 * var(--space-sm));
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-sm);
		}
	}
</style>
