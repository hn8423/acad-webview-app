import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InstructorProfileModal from './InstructorProfileModal.svelte';
import { getInstructorDetail } from '$lib/api/member';
import type { Instructor } from '$lib/types/member';

vi.mock('$lib/api/member', () => ({
	getInstructorDetail: vi.fn()
}));

vi.mock('$lib/stores/academy.svelte', () => ({
	academyStore: { academyId: 1 }
}));

const mockedGetInstructorDetail = vi.mocked(getInstructorDetail);

function makeInstructor(overrides: Partial<Instructor> = {}): Instructor {
	return {
		instructor_id: 7,
		member_id: 10,
		user_name: '박다희',
		profile_img: '',
		specialties: '보컬',
		introduction: '안녕하세요, 보컬 강사입니다.',
		is_admin: 0,
		user_phone: '01012345678',
		...overrides
	};
}

function ok<T>(data: T) {
	return { status: true, message: '', data };
}

describe('InstructorProfileModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('열리면 강사 상세를 조회하고 이름/전문분야/소개를 렌더링한다', async () => {
		mockedGetInstructorDetail.mockResolvedValue(ok(makeInstructor()));

		render(InstructorProfileModal, {
			isOpen: true,
			instructor: { id: 7, name: '박다희' },
			onclose: vi.fn()
		});

		expect(mockedGetInstructorDetail).toHaveBeenCalledWith(1, 7);
		await expect.element(page.getByText('박다희 선생님')).toBeInTheDocument();
		await expect.element(page.getByText('보컬', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('안녕하세요, 보컬 강사입니다.')).toBeInTheDocument();
	});

	it('전화번호를 포맷하여 tel: 링크로 표시한다', async () => {
		mockedGetInstructorDetail.mockResolvedValue(ok(makeInstructor()));

		render(InstructorProfileModal, {
			isOpen: true,
			instructor: { id: 7, name: '박다희' },
			onclose: vi.fn()
		});

		const phoneLink = page.getByRole('link', { name: /010-1234-5678/ });
		await expect.element(phoneLink).toBeInTheDocument();
		await expect.element(phoneLink).toHaveAttribute('href', 'tel:01012345678');
	});

	it('전화번호가 없으면 연락처 섹션을 표시하지 않는다', async () => {
		mockedGetInstructorDetail.mockResolvedValue(ok(makeInstructor({ user_phone: '' })));

		render(InstructorProfileModal, {
			isOpen: true,
			instructor: { id: 7, name: '박다희' },
			onclose: vi.fn()
		});

		await expect.element(page.getByText('박다희 선생님')).toBeInTheDocument();
		expect(page.getByText('연락처').query()).toBeNull();
	});

	it('소개가 없으면 빈 상태 문구를 표시한다', async () => {
		mockedGetInstructorDetail.mockResolvedValue(ok(makeInstructor({ introduction: '' })));

		render(InstructorProfileModal, {
			isOpen: true,
			instructor: { id: 7, name: '박다희' },
			onclose: vi.fn()
		});

		await expect.element(page.getByText('소개가 없습니다.')).toBeInTheDocument();
	});

	it('조회 실패 시 에러 메시지를 표시한다', async () => {
		mockedGetInstructorDetail.mockResolvedValue({
			status: false,
			message: '강사를 찾을 수 없습니다',
			data: undefined as unknown as Instructor
		});

		render(InstructorProfileModal, {
			isOpen: true,
			instructor: { id: 7, name: '박다희' },
			onclose: vi.fn()
		});

		await expect.element(page.getByText('강사를 찾을 수 없습니다')).toBeInTheDocument();
	});

	it('instructor가 null이면 조회하지 않는다', async () => {
		render(InstructorProfileModal, {
			isOpen: true,
			instructor: null,
			onclose: vi.fn()
		});

		expect(mockedGetInstructorDetail).not.toHaveBeenCalled();
	});

	it('닫혀 있으면 조회하지 않는다', async () => {
		render(InstructorProfileModal, {
			isOpen: false,
			instructor: { id: 7, name: '박다희' },
			onclose: vi.fn()
		});

		expect(mockedGetInstructorDetail).not.toHaveBeenCalled();
	});
});
