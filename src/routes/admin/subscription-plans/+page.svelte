<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import {
		getSubscriptionPlans,
		createSubscriptionPlan,
		updateSubscriptionPlan,
		deleteSubscriptionPlan
	} from '$lib/api/subscription';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { formatCurrency } from '$lib/utils/format';
	import {
		calcInstallmentAmounts,
		normalizeLessonGrants,
		suggestLessonGrants,
		validateLessonGrants,
		validatePlanAmounts
	} from '$lib/utils/subscription';
	import InstallmentScheduleEditor from '$lib/components/subscription/InstallmentScheduleEditor.svelte';
	import type { SubscriptionPlan } from '$lib/types/subscription';

	let plans = $state<SubscriptionPlan[]>([]);
	let loading = $state(true);
	let submitting = $state(false);
	let deleting = $state(false);
	let error = $state('');

	let showFormModal = $state(false);
	let editTarget = $state<SubscriptionPlan | null>(null);
	let planName = $state('');
	let totalAmount = $state('');
	let installmentCount = $state('');
	let monthlyAmount = $state('');
	let totalLessons = $state('');
	// 회차별 지급 수강 회차. 총 회차/납부 횟수가 정해지면 기본 배분으로 채우고
	// 원장이 표에서 개별 수정한다.
	let lessonGrants = $state<number[]>([]);
	// 스케줄 에디터는 납부 예정일도 함께 받지만 아이템 템플릿에는 날짜 개념이 없다.
	// 여기서는 지급 회차 편집만 쓰므로 빈 배열을 넘긴다.
	let previewDueDates = $state<string[]>([]);

	let showDeleteModal = $state(false);
	let deleteTarget = $state<SubscriptionPlan | null>(null);

	let formTitle = $derived(editTarget ? '구독 아이템 수정' : '구독 아이템 추가');

	onMount(() => fetchPlans());

	async function fetchPlans() {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const res = await getSubscriptionPlans(academyId);
			if (res.status) plans = res.data ?? [];
		} catch {
			// handled by client.ts
		} finally {
			loading = false;
		}
	}

	let draft = $derived({
		total_amount: Number(totalAmount),
		installment_count: Number(installmentCount),
		monthly_amount: Number(monthlyAmount)
	});

	let isDraftFilled = $derived(!!totalAmount && !!installmentCount);

	// 입력하는 동안 회차별 금액을 그대로 보여줘 오타를 눈으로 잡게 한다.
	// 최종 계산은 서버가 다시 한다.
	let previewAmounts = $derived.by(() => {
		if (!isDraftFilled) return [];
		if (validatePlanAmounts(draft)) return [];
		return calcInstallmentAmounts(draft);
	});

	let amountError = $derived(isDraftFilled ? (validatePlanAmounts(draft) ?? '') : '');

	let lessonPlan = $derived({
		total_lessons: Number(totalLessons) || 0,
		installment_count: draft.installment_count
	});

	// 총 회차나 납부 횟수가 바뀌면 기본 배분으로 다시 채운다.
	// untrack 없이 lessonGrants 를 읽으면 자기 자신에 반응해 루프가 된다.
	$effect(() => {
		const count = lessonPlan.installment_count;
		const total = lessonPlan.total_lessons;
		if (!count || count < 1) return;
		untrack(() => {
			if (lessonGrants.length !== count) {
				lessonGrants = suggestLessonGrants({ total_lessons: total, installment_count: count });
			}
		});
	});

	let lessonError = $derived(
		isDraftFilled
			? (validateLessonGrants(lessonGrants, draft.installment_count, lessonPlan.total_lessons) ??
					'')
			: ''
	);

	// 편집 중에도 표가 행 수를 잃지 않도록 길이를 맞춰 둔다
	let editorLessons = $derived(normalizeLessonGrants(lessonGrants, lessonPlan));

	let canSubmit = $derived(
		!!planName.trim() && isDraftFilled && !amountError && !lessonError && !submitting
	);

	// 지급 회차를 다시 나눠준다 — 원장이 잘못 만졌을 때 되돌리는 버튼용
	function resetLessonGrants() {
		lessonGrants = suggestLessonGrants(lessonPlan);
	}

	function openCreateModal() {
		editTarget = null;
		planName = '';
		totalAmount = '';
		installmentCount = '';
		monthlyAmount = '';
		totalLessons = '';
		lessonGrants = [];
		error = '';
		showFormModal = true;
	}

	function openEditModal(plan: SubscriptionPlan) {
		editTarget = plan;
		planName = plan.plan_name;
		totalAmount = String(plan.total_amount);
		installmentCount = String(plan.installment_count);
		monthlyAmount = String(plan.monthly_amount);
		totalLessons = String(plan.total_lessons ?? 0);
		lessonGrants = normalizeLessonGrants(plan.lesson_grants, {
			total_lessons: plan.total_lessons ?? 0,
			installment_count: plan.installment_count
		});
		error = '';
		showFormModal = true;
	}

	async function handleSubmit() {
		if (!canSubmit) return;
		const academyId = academyStore.academyId;
		if (!academyId) return;

		error = '';
		submitting = true;
		try {
			const payload = {
				plan_name: planName.trim(),
				total_amount: draft.total_amount,
				installment_count: draft.installment_count,
				// 1회 납부면 월 납입액은 의미가 없다 — 서버가 총액으로 맞춘다
				monthly_amount: draft.installment_count <= 1 ? draft.total_amount : draft.monthly_amount,
				total_lessons: lessonPlan.total_lessons,
				lesson_grants: editorLessons
			};

			const res = editTarget
				? await updateSubscriptionPlan(academyId, editTarget.id, payload)
				: await createSubscriptionPlan(academyId, payload);

			if (res.status) {
				toastStore.success(res.message || '저장되었습니다.');
				showFormModal = false;
				await fetchPlans();
			} else {
				error = res.message || '저장에 실패했습니다.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '저장에 실패했습니다.';
		} finally {
			submitting = false;
		}
	}

	function confirmDelete(plan: SubscriptionPlan) {
		deleteTarget = plan;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (deleting) return;
		const academyId = academyStore.academyId;
		if (!academyId || !deleteTarget) return;

		deleting = true;
		try {
			const res = await deleteSubscriptionPlan(academyId, deleteTarget.id);
			if (res.status) {
				toastStore.success(res.message || '삭제되었습니다.');
				showDeleteModal = false;
				deleteTarget = null;
				await fetchPlans();
			}
		} catch {
			// handled by client.ts
		} finally {
			deleting = false;
		}
	}
</script>

<div class="plans-page">
	<BackHeader title="구독 아이템 관리" onback={() => goto('/admin')} />

	<div class="plans-page__content">
		<p class="plans-page__hint">
			총 금액과 납부 횟수, 한 달에 낼 금액을 정하면 나머지는 마지막 회차에 몰아서 부과됩니다. 총
			수강 회차를 지정하면 회차를 납부할 때마다 그만큼 수강 회차가 지급됩니다.
		</p>

		<div class="plans-page__header">
			<Button size="sm" onclick={openCreateModal}>아이템 추가</Button>
		</div>

		{#if loading}
			<div class="plans-page__loading"><Spinner /></div>
		{:else if plans.length === 0}
			<p class="plans-page__empty">등록된 구독 아이템이 없습니다.</p>
		{:else}
			<div class="plan-list">
				{#each plans as plan (plan.id)}
					<div class="plan-item">
						<div class="plan-item__head">
							<span class="plan-item__name">{plan.plan_name}</span>
							<span class="plan-item__total">{formatCurrency(plan.total_amount)}</span>
						</div>
						<p class="plan-item__detail">
							{plan.installment_count}회 분납
							{#if plan.installment_count > 1}
								· {plan.installment_count - 1}회 {formatCurrency(plan.monthly_amount)}
								· 마지막 {formatCurrency(plan.final_amount)}
							{/if}
						</p>
						{#if plan.total_lessons > 0}
							<p class="plan-item__lessons">
								총 {plan.total_lessons}회차 · 납부마다 {plan.lesson_grants.join('·')}회 지급
							</p>
						{:else}
							<p class="plan-item__lessons plan-item__lessons--none">
								회차 지급 없음 (수납 장부 전용)
							</p>
						{/if}
						<div class="plan-item__actions">
							<Button size="sm" variant="ghost" onclick={() => openEditModal(plan)}>수정</Button>
							<Button size="sm" variant="danger" onclick={() => confirmDelete(plan)}>삭제</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Modal isOpen={showFormModal} title={formTitle} onclose={() => (showFormModal = false)}>
	<div class="plan-form">
		<Input
			label="아이템 이름"
			bind:value={planName}
			placeholder="정규반 4회 분납"
			maxlength={100}
		/>
		<Input type="number" label="총 금액 (원)" bind:value={totalAmount} placeholder="954000" />
		<Input type="number" label="납부 횟수" bind:value={installmentCount} placeholder="4" />
		{#if Number(installmentCount) > 1}
			<Input
				type="number"
				label="한 달에 낼 금액 (원)"
				bind:value={monthlyAmount}
				placeholder="230000"
				error={amountError}
			/>
		{/if}

		<Input type="number" label="총 수강 회차" bind:value={totalLessons} placeholder="12" />
		<p class="plan-form__hint">
			납부할 때마다 나눠서 지급됩니다. 0이면 회차 지급 없이 수납 장부로만 씁니다.
		</p>

		{#if previewAmounts.length > 0}
			<div class="plan-form__preview">
				<div class="plan-form__preview-head">
					<p class="plan-form__preview-title">회차별 금액 · 지급 회차</p>
					{#if lessonPlan.total_lessons > 0}
						<button type="button" class="plan-form__reset" onclick={resetLessonGrants}>
							기본 배분으로
						</button>
					{/if}
				</div>
				<InstallmentScheduleEditor
					bind:dueDates={previewDueDates}
					amounts={previewAmounts}
					bind:lessons={lessonGrants}
					totalLessons={lessonPlan.total_lessons}
					editableLessons
					showDueDates={false}
					error={lessonError}
				/>
			</div>
		{:else if amountError}
			<p class="plan-form__error">{amountError}</p>
		{/if}

		{#if error}
			<p class="plan-form__error">{error}</p>
		{/if}

		<div class="plan-form__actions">
			<Button variant="secondary" fullWidth onclick={() => (showFormModal = false)}>취소</Button>
			<Button fullWidth loading={submitting} disabled={!canSubmit} onclick={handleSubmit}>
				저장
			</Button>
		</div>
	</div>
</Modal>

<Modal isOpen={showDeleteModal} title="구독 아이템 삭제" onclose={() => (showDeleteModal = false)}>
	<div class="delete-confirm">
		<p class="delete-confirm__text">
			'{deleteTarget?.plan_name}' 아이템을 삭제할까요?
		</p>
		<p class="delete-confirm__note">
			이미 적용된 분납은 부여 시점 금액을 그대로 유지하므로 영향을 받지 않습니다.
		</p>
		<div class="delete-confirm__actions">
			<Button variant="secondary" fullWidth onclick={() => (showDeleteModal = false)}>취소</Button>
			<Button variant="danger" fullWidth loading={deleting} onclick={handleDelete}>삭제</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.plans-page {
		min-height: 100dvh;
		background: var(--color-bg);

		&__content {
			padding: var(--space-md);
		}

		&__hint {
			margin: 0 0 var(--space-md);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-surface);
			border-radius: var(--radius-md);
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.5;
		}

		&__header {
			display: flex;
			justify-content: flex-end;
			margin-bottom: var(--space-md);
		}

		&__loading {
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 200px;
		}

		&__empty {
			padding: var(--space-3xl) 0;
			text-align: center;
			color: var(--color-text-muted);
			font-size: var(--font-size-sm);
		}
	}

	.plan-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.plan-item {
		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);

		&__head {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: var(--space-sm);
		}

		&__name {
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-semibold);
		}

		&__total {
			font-size: var(--font-size-md);
			font-weight: var(--font-weight-bold);
			color: var(--color-primary);
			white-space: nowrap;
		}

		&__detail {
			margin: 4px 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.5;
		}

		&__lessons {
			margin: 2px 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-primary);
			line-height: 1.5;

			/* 회차 지급을 안 쓰는 아이템은 강조하지 않는다 */
			&--none {
				color: var(--color-text-muted);
			}
		}

		&__actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-xs);
			margin-top: var(--space-sm);
		}
	}

	.plan-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__preview {
			padding: var(--space-md);
			background: var(--color-bg);
			border-radius: var(--radius-md);
		}

		&__preview-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--space-sm);
		}

		&__preview-title {
			margin: 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
		}

		/* 원장이 지급 회차를 잘못 만졌을 때 기본 배분으로 되돌린다 */
		&__reset {
			padding: 2px 8px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-full);
			background: var(--color-surface);
			color: var(--color-text-secondary);
			font-size: var(--font-size-xs);
			font-family: inherit;
			cursor: pointer;
		}

		&__hint {
			margin: calc(var(--space-md) * -1 + 4px) 0 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.5;
		}

		&__error {
			margin: 0;
			color: var(--color-danger);
			font-size: var(--font-size-xs);
		}

		&__actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-sm);
		}
	}

	.delete-confirm {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);

		&__text {
			margin: 0;
			font-size: var(--font-size-md);
		}

		&__note {
			margin: 0;
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);
			line-height: 1.5;
		}

		&__actions {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-sm);
			margin-top: var(--space-sm);
		}
	}
</style>
