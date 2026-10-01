import { expect, test, type Page, type Route } from '@playwright/test';

// 백엔드 없이 예약 화면만 검증한다. 로그인·학원 선택 상태는 localStorage 로 심고,
// API 는 서버 envelope({ response: { data: {...} } }) 형태로 가로채 응답한다.

const ACADEMY_ID = 1;

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

const pass = {
	id: 30,
	pass_name: '정규반',
	pass_category: 'FULL',
	ticket_value: 1,
	instructor_id: 7,
	instructor_name: 'Joe',
	start_date: ymd(-10),
	end_date: ymd(90),
	total_lessons: 12,
	remaining_lessons: 10,
	available_lessons: 10,
	pending_count: 0,
	status: 'ACTIVE'
};

const slot = {
	slot_id: 100,
	slot_type: 'REGULAR',
	instructor_name: 'Joe',
	slot_date: ymd(0),
	start_time: '23:00',
	end_time: '23:50',
	remaining_capacity: 1
};

const previewItems = [
	{ slot_id: 100, slot_date: ymd(0), status: 'AVAILABLE' },
	{ slot_id: null, slot_date: ymd(7), status: 'NO_SLOT' },
	{ slot_id: 102, slot_date: ymd(14), status: 'AVAILABLE' },
	{ slot_id: 103, slot_date: ymd(21), status: 'AVAILABLE' }
];

async function seedSession(page: Page) {
	await page.addInitScript(
		({ academyId }) => {
			const set = (key: string, value: unknown) =>
				localStorage.setItem(
					`acad_${key}`,
					typeof value === 'string' ? value : JSON.stringify(value)
				);
			set('access_token', 'e2e-token');
			set('refresh_token', 'e2e-refresh');
			set('user', { id: 1, user_name: '회원' });
			set('current_academy', { id: academyId, academy_name: 'E2E 학원' });
			set('member_role', 'STUDENT');
			set('member_id', 10);
		},
		{ academyId: ACADEMY_ID }
	);
}

async function mockApi(page: Page, onRecurring: (body: unknown) => void) {
	await page.route('**/academic/**', async (route: Route) => {
		const url = new URL(route.request().url());
		const path = url.pathname;
		const fulfill = (data: unknown, message?: string) =>
			route.fulfill({ json: envelope(data, message) });

		if (path.endsWith('/members/me/passes')) return fulfill([pass]);
		if (path.endsWith('/reservations/available')) return fulfill([slot]);
		if (path.endsWith('/reservations/me')) return fulfill([]);
		if (path.endsWith('/lesson-slots/monthly-summary')) return fulfill({});
		if (path.endsWith('/notifications/unread-count')) return fulfill({ unread_count: 0 });
		if (path.endsWith('/reservations/recurring/preview')) {
			return fulfill({
				start_time: slot.start_time,
				end_time: slot.end_time,
				available_count: 3,
				items: previewItems
			});
		}
		if (path.endsWith('/reservations/recurring')) {
			onRecurring(route.request().postDataJSON());
			return fulfill(
				{
					created: [
						{ reservation_id: 1, slot_id: 100, slot_date: ymd(0) },
						{ reservation_id: 2, slot_id: 102, slot_date: ymd(14) }
					],
					skipped: [{ slot_id: 103, slot_date: ymd(21), reason: 'FULL' }]
				},
				'2건 예약 신청 완료'
			);
		}
		return fulfill([]);
	});
}

test('슬롯에서 매주 반복을 켜고 여러 회차를 한 번에 예약한다', async ({ page }) => {
	let recurringBody: unknown = null;
	await seedSession(page);
	await mockApi(page, (body) => {
		recurringBody = body;
	});

	await page.goto('/app/reservation');
	await page.getByRole('button', { name: /Joe 선생님/ }).click();
	await expect(page.getByRole('dialog')).toContainText('예약 확인');

	await page.getByRole('switch', { name: '매주 반복' }).click();

	const dialog = page.getByRole('dialog');
	await expect(dialog.getByText('수업 없음')).toBeVisible();
	await expect(dialog.getByRole('checkbox')).toHaveCount(4);
	await expect(dialog.getByRole('checkbox').nth(1)).toBeDisabled();

	// 마지막 회차를 빼고 예약
	await dialog.getByRole('checkbox').nth(3).uncheck();
	await dialog.getByRole('button', { name: '2회 예약하기' }).click();

	await expect(page.getByText('2건 예약 완료 · 1건 제외')).toBeVisible();
	expect(recurringBody).toEqual({ member_pass_id: 30, slot_ids: [100, 102] });
});
