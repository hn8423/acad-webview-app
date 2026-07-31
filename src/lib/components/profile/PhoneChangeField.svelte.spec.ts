import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PhoneChangeField from './PhoneChangeField.svelte';
import { sendVerification } from '$lib/api/auth';

vi.mock('$lib/api/auth', () => ({
	sendVerification: vi.fn()
}));

vi.mock('$lib/stores/toast.svelte', () => ({
	toastStore: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

const mockedSendVerification = vi.mocked(sendVerification);

describe('PhoneChangeField', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('전화번호 입력과 인증요청 버튼을 렌더링한다', async () => {
		render(PhoneChangeField, { currentPhone: '01012345678', phone: '01012345678' });

		await expect.element(page.getByText('전화번호')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '인증요청' })).toBeInTheDocument();
	});

	it('번호가 현재 번호와 같으면 인증요청 버튼이 비활성화된다', async () => {
		render(PhoneChangeField, { currentPhone: '01012345678', phone: '01012345678' });

		await expect.element(page.getByRole('button', { name: '인증요청' })).toBeDisabled();
	});

	it('번호가 변경되면 인증요청 버튼이 활성화된다', async () => {
		render(PhoneChangeField, { currentPhone: '01012345678', phone: '01098765432' });

		await expect.element(page.getByRole('button', { name: '인증요청' })).toBeEnabled();
	});

	it('잘못된 형식으로 인증요청 시 에러 메시지를 표시하고 API를 호출하지 않는다', async () => {
		render(PhoneChangeField, { currentPhone: '01012345678', phone: '0299999999' });

		await page.getByRole('button', { name: '인증요청' }).click();

		await expect.element(page.getByText('올바른 휴대폰 번호를 입력해주세요')).toBeInTheDocument();
		expect(mockedSendVerification).not.toHaveBeenCalled();
	});

	it('인증요청 성공 시 인증코드 입력과 타이머를 표시한다', async () => {
		mockedSendVerification.mockResolvedValue({
			status: true,
			message: '',
			data: { expires_in: 180 }
		});

		render(PhoneChangeField, { currentPhone: '01012345678', phone: '01098765432' });

		await page.getByRole('button', { name: '인증요청' }).click();

		expect(mockedSendVerification).toHaveBeenCalledWith({ phone: '01098765432' });
		await expect.element(page.getByPlaceholder('인증코드 6자리')).toBeInTheDocument();
		await expect.element(page.getByText('3:00')).toBeInTheDocument();
	});

	it('인증코드 입력란이 없어도 codeError를 표시한다', async () => {
		render(PhoneChangeField, {
			currentPhone: '01012345678',
			phone: '01098765432',
			codeError: '전화번호 변경 시 인증요청이 필요합니다'
		});

		await expect
			.element(page.getByText('전화번호 변경 시 인증요청이 필요합니다'))
			.toBeInTheDocument();
	});

	it('인증요청 실패 시 에러 메시지를 표시한다', async () => {
		mockedSendVerification.mockResolvedValue({
			status: false,
			message: '발송 실패',
			data: { expires_in: 0 }
		});

		render(PhoneChangeField, { currentPhone: '01012345678', phone: '01098765432' });

		await page.getByRole('button', { name: '인증요청' }).click();

		await expect.element(page.getByText('발송 실패')).toBeInTheDocument();
	});
});
