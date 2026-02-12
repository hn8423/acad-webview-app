<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import { formatPhone } from '$lib/utils/format';

	let user = $derived(authStore.user);

	async function handleLogout() {
		await authStore.logout();
		academyStore.clear();
		goto('/auth/login', { replaceState: true });
	}

	function handleSwitchAcademy() {
		academyStore.clear();
		goto('/auth/select-academy', { replaceState: true });
	}
</script>

<div class="profile-page">
	<BackHeader title="내 정보" onback={() => goto('/app')} />

	<div class="profile-page__content">
		{#if user}
			<div class="profile-header">
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
			</div>
		{/if}

		<div class="profile-menu">
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

		<div class="profile-page__footer">
			<button type="button" class="profile-logout" onclick={handleLogout}> 로그아웃 </button>
		</div>
	</div>
</div>

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
		background: var(--color-white);
		border-radius: var(--radius-lg);
		padding: var(--space-2xl) var(--space-lg);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;

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
			color: var(--color-white);
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
</style>
