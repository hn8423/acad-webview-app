<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		isOpen: boolean;
		totalDrinks: number;
		onclose: () => void;
		onsubmit: (data: { phone: string; password: string }) => void;
		submitting?: boolean;
		error?: string;
	}

	let {
		isOpen = $bindable(false),
		totalDrinks,
		onclose,
		onsubmit,
		submitting = false,
		error = ''
	}: Props = $props();

	let phone = $state('');
	let password = $state('');
	let validationError = $state('');

	$effect(() => {
		if (isOpen) {
			phone = '';
			password = '';
			validationError = '';
		}
	});

	function handleSubmit() {
		validationError = '';

		if (!phone.trim()) {
			validationError = '전화번호를 입력해주세요.';
			return;
		}
		if (!password) {
			validationError = '비밀번호를 입력해주세요.';
			return;
		}

		onsubmit({ phone: phone.trim(), password });
	}
</script>

<Modal {isOpen} title="음료권 사용" {onclose}>
	<form
		class="redeem-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<div class="redeem-form__info">
			<span class="redeem-form__remaining">남은 음료권: {totalDrinks}잔</span>
			<span class="redeem-form__desc">관리자 인증 후 1잔이 차감됩니다.</span>
		</div>

		<Input type="tel" label="관리자 전화번호" placeholder="01012345678" bind:value={phone} />
		<Input type="password" label="비밀번호" placeholder="비밀번호 입력" bind:value={password} />

		{#if validationError || error}
			<p class="redeem-form__error">{validationError || error}</p>
		{/if}

		<div class="redeem-form__actions">
			<Button type="submit" fullWidth loading={submitting}>사용하기</Button>
			<Button variant="secondary" fullWidth onclick={onclose}>취소</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.redeem-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__info {
			display: flex;
			flex-direction: column;
			gap: var(--space-2xs);
			background: var(--color-bg);
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-sm);
		}

		&__remaining {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__desc {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
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
