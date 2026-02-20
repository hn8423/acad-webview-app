<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let phone = $state('');
	let password = $state('');
	let loading = $state(false);
	let toastMessage = $state('');
	let showToast = $state(false);

	function showError(msg: string) {
		toastMessage = msg;
		showToast = true;
	}

	async function handleSubmit() {
		showToast = false;

		if (!phone.trim()) {
			showError('전화번호를 입력해주세요.');
			return;
		}
		if (!password.trim()) {
			showError('비밀번호를 입력해주세요.');
			return;
		}

		loading = true;
		try {
			await authStore.login(phone.replace(/-/g, ''), password);
			goto('/auth/select-academy', { replaceState: true });
		} catch (err) {
			showError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-page">
	<div class="login-page__logo">
		<h1 class="login-page__title">Academy</h1>
		<p class="login-page__subtitle">학원 관리 서비스</p>
	</div>

	<form
		class="login-page__form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<Input
			type="tel"
			label="전화번호"
			placeholder="01012345678"
			bind:value={phone}
			maxlength={11}
		/>

		<Input
			type="password"
			label="비밀번호"
			placeholder="비밀번호를 입력하세요"
			bind:value={password}
		/>

		<Button type="submit" fullWidth {loading}>로그인</Button>
	</form>

	<div class="login-page__footer">
		<a href="/auth/signup" class="login-page__link">회원가입</a>
	</div>
</div>

{#if showToast}
	<Toast message={toastMessage} type="error" />
{/if}

<style lang="scss">
	.login-page {
		width: 100%;
		max-width: 360px;

		&__logo {
			text-align: center;
			margin-bottom: var(--space-3xl);
		}

		&__title {
			font-size: var(--font-size-4xl);
			font-weight: var(--font-weight-extrabold);
			letter-spacing: var(--letter-spacing-tight);
			background: var(--color-primary-gradient);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		&__subtitle {
			font-size: var(--font-size-base);
			color: var(--color-text-secondary);
			margin-top: var(--space-xs);
		}

		&__form {
			display: flex;
			flex-direction: column;
			gap: var(--space-lg);
		}

		&__footer {
			text-align: center;
			margin-top: var(--space-lg);
		}

		&__link {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
		}
	}
</style>
