<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let phone = $state('');
	let name = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSignup() {
		error = '';
		const cleanPhone = phone.replace(/-/g, '');
		if (!cleanPhone || cleanPhone.length < 10) {
			error = '올바른 전화번호를 입력해주세요.';
			return;
		}
		if (!name.trim()) {
			error = '이름을 입력해주세요.';
			return;
		}
		if (password.length < 4) {
			error = '비밀번호는 4자 이상이어야 합니다.';
			return;
		}
		if (password !== passwordConfirm) {
			error = '비밀번호가 일치하지 않습니다.';
			return;
		}

		loading = true;
		try {
			await authStore.signup(name, cleanPhone, password);
			goto('/auth/select-academy', { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : '회원가입에 실패했습니다.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="signup-page">
	<h1 class="signup-page__title">회원가입</h1>

	<form
		class="signup-page__form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSignup();
		}}
	>
		<Input
			type="tel"
			label="전화번호"
			placeholder="01012345678"
			bind:value={phone}
			maxlength={11}
		/>
		<Input type="text" label="이름" placeholder="이름을 입력하세요" bind:value={name} />
		<Input
			type="password"
			label="비밀번호"
			placeholder="비밀번호를 입력하세요"
			bind:value={password}
		/>
		<Input
			type="password"
			label="비밀번호 확인"
			placeholder="비밀번호를 다시 입력하세요"
			bind:value={passwordConfirm}
		/>
		{#if error}
			<p class="signup-page__error">{error}</p>
		{/if}
		<Button type="submit" fullWidth {loading}>가입하기</Button>
	</form>

	<div class="signup-page__footer">
		<a href="/auth/login">로그인으로 돌아가기</a>
	</div>
</div>

<style lang="scss">
	.signup-page {
		width: 100%;
		max-width: 360px;

		&__title {
			font-size: var(--font-size-3xl);
			font-weight: var(--font-weight-bold);
			text-align: left;
			margin-bottom: var(--space-xl);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__form {
			display: flex;
			flex-direction: column;
			gap: var(--space-lg);
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			text-align: center;
		}

		&__footer {
			text-align: center;
			margin-top: var(--space-lg);
			font-size: var(--font-size-sm);
		}
	}
</style>
