<script lang="ts">
	interface Props {
		type?: 'text' | 'password' | 'email' | 'tel' | 'number' | 'date';
		label?: string;
		placeholder?: string;
		value?: string;
		error?: string;
		disabled?: boolean;
		maxlength?: number;
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
		oninput,
		onchange
	}: Props = $props();
</script>

<div class="input-group" class:input-group--error={!!error}>
	{#if label}
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label class="input-group__label">{label}</label>
	{/if}
	<input
		class="input-group__input"
		{type}
		{placeholder}
		bind:value
		{disabled}
		{maxlength}
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
		gap: var(--space-xs);

		&__label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}

		&__input {
			width: 100%;
			padding: 12px 16px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			font-size: var(--font-size-base);
			color: var(--color-text);
			background-color: var(--color-white);
			outline: none;
			transition: border-color var(--transition-fast);

			&::placeholder {
				color: var(--color-text-muted);
			}

			&:focus {
				border-color: var(--color-primary);
			}

			&:disabled {
				background-color: var(--color-bg);
				opacity: 0.7;
			}
		}

		&__error {
			font-size: var(--font-size-xs);
			color: var(--color-danger);
		}

		&--error .input-group__input {
			border-color: var(--color-danger);
		}
	}
</style>
