import { expect, test, type Page, type Route } from '@playwright/test';

// 백엔드 없이 강사 수업 정리 → 탈퇴 흐름만 검증한다. 원장 세션을 localStorage 로 심고,
// API 는 서버 envelope 형태로 가로채 응답한다.

const ACADEMY_ID = 1;
const INSTRUCTOR_ID = 5;

function ymd(offsetDays: number): string {
	const d = new Date();
	d.setDate(d.getDate() + offsetDays);
	return d.toLocaleDateString('sv-SE');
}

function envelope(data: unknown, message = '') {
	return {
		response: { data: { result_status: 'success', result_data: data, result_message: message } }
	};
}

const emptySlot = {
	slot_id: 1,
	slot_date: ymd(1),
	start_time: '14:00',
	end_time: '15:00',
	slot_type: 'REGULAR',
	status: 'OPEN',
	max_capacity: 1,
	current_count: 0,
	reservations: []
};

const reservedSlot = {
	...emptySlot,
	slot_id: 2,
	start_time: '18:00',
	end_time: '19:00',
	current_count: 1,
	reservations: [{ reservation_id: 20, member_name: '홍길동', status: 'CONFIRMED' }]
};

function upcoming(slots: unknown[]) {
	return {
		instructor: { instructor_id: INSTRUCTOR_ID, instructor_name: 'Effy', is_withdrawn: false },
		slots,
		total: slots.length,
		reserved_count: slots.filter((s) => s === reservedSlot).length
	};
}

async function seedAdminSession(page: Page) {
	await page.addInitScript(
		({ academyId }) => {
			const set = (key: string, value: unknown) =>
				localStorage.setItem(
					`acad_${key}`,
					typeof value === 'string' ? value : JSON.stringify(value)
				);
			set('access_token', 'e2e-token');
			set('refresh_token', 'e2e-refresh');
			set('user', { id: 1, user_name: '원장' });
			set('current_academy', { id: academyId, academy_name: 'E2E 학원' });
			// academyStore 는 역할을 JSON 으로 읽는다
			set('member_role', JSON.stringify('ADMIN'));
			set('member_id', 1);
		},
		{ academyId: ACADEMY_ID }
	);
}

interface Calls {
	deletes: unknown[];
	withdrawn: boolean;
}

// 남은 수업 목록은 삭제 요청이 올 때마다 줄어든다
async function mockApi(page: Page, calls: Calls) {
	let remaining: unknown[] = [emptySlot, reservedSlot];

	await page.route('**/academic/**', async (route: Route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		const fulfill = (data: unknown, message?: string) =>
			route.fulfill({ json: envelope(data, message) });

		if (path.endsWith(`/instructors/${INSTRUCTOR_ID}/upcoming-slots`)) {
			return fulfill(upcoming(remaining));
		}
		if (path.endsWith('/lesson-slots/bulk-delete')) {
			const body = request.postDataJSON() as { slot_ids: number[] };
			calls.deletes.push(body);
			remaining = remaining.filter(
				(s) => !body.slot_ids.includes((s as { slot_id: number }).slot_id)
			);
			return fulfill({
				deleted_slot_count: body.slot_ids.length,
				cancelled_reservation_count: body.slot_ids.includes(2) ? 1 : 0
			});
		}
		if (request.method() === 'DELETE' && path.endsWith(`/instructors/${INSTRUCTOR_ID}`)) {
			calls.withdrawn = true;
			return fulfill(null, '강사가 탈퇴 처리되었습니다.');
		}
		if (path.endsWith('/notifications/unread-count')) return fulfill({ unread_count: 0 });
		return fulfill([]);
	});
}

test('예약 없는 수업을 지우고, 예약 수업은 회원 확인 후 지운 뒤 강사를 탈퇴시킨다', async ({
	page
}) => {
	const calls: Calls = { deletes: [], withdrawn: false };
	await seedAdminSession(page);
	await mockApi(page, calls);

	await page.goto(`/admin/instructors/${INSTRUCTOR_ID}/slots`);
	await expect(page.getByRole('heading', { name: 'Effy' })).toBeVisible();
	await expect(page.getByText('홍길동 예약')).toBeVisible();

	// 1) 예약 없는 수업 일괄 삭제
	await page.getByRole('button', { name: '예약 없는 수업 모두 삭제 (1)' }).click();
	await page.getByRole('button', { name: '삭제', exact: true }).click();
	await expect(page.getByRole('button', { name: /예약 없는 수업 모두 삭제/ })).toBeHidden();

	// 2) 예약 있는 수업은 회원을 확인하고 예약 취소와 함께 삭제
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: '선택한 수업 삭제 (1)' }).click();
	await expect(page.getByText('예약 회원 1명의 예약이 취소되고')).toBeVisible();
	await page.getByLabel('취소 사유 (선택)').fill('강사 퇴사');
	await page.getByRole('button', { name: '예약 취소 후 삭제' }).click();

	// 3) 남은 수업이 없으면 탈퇴
	await expect(page.getByText('정리할 수업이 없습니다.')).toBeVisible();
	await page.getByRole('button', { name: '강사 탈퇴' }).click();
	await page.getByRole('button', { name: '탈퇴', exact: true }).click();

	await expect(page).toHaveURL(/\/admin\/instructors$/);
	expect(calls.deletes).toEqual([
		{ slot_ids: [1] },
		{ slot_ids: [2], confirmed_reservation_ids: [20], cancel_reason: '강사 퇴사' }
	]);
	expect(calls.withdrawn).toBe(true);
});
