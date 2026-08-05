<script lang="ts">
	interface Props {
		type?: 'text' | 'password' | 'email' | 'tel' | 'number' | 'date';
		label?: string;
		placeholder?: string;
		value?: string;
		error?: string;
		disabled?: boolean;
		maxlength?: number;
		// date/number 입력의 허용 범위 (예: 홀딩 시작일 하한)
		min?: string;
		max?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	}

	let {
		type = 'text',
		label = '',
		placeholder = '',
		value = $bindable(''),
		error = '',
		disabled = false,
		maxlength,
		min,
		max,
		oninput,
		onchange
	}: Props = $props();

	// label과 input을 연결해 스크린리더/자동완성이 동작하게 한다
	const inputId = $props.id();
</script>

<div class="input-group" class:input-group--error={!!error}>
	{#if label}
		<label class="input-group__label" for={inputId}>{label}</label>
	{/if}
	<input
		id={inputId}
		class="input-group__input"
		{type}
		{placeholder}
		bind:value
		{disabled}
		{maxlength}
		{min}
		{max}
		{oninput}
		{onchange}
	/>
	{#if error}
		<span class="input-group__error">{error}</span>
	{/if}
</div>

<style lang="scss">
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 6px;

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}

		&__input {
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

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				background-color: var(--color-primary-bg);
				box-shadow: 0 0 0 2px var(--color-primary-light);
			}

			&:disabled {
				background-color: var(--color-divider);
				color: var(--color-text-disabled);
				opacity: 0.7;
			}
		}

		&__error {
			font-size: var(--font-size-xs);
			color: var(--color-danger);
		}

		&--error .input-group__input {
			background-color: var(--color-danger-bg);
			box-shadow: 0 0 0 2px var(--color-danger);
		}
	}
</style>
