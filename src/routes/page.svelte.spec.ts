import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('/+page.svelte', () => {
	it('리다이렉트 전 로딩 화면을 렌더링한다', async () => {
		render(Page);

		const loadingText = page.getByText('로딩 중...');
		await expect.element(loadingText).toBeInTheDocument();
	});
});
