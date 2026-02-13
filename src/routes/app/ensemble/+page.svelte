<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getEnsembles, getMyEnsembles } from '$lib/api/ensemble';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EnsembleCreateForm from '$lib/components/ensemble/EnsembleCreateForm.svelte';
	import EnsembleDetailModal from '$lib/components/ensemble/EnsembleDetailModal.svelte';
	import { formatDate } from '$lib/utils/format';
	import type { EnsembleListItem, MyEnsembleListItem } from '$lib/types/ensemble';
	import { onMount } from 'svelte';

	let activeTab = $state<'recruiting' | 'my'>('recruiting');
	let recruitingList = $state<EnsembleListItem[]>([]);
	let myList = $state<MyEnsembleListItem[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	const LIMIT = 10;

	let showCreateSheet = $state(false);
	let showDetailModal = $state(false);
	let selectedEnsembleId = $state<number | null>(null);

	onMount(() => {
		fetchData();
	});

	async function fetchData() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			if (activeTab === 'recruiting') {
				const res = await getEnsembles(academyId, 'RECRUITING', currentPage, LIMIT);
				if (res.status && res.data) {
					recruitingList = res.data.list;
					totalPages = Math.ceil(res.data.meta.total / LIMIT);
				}
			} else {
				const res = await getMyEnsembles(academyId);
				if (res.status && res.data) {
					myList = res.data.ensembles;
				}
			}
		} catch {
			// API client handles toast
		} finally {
			loading = false;
		}
	}

	function handleTabChange(tab: 'recruiting' | 'my') {
		if (activeTab === tab) return;
		activeTab = tab;
		currentPage = 1;
		fetchData();
	}

	async function goToPage(page: number) {
		currentPage = page;
		await fetchData();
	}

	function openDetail(id: number) {
		selectedEnsembleId = id;
		showDetailModal = true;
	}

	function handleCreateSuccess() {
		showCreateSheet = false;
		currentPage = 1;
		fetchData();
	}

	function handleDetailClose() {
		showDetailModal = false;
		selectedEnsembleId = null;
		fetchData();
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'RECRUITING':
				return '모집중';
			case 'CLOSED':
				return '마감';
			case 'COMPLETED':
				return '완료';
			default:
				return status;
		}
	}

	function getStatusVariant(status: string) {
		switch (status) {
			case 'RECRUITING':
				return 'success' as const;
			case 'CLOSED':
				return 'warning' as const;
			case 'COMPLETED':
				return 'info' as const;
			default:
				return 'neutral' as const;
		}
	}

	let isEmpty = $derived(
		activeTab === 'recruiting' ? recruitingList.length === 0 : myList.length === 0
	);
</script>

<div class="ensemble-page">
	<div class="ensemble-page__tabs">
		<button
			class="tab"
			class:tab--active={activeTab === 'recruiting'}
			onclick={() => handleTabChange('recruiting')}
		>
			모집중
		</button>
		<button
			class="tab"
			class:tab--active={activeTab === 'my'}
			onclick={() => handleTabChange('my')}
		>
			내 합주조
		</button>
	</div>

	<div class="ensemble-page__content">
		{#if loading}
			<div class="ensemble-page__loading">
				<Spinner />
			</div>
		{:else if isEmpty}
			<div class="ensemble-page__empty">
				<p>
					{activeTab === 'recruiting'
						? '모집중인 합주조가 없습니다.'
						: '참여중인 합주조가 없습니다.'}
				</p>
				{#if activeTab === 'recruiting'}
					<button class="ensemble-page__empty-action" onclick={() => (showCreateSheet = true)}>
						합주조 만들기
					</button>
				{/if}
			</div>
		{:else if activeTab === 'recruiting'}
			<div class="ensemble-list">
				{#each recruitingList as ensemble}
					<button class="ensemble-card" onclick={() => openDetail(ensemble.id)}>
						<div class="ensemble-card__header">
							<h3 class="ensemble-card__title">{ensemble.group_name}</h3>
							<Badge variant={getStatusVariant(ensemble.status)}>
								{getStatusLabel(ensemble.status)}
							</Badge>
						</div>
						{#if ensemble.description}
							<p class="ensemble-card__desc">{ensemble.description}</p>
						{/if}
						<div class="ensemble-card__footer">
							<div class="ensemble-card__meta">
								<span class="ensemble-card__creator">{ensemble.leader_name}</span>
								<span class="ensemble-card__dot"></span>
								<span>{ensemble.current_members}/{ensemble.max_members}명</span>
							</div>
							{#if ensemble.practice_date}
								<span class="ensemble-card__date">
									{formatDate(ensemble.practice_date)}
									{ensemble.practice_time ?? ''}
								</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>

			{#if totalPages > 1}
				<div class="pagination">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
						<button
							class="pagination__btn"
							class:pagination__btn--active={page === currentPage}
							onclick={() => goToPage(page)}
						>
							{page}
						</button>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="ensemble-list">
				{#each myList as ensemble}
					<button class="ensemble-card" onclick={() => openDetail(ensemble.id)}>
						<div class="ensemble-card__header">
							<h3 class="ensemble-card__title">{ensemble.group_name}</h3>
							<Badge variant={getStatusVariant(ensemble.status)}>
								{getStatusLabel(ensemble.status)}
							</Badge>
						</div>
						{#if ensemble.description}
							<p class="ensemble-card__desc">{ensemble.description}</p>
						{/if}
						<div class="ensemble-card__footer">
							<div class="ensemble-card__meta">
								<span>{ensemble.my_role}</span>
								{#if ensemble.is_leader}
									<span class="ensemble-card__dot"></span>
									<Badge variant="info">리더</Badge>
								{/if}
								<span class="ensemble-card__dot"></span>
								<span>{ensemble.current_members}/{ensemble.max_members}명</span>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- FAB -->
	<button class="fab" onclick={() => (showCreateSheet = true)} aria-label="합주조 만들기">
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
		>
			<path d="M12 5v14M5 12h14" />
		</svg>
	</button>
</div>

<!-- Create BottomSheet -->
<BottomSheet
	bind:isOpen={showCreateSheet}
	title="합주조 만들기"
	onclose={() => (showCreateSheet = false)}
>
	<EnsembleCreateForm oncreate={handleCreateSuccess} />
</BottomSheet>

<!-- Detail Modal -->
{#if selectedEnsembleId !== null}
	<EnsembleDetailModal
		bind:isOpen={showDetailModal}
		ensembleId={selectedEnsembleId}
		onclose={handleDetailClose}
	/>
{/if}

<style lang="scss">
	.ensemble-page {
		&__tabs {
			position: sticky;
			top: var(--header-height);
			z-index: 10;
			display: flex;
			background-color: var(--color-white);
			border-bottom: 1px solid var(--color-divider);
		}

		&__content {
			padding: var(--space-md);
			padding-bottom: calc(var(--bottom-nav-height) + 80px);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: var(--space-md);
			padding: var(--space-2xl);
			color: var(--color-text-muted);
			font-size: var(--font-size-sm);
		}

		&__empty-action {
			color: var(--color-primary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			background: none;
			border: none;
			cursor: pointer;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.tab {
		flex: 1;
		padding: 14px 0;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);

		&--active {
			color: var(--color-primary);
			font-weight: var(--font-weight-semibold);
			border-bottom-color: var(--color-primary);
		}
	}

	.ensemble-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.ensemble-card {
		width: 100%;
		text-align: left;
		background: var(--color-white);
		border: none;
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		cursor: pointer;
		transition:
			transform 150ms ease,
			opacity var(--transition-fast);

		&:active {
			transform: scale(0.98);
			opacity: 0.8;
		}

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-sm);
			margin-bottom: 6px;
		}

		&__title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
		}

		&__desc {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			margin-bottom: 8px;
		}

		&__footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-sm);
		}

		&__meta {
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}

		&__creator {
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__dot {
			width: 3px;
			height: 3px;
			border-radius: 50%;
			background-color: var(--color-text-muted);
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
			white-space: nowrap;
		}
	}

	.pagination {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);

		&__btn {
			width: 36px;
			height: 36px;
			border-radius: var(--radius-full);
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			background: none;
			border: none;
			cursor: pointer;
			transition: all var(--transition-fast);

			&:hover {
				background-color: var(--color-divider);
			}

			&--active {
				background: var(--color-primary-gradient);
				color: var(--color-white);
			}
		}
	}

	.fab {
		position: fixed;
		bottom: calc(var(--bottom-nav-height) + 20px + env(safe-area-inset-bottom, 0px));
		right: 20px;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-full);
		background: var(--color-primary-gradient);
		color: var(--color-white);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(108, 92, 231, 0.4);
		cursor: pointer;
		z-index: 50;
		transition: transform 150ms ease;

		&:active {
			transform: scale(0.9);
		}
	}
</style>
