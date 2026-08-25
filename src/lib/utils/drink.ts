// 만료 임박 안내를 띄우기 시작하는 잔여 일수
export const DRINK_EXPIRY_WARNING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// 음료권 판정에 필요한 최소 형태. DrinkTicket 전체를 요구하지 않아 테스트/부분 데이터에 쓰기 쉽다.
export interface DrinkTicketLike {
	expiry_date: string;
	remaining_count: number;
}

// expiry_date는 서버에서 @db.Date(UTC 자정)로 내려와 'YYYY-MM-DDT00:00:00.000Z' 형태다.
// pass.ts의 end_date 처리와 같은 컨벤션으로 날짜부만 문자열 비교한다.
function dateOnly(dateStr: string): string {
	return dateStr.slice(0, 10);
}

// 만료일 당일은 아직 유효하다 (수강권 end_date와 동일 규칙).
export function isDrinkTicketExpired(ticket: DrinkTicketLike, today: string): boolean {
	return dateOnly(ticket.expiry_date) < dateOnly(today);
}

// 실제로 차감할 수 있는 음료권 — 기간이 남아 있고 잔여도 있어야 한다.
export function isDrinkTicketUsable(ticket: DrinkTicketLike, today: string): boolean {
	return !isDrinkTicketExpired(ticket, today) && ticket.remaining_count > 0;
}

export function countUsableDrinks(tickets: DrinkTicketLike[], today: string): number {
	return tickets
		.filter((t) => !isDrinkTicketExpired(t, today))
		.reduce((sum, t) => sum + t.remaining_count, 0);
}

// 만료돼 못 쓰게 된 잔수. 이미 다 쓴(잔여 0) 음료권은 세지 않는다.
export function countExpiredDrinks(tickets: DrinkTicketLike[], today: string): number {
	return tickets
		.filter((t) => isDrinkTicketExpired(t, today))
		.reduce((sum, t) => sum + t.remaining_count, 0);
}

// 사용 가능한 음료권 중 가장 먼저 만료되는 날짜. 없으면 null.
export function getSoonestExpiry(tickets: DrinkTicketLike[], today: string): string | null {
	const usable = tickets.filter((t) => isDrinkTicketUsable(t, today));
	if (usable.length === 0) return null;
	return usable.reduce(
		(soonest, t) => (dateOnly(t.expiry_date) < soonest ? dateOnly(t.expiry_date) : soonest),
		dateOnly(usable[0].expiry_date)
	);
}

// 만료까지 남은 일수. 당일이면 0, 이미 지났으면 음수. 형식이 잘못되면 0.
export function getDaysUntilExpiry(expiryDate: string, today: string): number {
	const expiryMs = Date.parse(`${dateOnly(expiryDate)}T00:00:00.000Z`);
	const todayMs = Date.parse(`${dateOnly(today)}T00:00:00.000Z`);
	if (Number.isNaN(expiryMs) || Number.isNaN(todayMs)) return 0;
	return Math.round((expiryMs - todayMs) / DAY_MS);
}

// 아직 유효하면서 만료가 코앞인지 (D-7 이내).
export function isExpiringSoon(expiryDate: string, today: string): boolean {
	const days = getDaysUntilExpiry(expiryDate, today);
	return days >= 0 && days <= DRINK_EXPIRY_WARNING_DAYS;
}

// 차감할 음료권 고르기 — 만료가 가장 임박한 것부터 써서 소멸을 줄인다.
// 서버 목록은 created_at desc라 그냥 앞에서 고르면 최신 발급분부터 빠진다.
export function pickTicketToUse<T extends DrinkTicketLike>(tickets: T[], today: string): T | null {
	const usable = tickets.filter((t) => isDrinkTicketUsable(t, today));
	if (usable.length === 0) return null;
	return usable.reduce((earliest, t) =>
		dateOnly(t.expiry_date) < dateOnly(earliest.expiry_date) ? t : earliest
	);
}

// 표시용 정렬 — 유효한 것(만료 임박 순)이 먼저, 만료된 것(최근 만료 순)이 뒤로.
export function sortDrinkTickets<T extends DrinkTicketLike>(tickets: T[], today: string): T[] {
	return [...tickets].sort((a, b) => {
		const aExpired = isDrinkTicketExpired(a, today);
		const bExpired = isDrinkTicketExpired(b, today);
		if (aExpired !== bExpired) return aExpired ? 1 : -1;
		const aDate = dateOnly(a.expiry_date);
		const bDate = dateOnly(b.expiry_date);
		if (aDate === bDate) return 0;
		// 만료된 쪽은 최근에 만료된 것부터, 유효한 쪽은 먼저 만료될 것부터
		return aExpired ? (aDate > bDate ? -1 : 1) : aDate < bDate ? -1 : 1;
	});
}

export type DrinkTicketState = 'USABLE' | 'EXPIRING_SOON' | 'USED_UP' | 'EXPIRED';

// 뱃지 표시용 상태. 학생 내역 시트와 관리자 목록이 같은 기준을 쓰도록 한 곳에 모아둔다.
export function getDrinkTicketState(ticket: DrinkTicketLike, today: string): DrinkTicketState {
	if (isDrinkTicketExpired(ticket, today)) return 'EXPIRED';
	if (ticket.remaining_count <= 0) return 'USED_UP';
	if (isExpiringSoon(ticket.expiry_date, today)) return 'EXPIRING_SOON';
	return 'USABLE';
}

export function getDrinkTicketStateVariant(
	state: DrinkTicketState
): 'success' | 'warning' | 'info' | 'neutral' {
	switch (state) {
		case 'USABLE':
			return 'success';
		case 'EXPIRING_SOON':
			return 'warning';
		case 'USED_UP':
			return 'info';
		case 'EXPIRED':
			return 'neutral';
	}
}

export function getDrinkTicketStateLabel(state: DrinkTicketState, daysUntilExpiry: number): string {
	switch (state) {
		case 'USABLE':
			return '사용가능';
		case 'EXPIRING_SOON':
			return daysUntilExpiry === 0 ? '오늘 만료' : `D-${daysUntilExpiry} 만료 임박`;
		case 'USED_UP':
			return '소진';
		case 'EXPIRED':
			return '만료';
	}
}
