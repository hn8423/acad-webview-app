<script lang="ts">
	import { untrack } from 'svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { createEnsemble, updateEnsemble } from '$lib/api/ensemble';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { EnsembleDetail } from '$lib/types/ensemble';
	import { z } from 'zod';

	interface Props {
		oncreate: () => void;
		// 수정 모드일 때 대상 합주조. 없으면 생성 모드.
		editTarget?: EnsembleDetail | null;
	}

	let { oncreate, editTarget = null }: Props = $props();

	let isEditMode = $derived(editTarget !== null);

	// 폼 초기값은 마운트 시점의 editTarget으로 한 번만 채운다.
	// (수정 시트를 여닫을 때마다 이 컴포넌트가 새로 생성되므로 값이 갱신된다)
	const initial = untrack(() => editTarget);

	let groupName = $state(initial?.group_name ?? '');
	let role = $state('');
	let description = $state(initial?.description ?? '');
	let maxMembers = $state(String(initial?.max_members ?? 5));
	let errors = $state<Record<string, string>>({});
	let submitting = $state(false);

	const groupNameField = z
		.string()
		.min(1, '그룹명을 입력해주세요')
		.max(50, '50자 이내로 입력해주세요');
	const descriptionField = z.string().max(500, '500자 이내로 입력해주세요').optional();
	const maxMembersField = z.number().int().min(2, '최소 2명 이상');

	const createSchema = z.object({
		group_name: groupNameField,
		role: z.string().min(1, '파트를 입력해주세요').max(20, '20자 이내로 입력해주세요'),
		description: descriptionField,
		max_members: maxMembersField
	});

	// 백엔드 PATCH는 role(내 파트)을 처리하지 않으므로 수정 모드에서는 제외한다.
	const updateSchema = z.object({
		group_name: groupNameField,
		description: descriptionField,
		max_members: maxMembersField
	});

	function collectFieldErrors(error: z.ZodError): Record<string, string> {
		const fieldErrors: Record<string, string> = {};
		for (const issue of error.issues) {
			const field = String(issue.path[0]);
			if (!fieldErrors[field]) {
				fieldErrors[field] = issue.message;
			}
		}
		return fieldErrors;
	}

	async function handleSubmit() {
		errors = {};
		const academyId = academyStore.academyId;
		if (!academyId) return;

		const parsedMax = Number.parseInt(maxMembers, 10);
		const input = {
			group_name: groupName.trim(),
			role: role.trim(),
			description: description.trim() || undefined,
			max_members: Number.isNaN(parsedMax) ? 5 : parsedMax
		};

		const parsed = isEditMode ? updateSchema.safeParse(input) : createSchema.safeParse(input);

		if (!parsed.success) {
			errors = collectFieldErrors(parsed.error);
			return;
		}

		submitting = true;
		try {
			const res =
				isEditMode && editTarget
					? await updateEnsemble(academyId, editTarget.id, parsed.data)
					: await createEnsemble(academyId, parsed.data as z.infer<typeof createSchema>);
			if (res.status) {
				toastStore.success(isEditMode ? '합주조가 수정되었습니다.' : '합주조가 만들어졌습니다.');
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
	{#if !isEditMode}
		<Input
			label="내 파트"
			placeholder="예: 기타, 드럼, 보컬"
			bind:value={role}
			error={errors.role}
			maxlength={20}
		/>
	{/if}
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
	<div class="create-form__actions">
		<Button type="submit" fullWidth loading={submitting}>
			{isEditMode ? '수정하기' : '만들기'}
		</Button>
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

		&__error {
			font-size: var(--font-size-xs);
			color: var(--color-danger);
		}

		&__actions {
			padding-top: var(--space-sm);
		}
	}
</style>
