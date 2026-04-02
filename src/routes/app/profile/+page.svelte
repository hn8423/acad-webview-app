<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { formatPhone } from '$lib/utils/format';

	let user = $derived(authStore.user);

	let showDeleteModal = $state(false);
	let deletePassword = $state('');
	let deleteError = $state('');
	let deleteLoading = $state(false);

	async function handleLogout() {
		await authStore.logout();
		academyStore.clear();
		goto('/auth/login', { replaceState: true });
	}

	function handleSwitchAcademy() {
		academyStore.clear();
		goto('/auth/select-academy', { replaceState: true });
	}

	function openDeleteModal() {
		deletePassword = '';
		deleteError = '';
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deletePassword = '';
		deleteError = '';
	}

	async function handleDeleteAccount() {
		if (!deletePassword.trim()) {
			deleteError = '비밀번호를 입력해주세요.';
			return;
		}

		deleteLoading = true;
		deleteError = '';

		try {
			await authStore.deleteAccount(deletePassword);
			academyStore.clear();
			toastStore.success('회원 탈퇴가 완료되었습니다.');
			goto('/auth/login', { replaceState: true });
		} catch (error) {
			deleteError =
				error instanceof Error ? error.message : '회원 탈퇴에 실패했습니다.';
		} finally {
			deleteLoading = false;
		}
	}
</script>

<div class="profile-page">
	<BackHeader title="내 정보" onback={() => goto('/app')} />

	<div class="profile-page__content">
		{#if user}
			<button
				type="button"
				class="profile-header"
				onclick={() => goto('/app/profile/edit')}
			>
				<div class="profile-header__avatar">
					{#if user.profile_img}
						<img src={user.profile_img} alt={user.user_name} />
					{:else}
						<div class="profile-header__avatar-placeholder">
							{user.user_name.charAt(0)}
						</div>
					{/if}
				</div>
				<h2 class="profile-header__name">{user.user_name}</h2>
				<p class="profile-header__phone">{formatPhone(user.user_phone)}</p>
				<span class="profile-header__edit-hint">프로필 수정 ›</span>
			</button>
		{/if}

		<div class="profile-menu">
			<button type="button" class="profile-menu__item" onclick={() => goto('/app/notice')}>
				<span class="profile-menu__label">공지사항</span>
				<svg
					class="profile-menu__chevron"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--color-text-muted)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</button>
			<div class="profile-menu__divider"></div>
			<button type="button" class="profile-menu__item" onclick={handleSwitchAcademy}>
				<span class="profile-menu__label">학원 변경</span>
				<svg
					class="profile-menu__chevron"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--color-text-muted)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</button>
		</div>

		<div class="profile-delete">
			<button type="button" class="profile-delete__button" onclick={openDeleteModal}>
				계정 삭제
			</button>
		</div>

		<div class="profile-page__footer">
			<button type="button" class="profile-logout" onclick={handleLogout}> 로그아웃 </button>
		</div>
	</div>
</div>

<Modal isOpen={showDeleteModal} title="계정 삭제" position="center" onclose={closeDeleteModal}>
	<div class="delete-modal">
		<p class="delete-modal__warning">
			탈퇴 시 모든 수강권, 예약, 피드백 등의 데이터가 삭제되며 복구할 수 없습니다.
		</p>

		<div class="delete-modal__input">
			<Input
				type="password"
				label="비밀번호 확인"
				placeholder="비밀번호를 입력해주세요"
				bind:value={deletePassword}
				error={deleteError}
			/>
		</div>

		<div class="delete-modal__actions">
			<Button variant="secondary" fullWidth onclick={closeDeleteModal}>취소</Button>
			<Button
				variant="danger"
				fullWidth
				loading={deleteLoading}
				onclick={handleDeleteAccount}
			>
				탈퇴하기
			</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.profile-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
			display: flex;
			flex-direction: column;
			gap: var(--space-section);
		}

		&__footer {
			display: flex;
			justify-content: center;
			padding-top: var(--space-md);
		}
	}

	.profile-header {
		width: 100%;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-2xl) var(--space-lg);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		border: none;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.8;
		}

		&:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}

		&__avatar {
			width: 80px;
			height: 80px;
			border-radius: 50%;
			overflow: hidden;
			flex-shrink: 0;
			margin-bottom: var(--space-md);

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

		&__name {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			margin-bottom: var(--space-2xs);
		}

		&__phone {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__edit-hint {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-top: var(--space-sm);
		}
	}

	.profile-menu {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		overflow: hidden;

		&__item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			padding: var(--space-lg);
			background: none;
			border: none;
			cursor: pointer;
			transition: background-color var(--transition-fast);

			&:active {
				background-color: var(--color-bg);
			}
		}

		&__label {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__chevron {
			flex-shrink: 0;
		}

		&__divider {
			height: 1px;
			background-color: var(--color-divider);
			margin: 0 var(--space-lg);
		}
	}

	.profile-delete {
		display: flex;
		justify-content: center;

		&__button {
			background: none;
			border: none;
			cursor: pointer;
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			padding: var(--space-sm) var(--space-md);
			text-decoration: underline;
			transition: opacity var(--transition-fast);

			&:active {
				opacity: 0.6;
			}
		}
	}

	.profile-logout {
		background: none;
		border: none;
		cursor: pointer;
		font-size: var(--font-size-sm);
		color: var(--color-danger);
		padding: var(--space-sm) var(--space-md);
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.6;
		}
	}

	.delete-modal {
		&__warning {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
			line-height: 1.5;
			margin-bottom: var(--space-lg);
		}

		&__input {
			margin-bottom: var(--space-lg);
		}

		&__actions {
			display: flex;
			gap: var(--space-sm);
		}
	}
</style>
