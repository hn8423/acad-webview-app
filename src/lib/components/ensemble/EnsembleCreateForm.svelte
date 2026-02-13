<script lang="ts">
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { createEnsemble } from '$lib/api/ensemble';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { z } from 'zod';

	interface Props {
		oncreate: () => void;
	}

	let { oncreate }: Props = $props();

	let groupName = $state('');
	let role = $state('');
	let description = $state('');
	let maxMembers = $state('5');
	let practiceDate = $state('');
	let practiceTime = $state('');
	let errors = $state<Record<string, string>>({});
	let submitting = $state(false);

	const schema = z.object({
		group_name: z.string().min(1, '그룹명을 입력해주세요').max(50, '50자 이내로 입력해주세요'),
		role: z.string().min(1, '파트를 입력해주세요').max(20, '20자 이내로 입력해주세요'),
		description: z.string().max(500, '500자 이내로 입력해주세요').optional(),
		max_members: z.number().int().min(2, '최소 2명 이상').max(20, '최대 20명'),
		practice_date: z.string().optional(),
		practice_time: z.string().optional()
	});

	async function handleSubmit() {
		errors = {};
		const academyId = academyStore.academyId;
		if (!academyId) return;

		const parsed = schema.safeParse({
			group_name: groupName.trim(),
			role: role.trim(),
			description: description.trim() || undefined,
			max_members: parseInt(maxMembers) || 5,
			practice_date: practiceDate || undefined,
			practice_time: practiceTime || undefined
		});

		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const field = String(issue.path[0]);
				if (!fieldErrors[field]) {
					fieldErrors[field] = issue.message;
				}
			}
			errors = fieldErrors;
			return;
		}

		submitting = true;
		try {
			const res = await createEnsemble(academyId, parsed.data);
			if (res.status) {
				toastStore.success('합주조가 만들어졌습니다.');
				oncreate();
			}
		} catch {
			// API client handles toast
		} finally {
			submitting = false;
		}
	}
</script>

<form class="create-form" onsubmit={handleSubmit}>
	<Input
		label="그룹명"
		placeholder="예: 밴드 합주 모집"
		bind:value={groupName}
		error={errors.group_name}
		maxlength={50}
	/>
	<Input
		label="내 파트"
		placeholder="예: 기타, 드럼, 보컬"
		bind:value={role}
		error={errors.role}
		maxlength={20}
	/>
	<div class="create-form__field">
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label class="create-form__label">소개 (선택)</label>
		<textarea
			class="create-form__textarea"
			class:create-form__textarea--error={!!errors.description}
			placeholder="합주조를 소개해주세요"
			bind:value={description}
			maxlength={500}
			rows={3}
		></textarea>
		{#if errors.description}
			<span class="create-form__error">{errors.description}</span>
		{/if}
	</div>
	<Input
		label="최대 인원"
		type="number"
		placeholder="5"
		bind:value={maxMembers}
		error={errors.max_members}
	/>
	<Input label="연습 날짜 (선택)" type="date" bind:value={practiceDate} />
	<div class="create-form__field">
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label class="create-form__label">연습 시간 (선택)</label>
		<input class="create-form__time-input" type="time" bind:value={practiceTime} />
	</div>
	<div class="create-form__actions">
		<Button type="submit" fullWidth loading={submitting}>만들기</Button>
	</div>
</form>

<style lang="scss">
	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);

		&__field {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__textarea {
			width: 100%;
			padding: 14px 16px;
			border: none;
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			font-family: inherit;
			color: var(--color-text);
			background-color: var(--color-bg);
			outline: none;
			resize: vertical;
			min-height: 80px;
			transition:
				background-color var(--transition-fast),
				box-shadow var(--transition-fast);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				background-color: var(--color-primary-bg);
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}

			&--error {
				background-color: var(--color-danger-bg);
				box-shadow: 0 0 0 2px var(--color-danger);
			}
		}

		&__time-input {
			width: 100%;
			padding: 14px 16px;
			border: none;
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			background-color: var(--color-bg);
			outline: none;
			transition:
				background-color var(--transition-fast),
				box-shadow var(--transition-fast);

			&:focus {
				background-color: var(--color-primary-bg);
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}
		}

		&__error {
			font-size: var(--font-size-xs);
			color: var(--color-danger);
		}

		&__actions {
			padding-top: var(--space-sm);
		}
	}
</style>
