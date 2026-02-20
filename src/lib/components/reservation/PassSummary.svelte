<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatDate } from '$lib/utils/format';
	import { getPassStatusVariant, getPassStatusLabel } from '$lib/utils/pass';
	import type { MemberPass } from '$lib/types/member';

	interface Props {
		passes: MemberPass[];
		loading?: boolean;
	}

	let { passes, loading = false }: Props = $props();

	let expanded = $state(true);
	let showInactive = $state(false);

	let activePasses = $derived(
		passes.filter((p) => p.status === 'ACTIVE' && p.remaining_lessons > 0)
	);

	let inactivePasses = $derived(
		passes.filter((p) => p.status !== 'ACTIVE' || p.remaining_lessons <= 0)
	);

	function getProgressPercent(pass: MemberPass): number {
		if (pass.total_lessons <= 0) return 0;
		return ((pass.total_lessons - pass.remaining_lessons) / pass.total_lessons) * 100;
	}
</script>

<section class="pass-summary">
	<button
		type="button"
		class="pass-summary__header"
		onclick={() => (expanded = !expanded)}
		aria-expanded={expanded}
	>
		<h3 class="pass-summary__title">내 수강권</h3>
		<div class="pass-summary__meta">
			{#if !loading}
				<span class="pass-summary__count">이용 가능 {activePasses.length}건</span>
			{/if}
			<svg
				class="pass-summary__chevron"
				class:pass-summary__chevron--open={expanded}
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M6 9l6 6 6-6" />
			</svg>
		</div>
	</button>

	{#snippet passCard(pass: MemberPass)}
		<div class="pass-summary-card">
			<div class="pass-summary-card__header">
				<span class="pass-summary-card__name">{pass.pass_name}</span>
				<Badge variant={getPassStatusVariant(pass.status)}>
					{getPassStatusLabel(pass.status)}
				</Badge>
			</div>
			<div class="pass-summary-card__instructor">
				{pass.instructor_name} 선생님
			</div>
			<div class="pass-summary-card__progress">
				<div
					class="pass-summary-card__progress-bar"
					role="progressbar"
					aria-label="{pass.pass_name} 진행률"
					aria-valuenow={pass.total_lessons - pass.remaining_lessons}
					aria-valuemin={0}
					aria-valuemax={pass.total_lessons}
				>
					<div
						class="pass-summary-card__progress-fill"
						style="width: {getProgressPercent(pass)}%"
					></div>
				</div>
				<span class="pass-summary-card__remaining">
					잔여 {pass.remaining_lessons}/{pass.total_lessons}회
				</span>
			</div>
			<div class="pass-summary-card__date">
				{formatDate(pass.start_date)} ~ {formatDate(pass.end_date)}
			</div>
		</div>
	{/snippet}

	{#if expanded}
		{#if loading}
			<div class="pass-summary__loading">
				<Spinner />
			</div>
		{:else if passes.length === 0}
			<p class="pass-summary__empty">등록된 수강권이 없습니다.</p>
		{:else}
			<div class="pass-summary__list">
				{#each activePasses as pass (pass.id)}
					{@render passCard(pass)}
				{/each}
			</div>

			{#if inactivePasses.length > 0}
				<button
					type="button"
					class="pass-summary__toggle"
					onclick={() => (showInactive = !showInactive)}
				>
					{showInactive ? '접기' : `기타 수강권 ${inactivePasses.length}건 보기`}
				</button>
				{#if showInactive}
					<div class="pass-summary__list pass-summary__list--inactive">
						{#each inactivePasses as pass (pass.id)}
							{@render passCard(pass)}
						{/each}
					</div>
				{/if}
			{/if}
		{/if}
	{/if}
</section>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.pass-summary {
		background: var(--color-white);
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-divider);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			background: none;
			border: none;
			cursor: pointer;
			padding: 0;
		}

		&__title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__meta {
			display: flex;
			align-items: center;
			gap: var(--space-xs);
		}

		&__count {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
		}

		&__chevron {
			color: var(--color-text-muted);
			transition: transform var(--transition-fast);

			&--open {
				transform: rotate(180deg);
			}
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-md) 0;
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-md) 0;
			font-size: var(--font-size-sm);
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
			margin-top: var(--space-sm);

			&--inactive {
				opacity: 0.6;
			}
		}

		&__toggle {
			width: 100%;
			text-align: center;
			background: none;
			border: none;
			color: var(--color-text-muted);
			font-size: var(--font-size-sm);
			padding: var(--space-sm) 0;
			cursor: pointer;
		}
	}

	.pass-summary-card {
		background: var(--color-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);

		&__header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-xs);
		}

		&__name {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
			letter-spacing: var(--letter-spacing-tight);
		}

		&__instructor {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-sm);
		}

		&__progress {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-xs);
		}

		&__progress-bar {
			flex: 1;
			height: 6px;
			background-color: var(--color-divider);
			border-radius: var(--radius-full);
			overflow: hidden;
		}

		&__progress-fill {
			height: 100%;
			background: var(--color-primary-gradient);
			border-radius: var(--radius-full);
			transition: width var(--transition-base);
		}

		&__remaining {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			white-space: nowrap;
		}

		&__date {
			font-size: var(--font-size-xs);
			color: var(--color-text-muted);
		}
	}
</style>
