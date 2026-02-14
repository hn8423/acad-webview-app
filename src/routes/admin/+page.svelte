<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { isRouteAllowed } from '$lib/config/admin-permissions';
	import Card from '$lib/components/ui/Card.svelte';
	import { goto } from '$app/navigation';
</script>

<div class="admin-dashboard">
	<h1 class="admin-dashboard__title">대시보드</h1>

	<div class="admin-dashboard__grid">
		{#if isRouteAllowed('/admin/notices', academyStore.memberRole)}
			<Card onclick={() => goto('/admin/notices')}>
				<div class="dashboard-card">
					<div class="dashboard-card__icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-primary)"
							stroke-width="2"
						>
							<path
								d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
							/>
						</svg>
					</div>
					<span class="dashboard-card__label">공지사항 관리</span>
				</div>
			</Card>
		{/if}

		{#if isRouteAllowed('/admin/instructors', academyStore.memberRole)}
			<Card onclick={() => goto('/admin/instructors')}>
				<div class="dashboard-card">
					<div class="dashboard-card__icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-primary)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
					<span class="dashboard-card__label">강사 관리</span>
				</div>
			</Card>
		{/if}

		{#if isRouteAllowed('/admin/students', academyStore.memberRole)}
			<Card onclick={() => goto('/admin/students')}>
				<div class="dashboard-card">
					<div class="dashboard-card__icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-primary)"
							stroke-width="2"
						>
							<path
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					</div>
					<span class="dashboard-card__label">수강생 관리</span>
				</div>
			</Card>
		{/if}

		{#if isRouteAllowed('/admin/feedback', academyStore.memberRole)}
			<Card onclick={() => goto('/admin/feedback')}>
				<div class="dashboard-card">
					<div class="dashboard-card__icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-primary)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<span class="dashboard-card__label">피드백 시트 작성</span>
				</div>
			</Card>
		{/if}

		{#if isRouteAllowed('/admin/reservations', academyStore.memberRole)}
			<Card onclick={() => goto('/admin/reservations')}>
				<div class="dashboard-card">
					<div class="dashboard-card__icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-primary)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<span class="dashboard-card__label">예약 관리</span>
				</div>
			</Card>
		{/if}
	</div>
</div>

<style lang="scss">
	.admin-dashboard {
		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			margin-bottom: var(--space-lg);
			color: var(--color-text);
		}

		&__grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-md);
		}
	}

	.dashboard-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-lg) var(--space-md);
		transition: transform var(--transition-fast);

		&:active {
			transform: scale(0.97);
		}

		&__icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 48px;
			height: 48px;
			background: var(--color-primary-bg);
			border-radius: var(--radius-full);
		}

		&__label {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
			text-align: center;
		}
	}
</style>
