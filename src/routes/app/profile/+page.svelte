<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
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
			<Card>
				<div class="profile-info">
					<div class="profile-info__avatar">
						{#if user.profile_img}
							<img src={user.profile_img} alt={user.user_name} />
						{:else}
							<div class="profile-info__avatar-placeholder">
								{user.user_name.charAt(0)}
							</div>
						{/if}
					</div>
					<div class="profile-info__details">
						<h2 class="profile-info__name">{user.user_name}</h2>
						<p class="profile-info__phone">{formatPhone(user.user_phone)}</p>
					</div>
				</div>
			</Card>
		{/if}

		<div class="profile-page__actions">
			<Button variant="secondary" fullWidth onclick={handleSwitchAcademy}>
				학원 변경
			</Button>
			<Button variant="ghost" fullWidth onclick={handleLogout}>
				로그아웃
			</Button>
		</div>
	</div>
</div>

<style lang="scss">
	.profile-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-lg);
		}
	}

	.profile-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);

		&__avatar {
			width: 64px;
			height: 64px;
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
			background-color: var(--color-primary-bg);
			color: var(--color-primary);
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
		}

		&__name {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
		}

		&__phone {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}
	}
</style>
