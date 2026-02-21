<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { academyStore } from '$lib/stores/academy.svelte';
	import {
		getScheduledAlarmDetail,
		createScheduledAlarm,
		updateScheduledAlarm
	} from '$lib/api/scheduled-alarm';
	import BackHeader from '$lib/components/layout/BackHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { ScheduleType } from '$lib/types/scheduled-alarm';
	import { onMount } from 'svelte';

	const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
	const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
		DAILY: '매일',
		WEEKLY: '매주',
		MONTHLY_START: '매월 특정일',
		MONTHLY_END: '매월 말일'
	};

	let isNew = $derived(page.params.id === 'new');
	let title = $state('');
	let content = $state('');
	let scheduleType = $state<ScheduleType>('DAILY');
	let scheduleDay = $state<number>(1);
	let scheduleTime = $state('09:00');
	let loading = $state(false);
	let pageLoading = $state(true);
	let error = $state('');

	let needsDay = $derived(scheduleType === 'WEEKLY' || scheduleType === 'MONTHLY_START');

	onMount(async () => {
		if (!isNew) {
			const academyId = academyStore.academyId;
			const alarmId = Number(page.params.id);
			if (!academyId || !alarmId) return;

			try {
				const res = await getScheduledAlarmDetail(academyId, alarmId);
				if (res.status && res.data) {
					title = res.data.title;
					content = res.data.content;
					scheduleType = res.data.schedule_type;
					scheduleDay = res.data.schedule_day ?? 1;
					scheduleTime = res.data.schedule_time;
				}
			} catch {
				error = '알림 정보를 불러오지 못했습니다.';
			}
		}
		pageLoading = false;
	});

	async function handleSubmit() {
		error = '';
		if (!title.trim()) {
			error = '제목을 입력해주세요.';
			return;
		}
		if (!content.trim()) {
			error = '내용을 입력해주세요.';
			return;
		}
		if (!scheduleTime) {
			error = '발송 시간을 선택해주세요.';
			return;
		}

		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			if (isNew) {
				await createScheduledAlarm(academyId, {
					title,
					content,
					notification_type: 'SCHEDULED',
					schedule_type: scheduleType,
					...(needsDay ? { schedule_day: scheduleDay } : {}),
					schedule_time: scheduleTime
				});
			} else {
				await updateScheduledAlarm(academyId, Number(page.params.id), {
					title,
					content,
					schedule_type: scheduleType,
					...(needsDay ? { schedule_day: scheduleDay } : {}),
					schedule_time: scheduleTime
				});
			}
			goto('/admin/scheduled-alarms', { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : '저장에 실패했습니다.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="alarm-form">
	<BackHeader
		title={isNew ? '정기 알림 등록' : '정기 알림 수정'}
		onback={() => goto('/admin/scheduled-alarms')}
	/>

	<div class="alarm-form__content">
		{#if pageLoading}
			<div class="alarm-form__loading">
				<Spinner />
			</div>
		{:else}
			<form
				class="form"
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<Input label="제목" placeholder="알림 제목을 입력하세요" bind:value={title} />

				<div class="form__field">
					<label class="form__label" for="alarm-content">내용</label>
					<textarea
						id="alarm-content"
						class="form__textarea"
						placeholder="알림 내용을 입력하세요"
						bind:value={content}
					></textarea>
				</div>

				<div class="form__field">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="form__label">스케줄 타입</label>
					<div class="schedule-type-group">
						{#each Object.entries(SCHEDULE_TYPE_LABELS) as [value, label]}
							<button
								type="button"
								class="schedule-type-btn"
								class:schedule-type-btn--active={scheduleType === value}
								onclick={() => {
									scheduleType = value as ScheduleType;
									if (value === 'WEEKLY') scheduleDay = 1;
									if (value === 'MONTHLY_START') scheduleDay = 1;
								}}
							>
								{label}
							</button>
						{/each}
					</div>
				</div>

				{#if scheduleType === 'WEEKLY'}
					<div class="form__field">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="form__label">요일</label>
						<div class="day-group">
							{#each DAY_LABELS as dayLabel, idx}
								<button
									type="button"
									class="day-btn"
									class:day-btn--active={scheduleDay === idx}
									onclick={() => (scheduleDay = idx)}
								>
									{dayLabel}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if scheduleType === 'MONTHLY_START'}
					<div class="form__field">
						<label class="form__label" for="alarm-day">일자 (1~28)</label>
						<input
							id="alarm-day"
							type="number"
							class="form__input"
							min="1"
							max="28"
							bind:value={scheduleDay}
						/>
					</div>
				{/if}

				<div class="form__field">
					<label class="form__label" for="alarm-time">발송 시간</label>
					<input id="alarm-time" type="time" class="form__input" bind:value={scheduleTime} />
				</div>

				{#if error}
					<p class="form__error">{error}</p>
				{/if}

				<Button type="submit" fullWidth {loading}>
					{isNew ? '등록하기' : '수정하기'}
				</Button>
			</form>
		{/if}
	</div>
</div>

<style lang="scss">
	.alarm-form {
		&__content {
			padding: calc(var(--header-height) + var(--space-md)) var(--space-md) var(--space-md);
		}

		&__loading {
			display: flex;
			justify-content: center;
			padding: var(--space-2xl);
		}
	}

	.form {
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

		&__textarea {
			width: 100%;
			min-height: 120px;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			font-family: inherit;
			resize: vertical;
			outline: none;
			color: var(--color-text);
			transition: box-shadow var(--transition-fast);

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}

			&::placeholder {
				color: var(--color-text-muted);
			}
		}

		&__input {
			width: 100%;
			padding: 14px 16px;
			border: none;
			background: var(--color-bg);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			font-family: inherit;
			outline: none;
			color: var(--color-text);
			transition: box-shadow var(--transition-fast);

			&:focus {
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__error {
			font-size: var(--font-size-sm);
			color: var(--color-danger);
		}
	}

	.schedule-type-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xs);
	}

	.schedule-type-btn {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		background: var(--color-bg);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
		text-align: center;

		&--active {
			background: var(--color-primary);
			color: var(--color-white);
		}
	}

	.day-group {
		display: flex;
		gap: var(--space-xs);
	}

	.day-btn {
		flex: 1;
		padding: var(--space-sm) 0;
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		background: var(--color-bg);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
		text-align: center;

		&--active {
			background: var(--color-primary);
			color: var(--color-white);
		}
	}
</style>
