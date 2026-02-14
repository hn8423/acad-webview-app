<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getInstructorStats } from '$lib/api/member';
	import { formatMonth } from '$lib/utils/format';
	import type { InstructorStats } from '$lib/types/member';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	interface Props {
		isOpen: boolean;
		instructor: { id: number; name: string } | null;
		onclose: () => void;
	}

	let { isOpen, instructor, onclose }: Props = $props();

	const now = new Date();
	let currentYear = $state(now.getFullYear());
	let currentMonth = $state(now.getMonth() + 1);
	let stats = $state<InstructorStats | null>(null);
	let loading = $state(false);
	let errorMessage = $state('');

	let fetchId = 0;

	let monthLabel = $derived(formatMonth(currentYear, currentMonth));

	let isCurrentMonth = $derived(() => {
		const n = new Date();
		return currentYear === n.getFullYear() && currentMonth === n.getMonth() + 1;
	});

	function goToPrevMonth() {
		if (currentMonth === 1) {
			currentYear = currentYear - 1;
			currentMonth = 12;
		} else {
			currentMonth = currentMonth - 1;
		}
		fetchStats();
	}

	function goToNextMonth() {
		if (isCurrentMonth()) return;
		if (currentMonth === 12) {
			currentYear = currentYear + 1;
			currentMonth = 1;
		} else {
			currentMonth = currentMonth + 1;
		}
		fetchStats();
	}

	async function fetchStats() {
		const academyId = academyStore.academyId;
		if (!academyId || !instructor) return;

		const thisId = ++fetchId;
		loading = true;
		errorMessage = '';
		stats = null;

		try {
			const res = await getInstructorStats(academyId, instructor.id, currentYear, currentMonth);
			if (thisId !== fetchId) return;
			if (res.status && res.data) {
				stats = res.data;
			} else {
				errorMessage = res.message || '통계를 불러오는데 실패했습니다.';
			}
		} catch {
			if (thisId !== fetchId) return;
			errorMessage = '통계를 불러오는데 실패했습니다.';
		} finally {
			if (thisId === fetchId) {
				loading = false;
			}
		}
	}

	$effect(() => {
		if (isOpen && instructor) {
			const n = new Date();
			currentYear = n.getFullYear();
			currentMonth = n.getMonth() + 1;
			fetchStats();
		}
	});

	interface StatItem {
		label: string;
		value: number;
		color: string;
	}

	let statItems = $derived<StatItem[]>(
		stats
			? [
					{ label: '전체 레슨', value: stats.total_lessons, color: 'primary' },
					{ label: '완료', value: stats.completed_lessons, color: 'success' },
					{ label: '취소', value: stats.cancelled_lessons, color: 'danger' },
					{ label: '노쇼', value: stats.no_show_count, color: 'warning' },
					{ label: '수강생', value: stats.total_students, color: 'info' }
				]
			: []
	);
</script>

<Modal isOpen={isOpen} title="{instructor?.name ?? ''} 강사 통계" onclose={onclose}>
	<div class="stats-modal">
		<div class="month-nav">
			<button type="button" class="month-nav__btn" onclick={goToPrevMonth} aria-label="이전 달">
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
			</button>
			<span class="month-nav__label">{monthLabel}</span>
			<button
			type="button"
			class="month-nav__btn"
			onclick={goToNextMonth}
			disabled={isCurrentMonth()}
			aria-label="다음 달"
		>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
			</button>
		</div>

		{#if loading}
			<div class="stats-modal__loading">
				<Spinner />
			</div>
		{:else if errorMessage}
			<p class="stats-modal__error">{errorMessage}</p>
		{:else if stats}
			<div class="stats-grid">
				{#each statItems as item}
					<div class="stat-card stat-card--{item.color}">
						<span class="stat-card__label">{item.label}</span>
						<span class="stat-card__value">{item.value}</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="stats-modal__empty">통계 데이터가 없습니다.</p>
		{/if}
	</div>
</Modal>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.stats-modal {
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

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			font-size: var(--font-size-sm);
			padding: var(--space-xl);
		}
	}

	.month-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-lg);

		&__btn {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 36px;
			height: 36px;
			border-radius: var(--radius-full);
			color: var(--color-text-secondary);
			cursor: pointer;
			transition: background-color var(--transition-fast);

			&:active {
				background-color: var(--color-bg);
			}

			&:disabled {
				opacity: 0.3;
				cursor: default;

				&:active {
					background-color: transparent;
				}
			}
		}

		&__label {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
			min-width: 120px;
			text-align: center;
		}
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		background: var(--color-bg);

		&__label {
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__value {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
		}

		&--primary {
			background: var(--color-primary-bg);
			.stat-card__value {
				color: var(--color-primary);
			}
		}

		&--success {
			background: var(--color-success-bg);
			.stat-card__value {
				color: var(--color-success);
			}
		}

		&--danger {
			background: var(--color-danger-bg);
			.stat-card__value {
				color: var(--color-danger);
			}
		}

		&--warning {
			background: var(--color-warning-bg);
			.stat-card__value {
				color: var(--color-warning);
			}
		}

		&--info {
			background: var(--color-info-bg);
			.stat-card__value {
				color: var(--color-info);
			}
		}
	}
</style>
