<script lang="ts">
	import { formatCurrency } from '$lib/utils/format';
	import { sumLessonGrants } from '$lib/utils/subscription';

	interface Props {
		// 회차별 납부 예정일. 자동 생성된 뒤 관리자가 개별 수정한다.
		dueDates: string[];
		// 서버가 최종 계산하지만, 오타를 눈으로 잡을 수 있도록 미리 보여준다.
		amounts: number[];
		// 회차별 지급 수강 회차. 총 회차가 0이면(장부 전용 분납) 열 자체를 숨긴다.
		lessons?: number[];
		// 총 수강 회차. 합계가 이 값과 맞는지 표에서 바로 보여준다.
		totalLessons?: number;
		// 지급 회차를 이 표에서 수정할 수 있는지. 구독 아이템 관리 화면에서만 켠다.
		editableLessons?: boolean;
		// 구독 아이템 템플릿에는 납부 예정일 개념이 없다 — 그때는 날짜 열을 숨긴다.
		showDueDates?: boolean;
		error?: string;
		disabled?: boolean;
	}

	let {
		dueDates = $bindable([]),
		amounts,
		lessons = $bindable([]),
		totalLessons = 0,
		editableLessons = false,
		showDueDates = true,
		error = '',
		disabled = false
	}: Props = $props();

	function handleDateChange(index: number, value: string) {
		// 불변 갱신 — 배열을 직접 변경하지 않는다
		dueDates = dueDates.map((d, i) => (i === index ? value : d));
	}

	function handleLessonChange(index: number, value: string) {
		const next = Number(value);
		const safe = Number.isFinite(next) && next >= 0 ? Math.floor(next) : 0;
		lessons = lessons.map((l, i) => (i === index ? safe : l));
	}

	let total = $derived(amounts.reduce((sum, a) => sum + a, 0));
	let showLessons = $derived(totalLessons > 0);
	let lessonTotal = $derived(sumLessonGrants(lessons));
	// 합계가 계약 총 회차와 어긋나면 저장 전에 눈으로 잡아야 한다
	let lessonMismatch = $derived(showLessons && lessonTotal !== totalLessons);
</script>

<div
	class="schedule"
	class:schedule--with-lessons={showLessons}
	class:schedule--no-dates={!showDueDates}
>
	<div class="schedule__head">
		<span class="schedule__head-cell schedule__head-cell--seq">회차</span>
		{#if showDueDates}
			<span class="schedule__head-cell">납부 예정일</span>
		{/if}
		<span class="schedule__head-cell schedule__head-cell--amount">금액</span>
		{#if showLessons}
			<span class="schedule__head-cell schedule__head-cell--lessons">지급 회차</span>
		{/if}
	</div>

	{#each amounts as amount, i (i)}
		<div class="schedule__row">
			<span class="schedule__seq">{i + 1}회</span>
			{#if showDueDates}
				<input
					class="schedule__date"
					type="date"
					value={dueDates[i] ?? ''}
					{disabled}
					aria-label="{i + 1}회차 납부 예정일"
					onchange={(e) => handleDateChange(i, (e.currentTarget as HTMLInputElement).value)}
				/>
			{/if}
			<span class="schedule__amount" class:schedule__amount--last={i === amounts.length - 1}>
				{formatCurrency(amount)}
			</span>
			{#if showLessons}
				{#if editableLessons}
					<input
						class="schedule__lessons-input"
						type="number"
						min="0"
						inputmode="numeric"
						value={lessons[i] ?? 0}
						{disabled}
						aria-label="{i + 1}회차 지급 수강 회차"
						oninput={(e) => handleLessonChange(i, (e.currentTarget as HTMLInputElement).value)}
					/>
				{:else}
					<span class="schedule__lessons">+{lessons[i] ?? 0}회</span>
				{/if}
			{/if}
		</div>
	{/each}

	<div class="schedule__total">
		<span>합계</span>
		<div class="schedule__total-values">
			<strong>{formatCurrency(total)}</strong>
			{#if showLessons}
				<strong class="schedule__total-lessons" class:schedule__total-lessons--bad={lessonMismatch}>
					{lessonTotal}회 / {totalLessons}회
				</strong>
			{/if}
		</div>
	</div>

	{#if error}
		<p class="schedule__error">{error}</p>
	{/if}
</div>

<style lang="scss">
	.schedule {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;

		&__head {
			display: grid;
			grid-template-columns: 44px 1fr auto;
			gap: var(--space-sm);
			align-items: center;
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-bottom: 1px solid var(--color-divider);
		}

		&__head-cell {
			font-size: var(--font-size-xs);
			color: var(--color-text-secondary);

			&--amount {
				text-align: right;
			}

			&--lessons {
				text-align: right;
			}
		}

		&__row {
			display: grid;
			grid-template-columns: 44px 1fr auto;
			gap: var(--space-sm);
			align-items: center;
			padding: var(--space-sm) var(--space-md);

			& + & {
				border-top: 1px solid var(--color-divider);
			}
		}

		/* 지급 회차 열이 붙으면 4열이 된다 */
		&--with-lessons &__head,
		&--with-lessons &__row {
			grid-template-columns: 40px 1fr auto 64px;
		}

		/* 날짜 열이 없으면 금액이 남는 공간을 차지한다 */
		&--no-dates &__head,
		&--no-dates &__row {
			grid-template-columns: 44px 1fr;
		}

		&--no-dates#{&}--with-lessons &__head,
		&--no-dates#{&}--with-lessons &__row {
			grid-template-columns: 44px 1fr 72px;
		}

		&__seq {
			font-size: var(--font-size-sm);
			color: var(--color-text-secondary);
		}

		&__date {
			width: 100%;
			min-width: 0;
			padding: 6px 8px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-sm);
			background: var(--color-surface);
			color: var(--color-text);
			font-size: var(--font-size-sm);
			font-family: inherit;

			&:disabled {
				opacity: 0.5;
			}
		}

		&__amount {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			white-space: nowrap;
			text-align: right;

			/* 나머지를 몰아 받는 마지막 회차는 금액이 다르므로 눈에 띄게 */
			&--last {
				color: var(--color-primary);
			}
		}

		&__lessons {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-semibold);
			white-space: nowrap;
			text-align: right;
			color: var(--color-primary);
		}

		&__lessons-input {
			width: 100%;
			min-width: 0;
			padding: 6px 4px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-sm);
			background: var(--color-surface);
			color: var(--color-text);
			font-size: var(--font-size-sm);
			font-family: inherit;
			text-align: right;

			&:disabled {
				opacity: 0.5;
			}
		}

		&__total {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-top: 1px solid var(--color-divider);
			font-size: var(--font-size-sm);
		}

		&__total-values {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
		}

		&__total-lessons {
			color: var(--color-primary);

			/* 합계가 총 회차와 다르면 저장 전에 잡아야 한다 */
			&--bad {
				color: var(--color-danger);
			}
		}

		&__error {
			margin: 0;
			padding: var(--space-sm) var(--space-md);
			background: var(--color-bg);
			border-top: 1px solid var(--color-divider);
			color: var(--color-danger);
			font-size: var(--font-size-xs);
		}
	}
</style>
