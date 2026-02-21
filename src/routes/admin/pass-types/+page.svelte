<script lang="ts">
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { getPassTypes, createPassType, updatePassType, deletePassType } from '$lib/api/member';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatNumber } from '$lib/utils/format';
	import type { PassType, CreatePassTypeRequest, UpdatePassTypeRequest } from '$lib/types/member';
	import { onMount } from 'svelte';

	const CATEGORY_LABELS: Record<PassType['pass_category'], string> = {
		ROTATION: '로테이션',
		FULL: '풀타임',
		ENSEMBLE: '앙상블',
		PT: '개인레슨',
		GROUP: '그룹'
	};

	const CATEGORY_VARIANTS: Record<
		PassType['pass_category'],
		'success' | 'warning' | 'danger' | 'info' | 'neutral'
	> = {
		ROTATION: 'info',
		FULL: 'success',
		ENSEMBLE: 'warning',
		PT: 'danger',
		GROUP: 'neutral'
	};

	let passTypes = $state<PassType[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let deleting = $state(false);
	let error = $state('');

	// 생성/수정 모달
	let showFormModal = $state(false);
	let editTarget = $state<PassType | null>(null);
	let passName = $state('');
	let passCategory = $state<PassType['pass_category'] | ''>('');
	let ticketValue = $state('');
	let maxCapacity = $state('');
	let durationDays = $state('');
	let totalLessons = $state('');
	let price = $state('');
	let allowDuplicateBooking = $state(false);

	// 삭제 모달
	let showDeleteModal = $state(false);
	let deleteTarget = $state<PassType | null>(null);

	let formTitle = $derived(editTarget ? '수강권 수정' : '수강권 추가');

	onMount(() => fetchPassTypes());

	async function fetchPassTypes() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getPassTypes(academyId);
			if (res.status && res.data) {
				const data = res.data;
				passTypes = Array.isArray(data) ? data : (data.pass_types ?? []);
			}
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	function openCreateModal() {
		editTarget = null;
		passName = '';
		passCategory = '';
		ticketValue = '';
		maxCapacity = '';
		durationDays = '';
		totalLessons = '';
		price = '';
		allowDuplicateBooking = false;
		error = '';
		showFormModal = true;
	}

	function openEditModal(pt: PassType) {
		editTarget = pt;
		passName = pt.pass_name;
		passCategory = pt.pass_category;
		ticketValue = String(pt.ticket_value);
		maxCapacity = String(pt.max_capacity);
		durationDays = String(pt.duration_days);
		totalLessons = String(pt.total_lessons);
		price = String(pt.price);
		allowDuplicateBooking = pt.allow_duplicate_booking === 1;
		error = '';
		showFormModal = true;
	}

	function confirmDelete(pt: PassType) {
		deleteTarget = pt;
		showDeleteModal = true;
	}

	async function handleSubmit() {
		if (submitting) return;
		error = '';

		if (!passName.trim() || !passCategory) {
			error = '수강권 이름과 카테고리는 필수입니다.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		submitting = true;
		try {
			const data = {
				pass_name: passName.trim(),
				pass_category: passCategory as PassType['pass_category'],
				ticket_value: ticketValue ? Number(ticketValue) : undefined,
				max_capacity: maxCapacity ? Number(maxCapacity) : undefined,
				duration_days: durationDays ? Number(durationDays) : undefined,
				total_lessons: totalLessons ? Number(totalLessons) : undefined,
				price: price ? Number(price) : undefined,
				allow_duplicate_booking: allowDuplicateBooking ? 1 : 0
			};

			if (editTarget) {
				const res = await updatePassType(academyId, editTarget.id, data as UpdatePassTypeRequest);
				if (res.status) {
					toastStore.success('수강권이 수정되었습니다.');
					showFormModal = false;
					await fetchPassTypes();
				} else {
					error = res.message || '수정에 실패했습니다.';
				}
			} else {
				const res = await createPassType(academyId, data as CreatePassTypeRequest);
				if (res.status) {
					toastStore.success('수강권이 추가되었습니다.');
					showFormModal = false;
					await fetchPassTypes();
				} else {
					error = res.message || '추가에 실패했습니다.';
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '저장에 실패했습니다.';
		} finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		if (deleting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		deleting = true;
		try {
			const res = await deletePassType(academyId, deleteTarget.id);
			if (res.status) {
				toastStore.success('수강권이 삭제되었습니다.');
				showDeleteModal = false;
				deleteTarget = null;
				await fetchPassTypes();
			}
		} catch {
			// handled by client.ts
		} finally {
			deleting = false;
		}
	}
</script>

<div class="pass-types-page">
	<BackHeader title="수강권 종류 관리" onback={() => goto('/admin')} />

	<div class="pass-types-page__content">
		<div class="pass-types-page__header">
			<Button size="sm" onclick={openCreateModal}>수강권 추가</Button>
		</div>

		{#if loading}
			<div class="pass-types-page__loading">
				<Spinner />
			</div>
		{:else if passTypes.length === 0}
			<p class="pass-types-page__empty">등록된 수강권 종류가 없습니다.</p>
		{:else}
			<div class="pass-type-list">
				{#each passTypes as pt, i (pt.id)}
					<div class="pass-type-item">
						<div class="pass-type-item__header">
							<Badge variant={CATEGORY_VARIANTS[pt.pass_category] ?? 'neutral'}>
								{CATEGORY_LABELS[pt.pass_category] ?? pt.pass_category}
							</Badge>
							<span class="pass-type-item__name">{pt.pass_name}</span>
						</div>
						<div class="pass-type-item__details">
							총 {pt.total_lessons}회 | {pt.duration_days}일 | {formatNumber(pt.price)}원
							{#if pt.ticket_value > 1}
								| <span class="pass-type-item__ticket-highlight">{pt.ticket_value}회 차감</span>
							{/if}
						</div>
						<div class="pass-type-item__actions">
							<button class="action-btn" onclick={() => openEditModal(pt)}>수정</button>
							<button class="action-btn action-btn--danger" onclick={() => confirmDelete(pt)}>
								삭제
							</button>
						</div>
					</div>
					{#if i < passTypes.length - 1}
						<div class="pass-type-list__divider"></div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- 생성/수정 모달 -->
<Modal isOpen={showFormModal} title={formTitle} onclose={() => (showFormModal = false)}>
	<form
		class="pass-type-form"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<Input label="수강권 이름" bind:value={passName} placeholder="예: 로테이션 4회" />

		<div class="pass-type-form__field">
			<label class="pass-type-form__label" for="pass-category">카테고리</label>
			<select id="pass-category" class="pass-type-form__select" bind:value={passCategory}>
				<option value="">선택하세요</option>
				<option value="ROTATION">로테이션</option>
				<option value="FULL">풀타임</option>
				<option value="ENSEMBLE">앙상블</option>
				<option value="PT">개인레슨</option>
				<option value="GROUP">그룹</option>
			</select>
		</div>

		<div class="pass-type-form__row">
			<Input type="number" label="총 수업 횟수" bind:value={totalLessons} placeholder="4" />
			<Input type="number" label="유효 기간 (일)" bind:value={durationDays} placeholder="30" />
		</div>

		<Input type="number" label="가격 (원)" bind:value={price} placeholder="200000" />

		<div class="pass-type-form__row">
			<Input type="number" label="1회 차감 횟수" bind:value={ticketValue} placeholder="1" />
			<Input type="number" label="최대 인원" bind:value={maxCapacity} placeholder="1" />
		</div>

		<label class="pass-type-form__checkbox">
			<input type="checkbox" bind:checked={allowDuplicateBooking} />
			<span>중복 예약 허용</span>
		</label>

		{#if error}
			<p class="pass-type-form__error">{error}</p>
		{/if}

		<div class="pass-type-form__actions">
			<Button type="submit" fullWidth loading={submitting}>
				{editTarget ? '수정하기' : '추가하기'}
			</Button>
			<Button variant="secondary" fullWidth onclick={() => (showFormModal = false)}>취소</Button>
		</div>
	</form>
</Modal>

<!-- 삭제 확인 모달 -->
<Modal isOpen={showDeleteModal} title="수강권 삭제" onclose={() => (showDeleteModal = false)}>
	<p class="modal-message">"{deleteTarget?.pass_name}" 수강권을 삭제하시겠습니까?</p>
	<div class="modal-actions">
		<Button variant="danger" fullWidth onclick={handleDelete} loading={deleting}>삭제</Button>
		<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
	</div>
</Modal>

<style lang="scss">
	.pass-types-page {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__header {
			display: flex;
			justify-content: flex-end;
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
	}

	.pass-type-list {
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		padding: 0 var(--space-md);
	}

	.pass-type-list__divider {
		height: 1px;
		background-color: var(--color-divider);
	}

	.pass-type-item {
		padding: var(--space-md) 0;

		&__header {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-xs);
		}

		&__name {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__details {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
			margin-bottom: var(--space-sm);
		}

		&__ticket-highlight {
			color: var(--color-warning);
			font-weight: var(--font-weight-medium);
		}

		&__actions {
			display: flex;
			gap: var(--space-sm);
			justify-content: flex-end;
		}
	}

	.action-btn {
		font-size: var(--font-size-sm);
		color: var(--color-primary);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);

		&:hover {
			background: var(--color-primary-bg);
		}

		&--danger {
			color: var(--color-danger);

			&:hover {
				background: var(--color-danger-bg);
			}
		}
	}

	.pass-type-form {
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

		&__row {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-md);
		}

		&__checkbox {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
			cursor: pointer;

			input[type='checkbox'] {
				width: 20px;
				height: 20px;
				cursor: pointer;
				accent-color: var(--color-primary);
			}

			span {
				font-size: var(--font-size-base);
				color: var(--color-text);
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

	.modal-message {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		line-height: var(--line-height-base);
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}
</style>
