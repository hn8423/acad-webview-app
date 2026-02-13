<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { UserAcademy } from '$lib/types/auth';
	import { onMount } from 'svelte';

	let academies = $state<UserAcademy[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		if (!authStore.isAuthenticated) {
			goto('/auth/login', { replaceState: true });
			return;
		}

		try {
			academies = await authStore.fetchMyAcademies();
		} catch (err) {
			error = err instanceof Error ? err.message : '학원 목록을 불러오지 못했습니다.';
		} finally {
			loading = false;
		}
	});

	async function selectAcademy(academy: UserAcademy) {
		try {
			await academyStore.selectAcademy(academy.academy_id);

			const role = academy.member_role;
			if (role === 'ADMIN' || role === 'INSTRUCTOR') {
				goto('/admin', { replaceState: true });
			} else {
				goto('/app', { replaceState: true });
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '학원 정보를 불러오지 못했습니다.';
		}
	}

	function getRoleBadge(role: string): string {
		switch (role) {
			case 'ADMIN':
				return '관리자';
			case 'INSTRUCTOR':
				return '강사';
			default:
				return '수강생';
		}
	}
</script>

<div class="select-academy">
	<h1 class="select-academy__title">학원 선택</h1>
	<p class="select-academy__desc">이용할 학원을 선택해주세요.</p>

	{#if loading}
		<div class="select-academy__loading">
			<Spinner />
		</div>
	{:else if error}
		<p class="select-academy__error">{error}</p>
	{:else if academies.length === 0}
		<div class="select-academy__empty">
			<p>가입된 학원이 없습니다.</p>
		</div>
	{:else}
		<div class="select-academy__list">
			{#each academies as academy}
				<Card onclick={() => selectAcademy(academy)}>
					<div class="academy-card">
						<div class="academy-card__logo">
							{#if academy.academy_logo_img}
								<img src={academy.academy_logo_img} alt={academy.academy_name} />
							{:else}
								<div class="academy-card__logo-placeholder">
									{academy.academy_name.charAt(0)}
								</div>
							{/if}
						</div>
						<div class="academy-card__info">
							<h3 class="academy-card__name">{academy.academy_name}</h3>
							<span class="academy-card__role">{getRoleBadge(academy.member_role)}</span>
						</div>
						<svg
							class="academy-card__arrow"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M9 18l6-6-6-6" />
						</svg>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.select-academy {
		width: 100%;
		max-width: 400px;

		&__title {
			font-size: var(--font-size-3xl);
			font-weight: var(--font-weight-bold);
			text-align: left;
			margin-bottom: var(--space-xs);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__desc {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			text-align: left;
			margin-bottom: var(--space-xl);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__error {
			text-align: center;
			color: var(--color-danger);
			font-size: var(--font-size-sm);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-secondary);
			padding: var(--space-2xl);
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: var(--space-md);

			:global(.card) {
				transition: transform 150ms ease;

				&:active {
					transform: scale(0.97);
				}
			}
		}
	}

	.academy-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);

		&__logo {
			width: 56px;
			height: 56px;
			border-radius: var(--radius-lg);
			overflow: hidden;
			flex-shrink: 0;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}

		&__logo-placeholder {
			width: 100%;
			height: 100%;
			background: var(--color-primary-gradient);
			color: var(--color-white);
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-bold);
		}

		&__info {
			flex: 1;
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
		}

		&__role {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__arrow {
			color: var(--color-text-muted);
			flex-shrink: 0;
		}
	}
</style>
