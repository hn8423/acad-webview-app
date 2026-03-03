<script lang="ts">
	import { onDestroy } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { getMembers, getMemberPasses } from '$lib/api/member';
	import { getTodayString, formatPhone } from '$lib/utils/format';
	import type { MemberListItem, MemberPass } from '$lib/types/member';
	import type { AdminCreateHoldingRequest } from '$lib/types/holding';

	interface Props {
		isOpen: boolean;
		onclose: () => void;
		onsubmit: (data: AdminCreateHoldingRequest) => void;
		submitting?: boolean;
		error?: string;
	}

	let {
		isOpen = $bindable(false),
		onclose,
		onsubmit,
		submitting = false,
		error = ''
	}: Props = $props();

	// Member search
	let memberSearch = $state('');
	let members = $state<MemberListItem[]>([]);
	let memberLoading = $state(false);
	let selectedMember = $state<MemberListItem | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	// Pass selection
	let passes = $state<MemberPass[]>([]);
	let passLoading = $state(false);
	let selectedPassId = $state('');

	// Date/reason
	let holdingStart = $state('');
	let holdingEnd = $state('');
	let holdingReason = $state('');
	let validationError = $state('');
	let today = $state(getTodayString());

	let activePasses = $derived(passes.filter((p) => p.status === 'ACTIVE'));

	$effect(() => {
		if (!isOpen) return;
		today = getTodayString();
		memberSearch = '';
		members = [];
		selectedMember = null;
		passes = [];
		selectedPassId = '';
		holdingStart = today;
		holdingEnd = '';
		holdingReason = '';
		validationError = '';
	});

	function handleMemberSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		const query = memberSearch.trim();
		if (query.length < 1) {
			members = [];
			return;
		}

		searchTimer = setTimeout(async () => {
			const academyId = academyStore.academyId;
			if (!academyId) return;

			memberLoading = true;
			try {
				const res = await getMembers(academyId, undefined, 20, query);
				if (res.status && res.data) {
					const list = res.data.list ?? [];
					members = list.filter((m) => m.member_role === 'STUDENT');
				}
			} catch {
				members = [];
			} finally {
				memberLoading = false;
			}
		}, 300);
	}

	async function selectMember(member: MemberListItem) {
		selectedMember = member;
		memberSearch = '';
		members = [];
		selectedPassId = '';

		const academyId = academyStore.academyId;
		if (!academyId) return;

		passLoading = true;
		try {
			const res = await getMemberPasses(academyId, member.member_id);
			if (res.status) {
				passes = res.data;
			}
		} catch {
			passes = [];
		} finally {
			passLoading = false;
		}
	}

	function clearMember() {
		selectedMember = null;
		passes = [];
		selectedPassId = '';
	}

	function handleSubmit() {
		validationError = '';

		if (!selectedMember) {
			validationError = '수강생을 선택해주세요.';
			return;
		}
		if (!selectedPassId) {
			validationError = '수강권을 선택해주세요.';
			return;
		}
		if (!holdingStart) {
			validationError = '시작일을 선택해주세요.';
			return;
		}
		if (!holdingEnd) {
			validationError = '종료일을 선택해주세요.';
			return;
		}
		if (holdingStart < today) {
			validationError = '시작일은 오늘 이후여야 합니다.';
			return;
		}
		if (holdingEnd < holdingStart) {
			validationError = '종료일은 시작일 이후여야 합니다.';
			return;
		}

		onsubmit({
			member_id: selectedMember.member_id,
			pass_id: Number(selectedPassId),
			holding_start: holdingStart,
			holding_end: holdingEnd,
			reason: holdingReason.trim() || undefined
		});
	}
</script>

<Modal {isOpen} title="홀딩 설정" {onclose}>
	<form
		class="admin-holding-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<!-- 수강생 선택 -->
		<div class="admin-holding-form__field">
			<span class="admin-holding-form__label">수강생</span>
			{#if selectedMember}
				<div class="admin-holding-form__selected">
					<span class="admin-holding-form__selected-name">
						{selectedMember.user_name}
						<span class="admin-holding-form__selected-phone">
							{formatPhone(selectedMember.user_phone)}
						</span>
					</span>
					<button
						type="button"
						class="admin-holding-form__selected-clear"
						onclick={clearMember}
					>
						변경
					</button>
				</div>
			{:else}
				<div class="admin-holding-form__search-wrap">
					<Input
						placeholder="수강생 이름으로 검색"
						bind:value={memberSearch}
						oninput={handleMemberSearch}
					/>
					{#if memberLoading}
						<div class="admin-holding-form__search-loading">
							<Spinner size="sm" />
						</div>
					{:else if members.length > 0}
						<div class="admin-holding-form__results">
							{#each members as member (member.member_id)}
								<button
									type="button"
									class="admin-holding-form__result-item"
									onclick={() => selectMember(member)}
								>
									<span class="admin-holding-form__result-name">{member.user_name}</span>
									<span class="admin-holding-form__result-phone">
										{formatPhone(member.user_phone)}
									</span>
								</button>
							{/each}
						</div>
					{:else if memberSearch.trim().length > 0 && !memberLoading}
						<p class="admin-holding-form__no-result">검색 결과가 없습니다.</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- 수강권 선택 -->
		{#if selectedMember}
			<div class="admin-holding-form__field">
				<span class="admin-holding-form__label">수강권</span>
				{#if passLoading}
					<div class="admin-holding-form__search-loading">
						<Spinner size="sm" />
					</div>
				{:else if activePasses.length === 0}
					<p class="admin-holding-form__no-result">이용 중인 수강권이 없습니다.</p>
				{:else}
					<select class="admin-holding-form__select" bind:value={selectedPassId}>
						<option value="">선택하세요</option>
						{#each activePasses as pass (pass.id)}
							<option value={pass.id}>{pass.pass_name} ({pass.instructor_name})</option>
						{/each}
					</select>
				{/if}
			</div>
		{/if}

		<!-- 날짜 -->
		<Input type="date" label="시작일" bind:value={holdingStart} />
		<Input type="date" label="종료일" bind:value={holdingEnd} />

		<!-- 사유 -->
		<div class="admin-holding-form__field">
			<label class="admin-holding-form__label" for="admin-holding-reason">사유 (선택)</label>
			<textarea
				id="admin-holding-reason"
				class="admin-holding-form__textarea"
				bind:value={holdingReason}
				placeholder="홀딩 사유를 입력해주세요"
				rows="3"
				maxlength={500}
			></textarea>
		</div>

		{#if validationError || error}
			<p class="admin-holding-form__error">{validationError || error}</p>
		{/if}

		<div class="admin-holding-form__actions">
			<Button type="submit" fullWidth loading={submitting}>홀딩 설정</Button>
			<Button variant="secondary" fullWidth onclick={onclose}>취소</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.admin-holding-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__field {
			display: flex;
			flex-direction: column;
			gap: var(--space-xs);
		}

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__search-wrap {
			position: relative;
		}

		&__search-loading {
			display: flex;
			justify-content: center;
			padding: var(--space-sm);
		}

		&__results {
			max-height: 200px;
			overflow-y: auto;
			background: var(--color-white);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			margin-top: var(--space-xs);
		}

		&__result-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			padding: var(--space-sm) var(--space-md);
			text-align: left;
			transition: background-color var(--transition-fast);

			&:not(:last-child) {
				border-bottom: 1px solid var(--color-divider);
			}

			&:hover {
				background-color: var(--color-bg);
			}

			&:active {
				background-color: var(--color-primary-bg);
			}
		}

		&__result-name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__result-phone {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
		}

		&__no-result {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			padding: var(--space-sm);
			text-align: center;
		}

		&__selected {
			display: flex;
			align-items: center;
			justify-content: space-between;
			background: var(--color-bg);
			padding: var(--space-sm) var(--space-md);
			border-radius: var(--radius-md);
		}

		&__selected-name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__selected-phone {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			margin-left: var(--space-sm);
		}

		&__selected-clear {
			font-size: var(--font-size-sm);
			color: var(--color-primary);
			font-weight: var(--font-weight-medium);
			padding: 4px 8px;
			border-radius: var(--radius-sm);
			transition: background-color var(--transition-fast);

			&:hover {
				background-color: var(--color-primary-bg);
			}
		}

		&__select {
			width: 100%;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			outline: none;
			appearance: none;
			background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238b95a1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
			background-repeat: no-repeat;
			background-position: right 16px center;
			padding-right: 40px;
			transition: box-shadow var(--transition-fast);

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__textarea {
			width: 100%;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			outline: none;
			resize: vertical;
			font-family: inherit;
			transition: box-shadow var(--transition-fast);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}

		&__actions {
			display: flex;
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
