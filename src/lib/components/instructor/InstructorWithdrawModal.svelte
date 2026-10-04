<script lang="ts">
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { deleteInstructor } from '$lib/api/member';
	import { getInstructorUpcomingSlots } from '$lib/api/reservation';
	import { ApiError } from '$lib/types/api';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	interface Props {
		isOpen: boolean;
		instructor: { id: number; name: string } | null;
		onclose: () => void;
		onwithdrawn: () => void;
	}

	let { isOpen, instructor, onclose, onwithdrawn }: Props = $props();

	interface Remaining {
		total: number;
		reserved: number;
	}

	let checking = $state(false);
	let remaining = $state<Remaining | null>(null);
	let withdrawing = $state(false);
	// 다른 강사로 다시 열렸을 때 이전 강사의 늦은 응답이 화면을 덮지 않게 한다
	let checkSeq = 0;

	// 탈퇴 전에 남은 수업을 확인해, 있으면 탈퇴 대신 '수업 정리'로 안내한다 (서버도 409로 막는다)
	async function checkRemaining(target: { id: number }) {
		const academyId = academyStore.academyId;
		if (!academyId) return;
		const seq = ++checkSeq;
		checking = true;
		remaining = null;
		try {
			const res = await getInstructorUpcomingSlots(academyId, target.id);
			if (seq !== checkSeq) return;
			if (res.status && res.data) {
				remaining = { total: res.data.total, reserved: res.data.reserved_count };
			}
		} catch {
			// 확인에 실패해도 탈퇴 시도는 가능 — 서버가 남은 수업을 다시 검사한다
		} finally {
			if (seq === checkSeq) checking = false;
		}
	}

	$effect(() => {
		if (isOpen && instructor) checkRemaining(instructor);
	});

	let hasRemaining = $derived((remaining?.total ?? 0) > 0);

	async function handleWithdraw() {
		const academyId = academyStore.academyId;
		if (!academyId || !instructor || withdrawing) return;

		withdrawing = true;
		try {
			const res = await deleteInstructor(academyId, instructor.id);
			if (!res.status) {
				toastStore.error(res.message || '강사를 탈퇴 처리하지 못했습니다');
				return;
			}
			toastStore.success(`${instructor.name} 강사가 탈퇴 처리되었습니다.`);
			onwithdrawn();
		} catch (err) {
			// 그사이 수업이 생겼으면 409 — 남은 수업을 다시 보여준다 (토스트는 client.ts)
			if (err instanceof ApiError && err.statusCode === 409) await checkRemaining(instructor);
		} finally {
			withdrawing = false;
		}
	}

	function goToCleanup() {
		if (!instructor) return;
		const id = instructor.id;
		onclose();
		goto(`/admin/instructors/${id}/slots`);
	}
</script>

<Modal {isOpen} title="강사 탈퇴" position="center" {onclose}>
	<div class="instructor-withdraw">
		{#if checking}
			<div class="instructor-withdraw__loading"><Spinner /></div>
		{:else if hasRemaining && remaining}
			<p class="instructor-withdraw__message">
				<strong>{instructor?.name}</strong> 강사에게 예정된 수업
				<strong>{remaining.total}건</strong>{remaining.reserved > 0
					? `(예약 ${remaining.reserved}건)`
					: ''}이 남아 있습니다.
			</p>
			<p class="instructor-withdraw__notice">
				수업을 모두 삭제해야 탈퇴할 수 있습니다. 예약이 있는 수업은 예약 회원을 확인한 뒤 삭제해
				주세요.
			</p>
			<Button fullWidth onclick={goToCleanup}>수업 정리하기</Button>
		{:else}
			<p class="instructor-withdraw__message">
				"{instructor?.name}" 강사를 탈퇴 처리하시겠습니까?
			</p>
			<Button variant="danger" fullWidth onclick={handleWithdraw} loading={withdrawing}>
				탈퇴
			</Button>
		{/if}
	</div>
</Modal>

<style lang="scss">
	@use '$lib/styles/variables' as *;
	@use '$lib/styles/mixins' as *;

	.instructor-withdraw {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);

		&__loading {
			@include flex-center;
			min-height: 80px;
		}

		&__message {
			font-size: var(--font-size-base);
			color: var(--color-text);
			line-height: var(--line-height-base);

			:global(strong) {
				font-weight: var(--font-weight-semibold);
			}
		}

		&__notice {
			font-size: var(--font-size-sm);
			color: var(--color-info);
			font-weight: var(--font-weight-medium);
			padding: var(--space-sm) var(--space-md);
			background: var(--color-info-bg);
			border-radius: var(--radius-sm);
		}
	}
</style>
