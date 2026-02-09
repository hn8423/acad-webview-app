<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import * as authApi from '$lib/api/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	type Step = 'phone' | 'verify' | 'info';

	let step = $state<Step>('phone');
	let phone = $state('');
	let verifyCode = $state('');
	let name = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let error = $state('');
	let loading = $state(false);
	let countdown = $state(0);
	let countdownTimer: ReturnType<typeof setInterval> | null = null;

	function startCountdown(seconds: number) {
		countdown = seconds;
		if (countdownTimer) clearInterval(countdownTimer);
		countdownTimer = setInterval(() => {
			countdown -= 1;
			if (countdown <= 0 && countdownTimer) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
		}, 1000);
	}

	async function handleSendCode() {
		error = '';
		if (!phone.trim() || phone.replace(/-/g, '').length < 10) {
			error = '올바른 전화번호를 입력해주세요.';
			return;
		}

		loading = true;
		try {
			const res = await authApi.sendVerification({ phone: phone.replace(/-/g, '') });
			if (res.status) {
				step = 'verify';
				startCountdown(res.data.expires_in);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '인증코드 발송에 실패했습니다.';
		} finally {
			loading = false;
		}
	}

	async function handleVerifyCode() {
		error = '';
		if (!verifyCode.trim() || verifyCode.length !== 6) {
			error = '6자리 인증코드를 입력해주세요.';
			return;
		}

		loading = true;
		try {
			const res = await authApi.verifyCode({
				phone: phone.replace(/-/g, ''),
				code: verifyCode
			});
			if (res.status && res.data.is_verified) {
				step = 'info';
			} else {
				error = '인증코드가 올바르지 않습니다.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '인증에 실패했습니다.';
		} finally {
			loading = false;
		}
	}

	async function handleSignup() {
		error = '';
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
			await authStore.signup(name, phone.replace(/-/g, ''), password);
			goto('/auth/select-academy', { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : '회원가입에 실패했습니다.';
		} finally {
			loading = false;
		}
	}

	function formatCountdown(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
</script>

<div class="signup-page">
	<h1 class="signup-page__title">회원가입</h1>

	{#if step === 'phone'}
		<form class="signup-page__form" onsubmit={(e) => { e.preventDefault(); handleSendCode(); }}>
			<p class="signup-page__desc">전화번호를 입력하면 인증코드가 발송됩니다.</p>
			<Input type="tel" label="전화번호" placeholder="01012345678" bind:value={phone} maxlength={11} />
			{#if error}
				<p class="signup-page__error">{error}</p>
			{/if}
			<Button type="submit" fullWidth {loading}>인증코드 발송</Button>
		</form>
	{:else if step === 'verify'}
		<form class="signup-page__form" onsubmit={(e) => { e.preventDefault(); handleVerifyCode(); }}>
			<p class="signup-page__desc">
				{phone}로 발송된 인증코드를 입력하세요.
				{#if countdown > 0}
					<span class="signup-page__countdown">{formatCountdown(countdown)}</span>
				{/if}
			</p>
			<Input type="text" label="인증코드" placeholder="6자리 입력" bind:value={verifyCode} maxlength={6} />
			{#if error}
				<p class="signup-page__error">{error}</p>
			{/if}
			<Button type="submit" fullWidth {loading}>확인</Button>
			<Button variant="ghost" fullWidth onclick={handleSendCode}>재발송</Button>
		</form>
	{:else}
		<form class="signup-page__form" onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
			<Input type="text" label="이름" placeholder="이름을 입력하세요" bind:value={name} />
			<Input type="password" label="비밀번호" placeholder="비밀번호를 입력하세요" bind:value={password} />
			<Input type="password" label="비밀번호 확인" placeholder="비밀번호를 다시 입력하세요" bind:value={passwordConfirm} />
			{#if error}
				<p class="signup-page__error">{error}</p>
			{/if}
			<Button type="submit" fullWidth {loading}>가입하기</Button>
		</form>
	{/if}

	<div class="signup-page__footer">
		<a href="/auth/login">로그인으로 돌아가기</a>
	</div>
</div>

<style lang="scss">
	.signup-page {
		width: 100%;
		max-width: 360px;

		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			text-align: center;
			margin-bottom: var(--space-xl);
		}

		&__form {
			display: flex;
			flex-direction: column;
			gap: var(--space-md);
		}

		&__desc {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			text-align: center;
		}

		&__countdown {
			color: var(--color-danger);
			font-weight: var(--font-weight-medium);
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
