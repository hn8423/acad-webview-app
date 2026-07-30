<script lang="ts">
	import { untrack } from 'svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getInstructorDetail } from '$lib/api/member';
	import { formatPhone } from '$lib/utils/format';
	import type { Instructor } from '$lib/types/member';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	interface Props {
		isOpen: boolean;
		instructor: { id: number; name: string } | null;
		onclose: () => void;
	}

	let { isOpen, instructor, onclose }: Props = $props();

	let detail = $state<Instructor | null>(null);
	let loading = $state(false);
	let errorMessage = $state('');

	let fetchId = 0;

	async function fetchDetail() {
		const academyId = academyStore.academyId;
		if (!academyId || !instructor) return;

		const thisId = ++fetchId;
		loading = true;
		errorMessage = '';
		detail = null;

		try {
			const res = await getInstructorDetail(academyId, instructor.id);
			if (thisId !== fetchId) return;
			if (res.status && res.data) {
				detail = res.data;
			} else {
				errorMessage = res.message || '선생님 정보를 불러오는데 실패했습니다.';
			}
		} catch {
			if (thisId !== fetchId) return;
			errorMessage = '선생님 정보를 불러오는데 실패했습니다.';
		} finally {
			if (thisId === fetchId) {
				loading = false;
			}
		}
	}

	$effect(() => {
		if (isOpen && instructor) {
			untrack(() => {
				fetchDetail();
			});
		}
	});
</script>

<Modal {isOpen} title="선생님 정보" {onclose}>
	<div class="profile-modal">
		{#if loading}
			<div class="profile-modal__loading">
				<Spinner />
			</div>
		{:else if errorMessage}
			<p class="profile-modal__error">{errorMessage}</p>
		{:else if detail}
			<div class="profile-modal__header">
				<div class="profile-modal__avatar">
					{#if detail.profile_img}
						<img src={detail.profile_img} alt={detail.user_name} class="profile-modal__avatar-img" />
					{:else}
						<svg
							width="28"
							height="28"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					{/if}
				</div>
				<div class="profile-modal__title">
					<h3 class="profile-modal__name">{detail.user_name} 선생님</h3>
					{#if detail.specialties}
						<Badge variant="info">{detail.specialties}</Badge>
					{/if}
				</div>
			</div>

			<div class="profile-modal__section">
				<span class="profile-modal__label">소개</span>
				{#if detail.introduction}
					<p class="profile-modal__intro">{detail.introduction}</p>
				{:else}
					<p class="profile-modal__intro profile-modal__intro--empty">소개가 없습니다.</p>
				{/if}
			</div>

			{#if detail.user_phone}
				<div class="profile-modal__section">
					<span class="profile-modal__label">연락처</span>
					<a href="tel:{detail.user_phone}" class="profile-modal__phone">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
							/>
						</svg>
						{formatPhone(detail.user_phone)}
					</a>
				</div>
			{/if}
		{/if}
	</div>
</Modal>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.profile-modal {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__error {
			text-align: center;
			color: var(--color-danger);
			font-size: var(--font-size-sm);
			padding: var(--space-xl);
		}

		&__header {
			display: flex;
			align-items: center;
			gap: var(--space-md);
		}

		&__avatar {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 56px;
			height: 56px;
			flex-shrink: 0;
			border-radius: var(--radius-full);
			background: var(--color-bg);
			color: var(--color-text-muted);
			overflow: hidden;
		}

		&__avatar-img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		&__title {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-xs);
			min-width: 0;
		}

		&__name {
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__section {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__label {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-muted);
		}

		&__intro {
			font-size: var(--font-size-sm);
			color: var(--color-text);
			line-height: 1.6;
			white-space: pre-wrap;
			word-break: break-word;

			&--empty {
				color: var(--color-text-muted);
			}
		}

		&__phone {
			display: inline-flex;
			align-items: center;
			gap: var(--space-sm);
			align-self: flex-start;
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-md);
			background: var(--color-primary-bg);
			color: var(--color-primary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			text-decoration: none;
		}
	}
</style>
