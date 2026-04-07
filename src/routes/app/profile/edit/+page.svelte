<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { authStore } from '$lib/stores/auth.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { formatPhone } from '$lib/utils/format';

	const schema = z.object({
		user_name: z.string().min(1, '이름을 입력해주세요').max(20, '20자 이내로 입력해주세요'),
		user_birthday: z.string().optional(),
		user_gender: z.enum(['MALE', 'FEMALE']).optional()
	});

	let userName = $state('');
	let userBirthday = $state('');
	let userGender = $state('');
	let showPasswordChange = $state(false);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let errors = $state<Record<string, string>>({});
	let loading = $state(false);

	let user = $derived(authStore.user);

	onMount(() => {
		const currentUser = authStore.user;
		if (currentUser) {
			userName = currentUser.user_name;
			userBirthday = currentUser.user_birthday ?? '';
			userGender = currentUser.user_gender ?? '';
		}
	});

	let hasPasswordInput = $derived(
		currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0
	);

	let hasChanges = $derived(
		user != null &&
			(userName !== user.user_name ||
				userBirthday !== (user.user_birthday ?? '') ||
				userGender !== (user.user_gender ?? '') ||
				hasPasswordInput)
	);

	async function handleSave() {
		errors = {};

		const parsed = schema.safeParse({
			user_name: userName.trim(),
			user_birthday: userBirthday || undefined,
			user_gender: userGender || undefined
		});

		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const field = String(issue.path[0]);
				if (!fieldErrors[field]) {
					fieldErrors[field] = issue.message;
				}
			}
			errors = fieldErrors;
			return;
		}

		if (hasPasswordInput) {
			if (!currentPassword) {
				errors = { current_password: '현재 비밀번호를 입력해주세요' };
				return;
			}
			if (newPassword.length < 4) {
				errors = { new_password: '새 비밀번호는 4자 이상 입력해주세요' };
				return;
			}
			if (newPassword !== confirmPassword) {
				errors = { confirm_password: '새 비밀번호가 일치하지 않습니다' };
				return;
			}
		}

		loading = true;
		try {
			const updateData: Record<string, string | undefined> = {
				user_name: parsed.data.user_name,
				user_birthday: parsed.data.user_birthday,
				user_gender: parsed.data.user_gender
			};

			if (hasPasswordInput) {
				updateData.current_password = btoa(currentPassword);
				updateData.new_password = btoa(newPassword);
			}

			await authStore.updateProfile(updateData);

			if (hasPasswordInput) {
				toastStore.success('비밀번호가 변경되었습니다.');
			} else {
				toastStore.success('프로필이 수정되었습니다.');
			}
			await goto('/app/profile');
		} catch (err) {
			errors = {
				form: err instanceof Error ? err.message : '프로필 수정에 실패했습니다.'
			};
		} finally {
			loading = false;
		}
	}
</script>

<div class="profile-edit">
	<BackHeader title="내 정보 수정" onback={() => goto('/app/profile')} />

	<div class="profile-edit__content">
		{#if user}
			<form
				class="profile-edit__form"
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
			>
				<div class="profile-edit__avatar-section">
					<div class="profile-edit__avatar">
						{#if user.profile_img}
							<img src={user.profile_img} alt={user.user_name} />
						{:else}
							<div class="profile-edit__avatar-placeholder">
								{userName.charAt(0) || user.user_name.charAt(0)}
							</div>
						{/if}
					</div>
				</div>

				<Input
					type="text"
					label="이름"
					placeholder="이름을 입력하세요"
					bind:value={userName}
					error={errors['user_name'] ?? ''}
					maxlength={20}
				/>

				<div class="profile-edit__readonly-field">
					<span class="profile-edit__readonly-label">전화번호</span>
					<div class="profile-edit__readonly-value">{formatPhone(user.user_phone)}</div>
				</div>

				<Input
					type="date"
					label="생년월일"
					bind:value={userBirthday}
					error={errors['user_birthday'] ?? ''}
				/>

				<div class="profile-edit__field" role="group" aria-label="성별">
					<span class="profile-edit__field-label" id="gender-label">성별</span>
					<div class="profile-edit__gender-options" role="radiogroup" aria-labelledby="gender-label">
						<button
							type="button"
							role="radio"
							aria-checked={userGender === 'MALE'}
							class="profile-edit__gender-btn"
							class:profile-edit__gender-btn--active={userGender === 'MALE'}
							onclick={() => {
								userGender = userGender === 'MALE' ? '' : 'MALE';
							}}
						>
							남성
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={userGender === 'FEMALE'}
							class="profile-edit__gender-btn"
							class:profile-edit__gender-btn--active={userGender === 'FEMALE'}
							onclick={() => {
								userGender = userGender === 'FEMALE' ? '' : 'FEMALE';
							}}
						>
							여성
						</button>
					</div>
				</div>

				<div class="profile-edit__divider"></div>

				<div class="profile-edit__password-section">
					<button
						type="button"
						class="profile-edit__password-toggle"
						onclick={() => {
							showPasswordChange = !showPasswordChange;
							if (!showPasswordChange) {
								currentPassword = '';
								newPassword = '';
								confirmPassword = '';
								errors = {};
							}
						}}
					>
						<span>비밀번호 변경</span>
						<svg
							class="profile-edit__password-arrow"
							class:profile-edit__password-arrow--open={showPasswordChange}
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
						>
							<path
								d="M5 7.5L10 12.5L15 7.5"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>

					{#if showPasswordChange}
						<div class="profile-edit__password-fields">
							<Input
								type="password"
								label="현재 비밀번호"
								placeholder="현재 비밀번호를 입력하세요"
								bind:value={currentPassword}
								error={errors['current_password'] ?? ''}
							/>
							<Input
								type="password"
								label="새 비밀번호"
								placeholder="새 비밀번호를 입력하세요 (4자 이상)"
								bind:value={newPassword}
								error={errors['new_password'] ?? ''}
							/>
							<Input
								type="password"
								label="새 비밀번호 확인"
								placeholder="새 비밀번호를 다시 입력하세요"
								bind:value={confirmPassword}
								error={errors['confirm_password'] ?? ''}
							/>
						</div>
					{/if}
				</div>

				{#if errors['form']}
					<p class="profile-edit__error">{errors['form']}</p>
				{/if}

				<div class="profile-edit__actions">
					<Button type="submit" fullWidth {loading} disabled={!hasChanges}>저장하기</Button>
				</div>
			</form>
		{/if}
	</div>
</div>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.profile-edit {
		&__content {
			padding: var(--space-md);
		}

		&__form {
			display: flex;
			flex-direction: column;
			gap: var(--space-lg);
		}

		&__avatar-section {
			display: flex;
			justify-content: center;
			padding: var(--space-md) 0;
		}

		&__avatar {
			width: 80px;
			height: 80px;
			border-radius: 50%;
			overflow: hidden;
			flex-shrink: 0;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}

		&__avatar-placeholder {
			width: 100%;
			height: 100%;
			background: var(--color-primary-gradient);
			color: var(--color-on-primary);
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: var(--font-size-3xl);
			font-weight: var(--font-weight-bold);
		}

		&__readonly-field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__readonly-label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__readonly-value {
			padding: var(--space-sm) var(--space-md);
			background: var(--color-white);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text-muted);
			opacity: 0.6;
		}

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__field-label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__gender-options {
			display: flex;
			gap: var(--space-sm);
		}

		&__gender-btn {
			flex: 1;
			padding: var(--space-sm) var(--space-md);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background: var(--color-white);
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			cursor: pointer;
			transition:
				background-color var(--transition-fast),
				border-color var(--transition-fast),
				color var(--transition-fast);

			&:active {
				opacity: 0.8;
			}

			&--active {
				background: var(--color-primary-gradient);
				color: var(--color-on-primary);
				border-color: transparent;
			}
		}

		&__divider {
			height: 1px;
			background: var(--color-divider);
			margin: var(--space-xs) 0;
		}

		&__password-section {
			display: flex;
			flex-direction: column;
			gap: var(--space-md);
		}

		&__password-toggle {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			padding: var(--space-sm) 0;
			border: none;
			background: none;
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
			cursor: pointer;
		}

		&__password-arrow {
			transition: transform var(--transition-fast);
			color: var(--color-text-muted);

			&--open {
				transform: rotate(180deg);
			}
		}

		&__password-fields {
			display: flex;
			flex-direction: column;
			gap: var(--space-lg);
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			text-align: center;
		}

		&__actions {
			padding-top: var(--space-md);
		}
	}
</style>
