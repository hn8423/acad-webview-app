<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getAcademies } from '$lib/api/academy';
	import { joinAcademy } from '$lib/api/member';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { UserAcademy } from '$lib/types/auth';
	import type { Academy } from '$lib/types/academy';
	import { z } from 'zod';
	import { onMount } from 'svelte';

	const nicknameSchema = z
		.string()
		.trim()
		.min(1, '닉네임을 입력해주세요.')
		.max(20, '닉네임은 20자 이하여야 합니다.');

	let academies = $state<UserAcademy[]>([]);
	let loading = $state(true);
	let error = $state('');

	// 학원 가입 모달 상태
	let showJoinModal = $state(false);
	let allAcademies = $state<Academy[]>([]);
	let loadingAcademies = $state(false);
	let searchQuery = $state('');
	let selectedAcademy = $state<Academy | null>(null);
	let nickname = $state('');
	let joining = $state(false);
	let joinError = $state('');

	const joinedAcademyIds = $derived(new Set(academies.map((a) => a.academy_id)));

	const joinableAcademies = $derived(
		allAcademies.filter((academy) => {
			if (joinedAcademyIds.has(academy.id)) return false;
			if (!searchQuery.trim()) return true;
			return academy.academy_name.toLowerCase().includes(searchQuery.trim().toLowerCase());
		})
	);

	onMount(() => {
		loadMyAcademies();
	});

	async function loadMyAcademies() {
		if (!authStore.isAuthenticated) {
			goto('/auth/login', { replaceState: true });
			return;
		}

		loading = true;
		error = '';
		try {
			academies = await authStore.fetchMyAcademies();
		} catch (err) {
			error = err instanceof Error ? err.message : '학원 목록을 불러오지 못했습니다.';
		} finally {
			loading = false;
		}
	}

	async function selectAcademy(academy: UserAcademy) {
		try {
			await academyStore.selectAcademy(academy.academy_id, academy.role);

			const role = academy.role;
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

	async function openJoinModal() {
		showJoinModal = true;
		selectedAcademy = null;
		nickname = '';
		searchQuery = '';
		joinError = '';
		loadingAcademies = true;

		try {
			const res = await getAcademies();
			if (res.status && res.data) {
				allAcademies = res.data.academies;
			} else {
				throw new Error(res.message || '학원 목록을 불러오지 못했습니다.');
			}
		} catch (err) {
			joinError = err instanceof Error ? err.message : '학원 목록을 불러오지 못했습니다.';
		} finally {
			loadingAcademies = false;
		}
	}

	function closeJoinModal() {
		showJoinModal = false;
		selectedAcademy = null;
		nickname = '';
		searchQuery = '';
		joinError = '';
	}

	function selectAcademyToJoin(academy: Academy) {
		selectedAcademy = academy;
		nickname = '';
		joinError = '';
	}

	function backToList() {
		selectedAcademy = null;
		nickname = '';
		joinError = '';
	}

	async function handleJoin() {
		if (!selectedAcademy) return;

		const parsed = nicknameSchema.safeParse(nickname);
		if (!parsed.success) {
			joinError = parsed.error.issues[0].message;
			return;
		}

		joining = true;
		joinError = '';

		try {
			await joinAcademy(selectedAcademy.id, parsed.data);
			closeJoinModal();
			toastStore.success('학원에 가입되었습니다.');
			await loadMyAcademies();
		} catch (err) {
			joinError = err instanceof Error ? err.message : '학원 가입에 실패했습니다.';
		} finally {
			joining = false;
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
							<div class="academy-card__logo-placeholder">
								{academy.academy_name.charAt(0)}
							</div>
						</div>
						<div class="academy-card__info">
							<h3 class="academy-card__name">{academy.academy_name}</h3>
							<span class="academy-card__role">{getRoleBadge(academy.role)}</span>
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

	{#if !loading}
		<button class="select-academy__join-btn" onclick={openJoinModal}>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
			새 학원 가입하기
		</button>
	{/if}
</div>

<Modal
	isOpen={showJoinModal}
	title={selectedAcademy ? '학원 가입' : '학원 찾기'}
	onclose={closeJoinModal}
>
	{#if selectedAcademy}
		<div class="join-step">
			<button class="join-step__back" onclick={backToList}>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				목록으로
			</button>

			<div class="join-step__academy">
				<div class="academy-card__logo">
					{#if selectedAcademy.logo_url}
						<img src={selectedAcademy.logo_url} alt={selectedAcademy.academy_name} />
					{:else}
						<div class="academy-card__logo-placeholder">
							{selectedAcademy.academy_name.charAt(0)}
						</div>
					{/if}
				</div>
				<div class="join-step__academy-info">
					<h3 class="join-step__academy-name">{selectedAcademy.academy_name}</h3>
					{#if selectedAcademy.address}
						<p class="join-step__academy-address">{selectedAcademy.address}</p>
					{/if}
				</div>
			</div>

			<div class="join-step__form">
				<Input
					label="닉네임"
					placeholder="학원에서 사용할 닉네임"
					bind:value={nickname}
					error={joinError}
					maxlength={20}
				/>
				<Button fullWidth loading={joining} onclick={handleJoin}>가입하기</Button>
			</div>
		</div>
	{:else}
		<div class="search-step">
			<Input placeholder="학원 이름으로 검색" bind:value={searchQuery} />

			{#if loadingAcademies}
				<div class="search-step__loading">
					<Spinner size="sm" />
				</div>
			{:else if joinError}
				<p class="search-step__error">{joinError}</p>
			{:else if joinableAcademies.length === 0}
				<div class="search-step__empty">
					<p>{searchQuery ? '검색 결과가 없습니다.' : '가입 가능한 학원이 없습니다.'}</p>
				</div>
			{:else}
				<div class="search-step__list">
					{#each joinableAcademies as academy}
						<Card onclick={() => selectAcademyToJoin(academy)}>
							<div class="academy-card">
								<div class="academy-card__logo academy-card__logo--sm">
									{#if academy.logo_url}
										<img src={academy.logo_url} alt={academy.academy_name} />
									{:else}
										<div class="academy-card__logo-placeholder">
											{academy.academy_name.charAt(0)}
										</div>
									{/if}
								</div>
								<div class="academy-card__info">
									<h3 class="academy-card__name">{academy.academy_name}</h3>
									{#if academy.address}
										<span class="academy-card__address">{academy.address}</span>
									{/if}
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
	{/if}
</Modal>

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

		&__join-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: var(--space-sm);
			width: 100%;
			padding: 14px;
			margin-top: var(--space-lg);
			border: 2px dashed var(--color-divider);
			border-radius: var(--radius-lg);
			color: var(--color-text-secondary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			background: transparent;
			transition:
				color var(--transition-fast),
				border-color var(--transition-fast),
				background-color var(--transition-fast);

			&:hover {
				color: var(--color-primary);
				border-color: var(--color-primary-light);
				background-color: var(--color-primary-bg);
			}

			&:active {
				transform: scale(0.97);
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

			&--sm {
				width: 44px;
				height: 44px;
			}

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
			min-width: 0;
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		&__role {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		&__address {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			display: block;
		}

		&__arrow {
			color: var(--color-text-muted);
			flex-shrink: 0;
		}
	}

	.search-step {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-xl);
		}

		&__error {
			text-align: center;
			color: var(--color-danger);
			font-size: var(--font-size-sm);
			padding: var(--space-lg);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-secondary);
			font-size: var(--font-size-sm);
			padding: var(--space-xl);
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			max-height: 50vh;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
		}
	}

	.join-step {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__back {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
			color: var(--color-text-secondary);
			font-size: var(--font-size-sm);
			background: none;
			padding: 0;

			&:hover {
				color: var(--color-text);
			}
		}

		&__academy {
			display: flex;
			align-items: center;
			gap: var(--space-md);
			padding: var(--space-md);
			background-color: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__academy-info {
			flex: 1;
			min-width: 0;
		}

		&__academy-name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
		}

		&__academy-address {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			margin-top: 2px;
		}

		&__form {
			display: flex;
			flex-direction: column;
			gap: var(--space-md);
		}
	}
</style>
