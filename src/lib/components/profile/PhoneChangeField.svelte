<script lang="ts">
	import { onDestroy } from 'svelte';
	import { z } from 'zod';
	import { sendVerification } from '$lib/api/auth';
	import { toastStore } from '$lib/stores/toast.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	const phoneSchema = z.string().regex(/^01[016789]\d{7,8}$/, '올바른 휴대폰 번호를 입력해주세요');

	interface Props {
		currentPhone: string;
		phone?: string;
		code?: string;
		codeSent?: boolean;
		codeError?: string;
	}

	let {
		currentPhone,
		phone = $bindable(''),
		code = $bindable(''),
		codeSent = $bindable(false),
		codeError = ''
	}: Props = $props();

	let sending = $state(false);
	let phoneError = $state('');
	let remainingSeconds = $state(0);
	let timerId: ReturnType<typeof setInterval> | null = null;

	let normalizedPhone = $derived(phone.replace(/-/g, ''));
	let phoneChanged = $derived(normalizedPhone !== currentPhone);
	let canRequest = $derived(phoneChanged && normalizedPhone.length >= 10 && !sending);
	let timerLabel = $derived(
		`${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`
	);

	function stopTimer() {
		if (timerId) {
			clearInterval(timerId);
			timerId = null;
		}
	}

	function startTimer(seconds: number) {
		stopTimer();
		remainingSeconds = seconds;
		timerId = setInterval(() => {
			if (remainingSeconds <= 1) {
				remainingSeconds = 0;
				stopTimer();
				return;
			}
			remainingSeconds -= 1;
		}, 1000);
	}

	function handlePhoneInput() {
		phoneError = '';
		if (codeSent) {
			codeSent = false;
			code = '';
			remainingSeconds = 0;
			stopTimer();
		}
	}

	async function handleRequestCode() {
		phoneError = '';
		const parsed = phoneSchema.safeParse(normalizedPhone);
		if (!parsed.success) {
			phoneError = parsed.error.issues[0]?.message ?? '올바른 휴대폰 번호를 입력해주세요';
			return;
		}

		sending = true;
		try {
			const res = await sendVerification({ phone: parsed.data });
			if (!res.status) {
				throw new Error(res.message || '인증코드 발송에 실패했습니다.');
			}
			codeSent = true;
			code = '';
			startTimer(res.data?.expires_in ?? 180);
			toastStore.success('인증코드가 발송되었습니다.');
		} catch (err) {
			phoneError = err instanceof Error ? err.message : '인증코드 발송에 실패했습니다.';
		} finally {
			sending = false;
		}
	}

	onDestroy(() => {
		stopTimer();
	});
</script>

<div class="phone-field">
	<div class="phone-field__row">
		<div class="phone-field__input">
			<Input
				type="tel"
				label="전화번호"
				placeholder="01012345678"
				bind:value={phone}
				error={phoneError}
				maxlength={11}
				oninput={handlePhoneInput}
			/>
		</div>
		<button
			type="button"
			class="phone-field__request-btn"
			disabled={!canRequest}
			onclick={handleRequestCode}
		>
			{codeSent && remainingSeconds === 0 ? '재요청' : '인증요청'}
		</button>
	</div>

	{#if codeSent}
		<div class="phone-field__row">
			<div class="phone-field__input">
				<Input
					type="tel"
					label="인증코드"
					placeholder="인증코드 6자리"
					bind:value={code}
					error={codeError}
					maxlength={6}
				/>
			</div>
			<span
				class="phone-field__timer"
				class:phone-field__timer--expired={remainingSeconds === 0}
			>
				{remainingSeconds > 0 ? timerLabel : '만료됨'}
			</span>
		</div>
	{/if}
</div>

<style lang="scss">
	.phone-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__row {
			display: flex;
			align-items: flex-start;
			gap: var(--space-sm);
		}

		&__input {
			flex: 1;
			min-width: 0;
		}

		&__request-btn {
			flex-shrink: 0;
			// Input의 label(높이+gap)만큼 내려서 입력창과 정렬
			margin-top: 26px;
			padding: 14px 16px;
			border: none;
			border-radius: var(--radius-md);
			background: var(--color-primary-gradient);
			color: var(--color-on-primary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
			white-space: nowrap;

			&:active {
				opacity: 0.8;
			}

			&:disabled {
				background: var(--color-divider);
				color: var(--color-text-disabled);
				cursor: default;
			}
		}

		&__timer {
			flex-shrink: 0;
			margin-top: 26px;
			padding: 14px 0;
			min-width: 48px;
			text-align: center;
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			font-variant-numeric: tabular-nums;

			&--expired {
				color: var(--color-text-muted);
			}
		}
	}
</style>
