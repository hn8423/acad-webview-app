<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMembers } from '$lib/api/member';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { formatPhone } from '$lib/utils/format';
	import { goto } from '$app/navigation';
	import type { MemberListItem } from '$lib/types/member';
	import { onMount } from 'svelte';

	let members = $state<MemberListItem[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let search = $state('');
	let nextCursor = $state<number | null>(null);
	let hasMore = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(() => fetchMembers());

	async function fetchMembers(append = false) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		if (append) {
			loadingMore = true;
		} else {
			loading = true;
		}

		try {
			const cursor = append ? (nextCursor ?? undefined) : undefined;
			const res = await getMembers(academyId, cursor, 20, search || undefined);
			if (res.status && res.data) {
				if (append) {
					members = [...members, ...res.data.list];
				} else {
					members = res.data.list;
				}
				nextCursor = res.data.next_cursor;
				hasMore = res.data.has_more;
			}
		} catch {
			// handle error
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function handleSearchInput() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			nextCursor = null;
			fetchMembers();
		}, 300);
	}

	function loadMore() {
		if (!loadingMore && hasMore) {
			fetchMembers(true);
		}
	}
</script>

<div class="admin-students">
	<h1 class="admin-students__title">수강생 관리</h1>

	<div class="admin-students__search">
		<Input placeholder="이름으로 검색..." bind:value={search} oninput={handleSearchInput} />
	</div>

	{#if loading}
		<div class="admin-students__loading">
			<Spinner />
		</div>
	{:else if members.length === 0}
		<p class="admin-students__empty">
			{search ? '검색 결과가 없습니다.' : '등록된 수강생이 없습니다.'}
		</p>
	{:else}
		<div class="student-list">
			{#each members as member, i}
				<div
					class="student-row"
					role="button"
					tabindex="0"
					onclick={() => goto(`/admin/students/${member.member_id}`)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							goto(`/admin/students/${member.member_id}`);
						}
					}}
				>
					<div class="student-row__info">
						<h3 class="student-row__name">{member.user_name}</h3>
						<span class="student-row__phone">{formatPhone(member.user_phone)}</span>
					</div>
					<div class="student-row__stats">
						{#if member.active_passes > 0}
							<Badge variant="success">수강권 {member.active_passes}</Badge>
						{/if}
						{#if member.remaining_drinks > 0}
							<Badge variant="info">음료 {member.remaining_drinks}</Badge>
						{/if}
					</div>
				</div>
				{#if i < members.length - 1}
					<div class="student-list__divider"></div>
				{/if}
			{/each}
		</div>

		{#if hasMore}
			<div class="admin-students__load-more">
				{#if loadingMore}
					<Spinner size="sm" />
				{:else}
					<button class="load-more-btn" onclick={loadMore}>더 보기</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.admin-students {
		&__title {
			font-size: var(--font-size-2xl);
			font-weight: var(--font-weight-bold);
			letter-spacing: var(--letter-spacing-tight);
			margin-bottom: var(--space-md);
			color: var(--color-text);
		}

		&__search {
			margin-bottom: var(--space-md);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}

		&__empty {
			text-align: center;
			color: var(--color-text-muted);
			padding: var(--space-2xl);
		}

		&__load-more {
			display: flex;
			justify-content: center;
			padding: var(--space-md);
		}
	}

	.student-list {
		display: flex;
		flex-direction: column;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.student-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.student-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: var(--space-md) 0;
		cursor: pointer;
		transition: opacity var(--transition-fast);

		&:active {
			opacity: 0.7;
		}

		&__info {
			flex: 1;
			min-width: 0;
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__phone {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			margin-top: 2px;
		}

		&__stats {
			display: flex;
			gap: var(--space-xs);
		}
	}

	.load-more-btn {
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-full);
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-primary-bg);
		}
	}
</style>
