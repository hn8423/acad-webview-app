import { describe, it, expect } from 'vitest';
import {
	DRINK_EXPIRY_WARNING_DAYS,
	isDrinkTicketExpired,
	isDrinkTicketUsable,
	countUsableDrinks,
	countExpiredDrinks,
	getSoonestExpiry,
	getDaysUntilExpiry,
	isExpiringSoon,
	pickTicketToUse,
	sortDrinkTickets,
	getDrinkTicketState,
	getDrinkTicketStateVariant,
	getDrinkTicketStateLabel
} from './drink';

const TODAY = '2026-08-25';

// 서버는 expiry_date를 @db.Date(UTC 자정)로 내려준다 — 실제 응답 형태로 테스트한다.
function ticket(expiry: string, remaining: number, total = remaining) {
	return {
		id: Number(expiry.replace(/-/g, '')) + remaining,
		expiry_date: `${expiry}T00:00:00.000Z`,
		remaining_count: remaining,
		total_count: total
	};
}

describe('isDrinkTicketExpired', () => {
	it('should treat the expiry date itself as still valid', () => {
		expect(isDrinkTicketExpired(ticket(TODAY, 3), TODAY)).toBe(false);
	});

	it('should return true only after the expiry date has passed', () => {
		expect(isDrinkTicketExpired(ticket('2026-08-24', 3), TODAY)).toBe(true);
		expect(isDrinkTicketExpired(ticket('2026-08-26', 3), TODAY)).toBe(false);
	});

	it('should ignore the time part of both dates', () => {
		expect(isDrinkTicketExpired(ticket(TODAY, 3), `${TODAY}T23:59:59.000Z`)).toBe(false);
	});
});

describe('isDrinkTicketUsable', () => {
	it('should require both remaining count and a valid period', () => {
		expect(isDrinkTicketUsable(ticket('2026-09-25', 1), TODAY)).toBe(true);
		expect(isDrinkTicketUsable(ticket('2026-09-25', 0), TODAY)).toBe(false);
		expect(isDrinkTicketUsable(ticket('2026-08-24', 5), TODAY)).toBe(false);
	});
});

describe('countUsableDrinks / countExpiredDrinks', () => {
	const tickets = [ticket('2026-09-25', 10), ticket('2026-08-24', 1), ticket('2026-06-30', 0, 5)];

	it('should sum only non-expired remaining counts', () => {
		expect(countUsableDrinks(tickets, TODAY)).toBe(10);
	});

	it('should sum expired remaining counts separately', () => {
		expect(countExpiredDrinks(tickets, TODAY)).toBe(1);
	});

	it('should return 0 for an empty list', () => {
		expect(countUsableDrinks([], TODAY)).toBe(0);
		expect(countExpiredDrinks([], TODAY)).toBe(0);
	});

	it('should count a ticket expiring today as usable', () => {
		expect(countUsableDrinks([ticket(TODAY, 4)], TODAY)).toBe(4);
		expect(countExpiredDrinks([ticket(TODAY, 4)], TODAY)).toBe(0);
	});
});

describe('getSoonestExpiry', () => {
	it('should return the earliest expiry among usable tickets', () => {
		const tickets = [ticket('2026-12-01', 2), ticket('2026-09-25', 3), ticket('2026-08-24', 9)];
		expect(getSoonestExpiry(tickets, TODAY)).toBe('2026-09-25');
	});

	it('should skip tickets with no remaining count', () => {
		const tickets = [ticket('2026-09-01', 0), ticket('2026-11-30', 2)];
		expect(getSoonestExpiry(tickets, TODAY)).toBe('2026-11-30');
	});

	it('should return null when nothing is usable', () => {
		expect(getSoonestExpiry([], TODAY)).toBeNull();
		expect(getSoonestExpiry([ticket('2026-08-24', 5)], TODAY)).toBeNull();
	});
});

describe('getDaysUntilExpiry', () => {
	it('should return 0 on the expiry date', () => {
		expect(getDaysUntilExpiry(`${TODAY}T00:00:00.000Z`, TODAY)).toBe(0);
	});

	it('should count remaining days for a future expiry', () => {
		expect(getDaysUntilExpiry('2026-09-01T00:00:00.000Z', TODAY)).toBe(7);
	});

	it('should return a negative number for a past expiry', () => {
		expect(getDaysUntilExpiry('2026-08-20T00:00:00.000Z', TODAY)).toBe(-5);
	});

	it('should return 0 for an unparseable date', () => {
		expect(getDaysUntilExpiry('not-a-date', TODAY)).toBe(0);
	});
});

describe('isExpiringSoon', () => {
	it('should include both ends of the warning window', () => {
		expect(isExpiringSoon(`${TODAY}T00:00:00.000Z`, TODAY)).toBe(true);
		expect(isExpiringSoon('2026-09-01T00:00:00.000Z', TODAY)).toBe(true);
	});

	it('should exclude dates beyond the warning window', () => {
		expect(DRINK_EXPIRY_WARNING_DAYS).toBe(7);
		expect(isExpiringSoon('2026-09-02T00:00:00.000Z', TODAY)).toBe(false);
	});

	it('should exclude already expired dates', () => {
		expect(isExpiringSoon('2026-08-24T00:00:00.000Z', TODAY)).toBe(false);
	});
});

describe('pickTicketToUse', () => {
	it('should pick the soonest-expiring usable ticket, not the newest', () => {
		// 서버는 created_at desc로 내려주므로 최신 발급분이 앞에 온다
		const tickets = [ticket('2026-12-31', 10), ticket('2026-09-25', 2)];
		expect(pickTicketToUse(tickets, TODAY)?.expiry_date).toBe('2026-09-25T00:00:00.000Z');
	});

	it('should skip expired and used-up tickets', () => {
		const tickets = [ticket('2026-08-01', 5), ticket('2026-09-01', 0), ticket('2026-10-01', 3)];
		expect(pickTicketToUse(tickets, TODAY)?.expiry_date).toBe('2026-10-01T00:00:00.000Z');
	});

	it('should return null when nothing is usable', () => {
		expect(pickTicketToUse([], TODAY)).toBeNull();
		expect(pickTicketToUse([ticket('2026-08-01', 5)], TODAY)).toBeNull();
	});
});

describe('sortDrinkTickets', () => {
	it('should list valid tickets by soonest expiry, then expired by most recent', () => {
		const tickets = [
			ticket('2026-06-30', 1),
			ticket('2026-12-01', 2),
			ticket('2026-08-24', 3),
			ticket('2026-09-25', 4)
		];
		expect(sortDrinkTickets(tickets, TODAY).map((t) => t.expiry_date.slice(0, 10))).toEqual([
			'2026-09-25',
			'2026-12-01',
			'2026-08-24',
			'2026-06-30'
		]);
	});

	it('should not mutate the input array', () => {
		const tickets = [ticket('2026-12-01', 2), ticket('2026-09-25', 4)];
		const snapshot = tickets.map((t) => t.expiry_date);
		sortDrinkTickets(tickets, TODAY);
		expect(tickets.map((t) => t.expiry_date)).toEqual(snapshot);
	});
});

describe('getDrinkTicketState', () => {
	it('should classify expired before anything else', () => {
		expect(getDrinkTicketState(ticket('2026-08-24', 0), TODAY)).toBe('EXPIRED');
		expect(getDrinkTicketState(ticket('2026-08-24', 3), TODAY)).toBe('EXPIRED');
	});

	it('should classify a valid ticket with no remaining count as used up', () => {
		expect(getDrinkTicketState(ticket('2026-09-25', 0), TODAY)).toBe('USED_UP');
	});

	it('should classify a ticket inside the warning window as expiring soon', () => {
		expect(getDrinkTicketState(ticket('2026-09-01', 3), TODAY)).toBe('EXPIRING_SOON');
	});

	it('should classify a comfortably valid ticket as usable', () => {
		expect(getDrinkTicketState(ticket('2026-09-02', 3), TODAY)).toBe('USABLE');
	});
});

describe('getDrinkTicketStateVariant / getDrinkTicketStateLabel', () => {
	it('should map each state to a badge variant', () => {
		expect(getDrinkTicketStateVariant('USABLE')).toBe('success');
		expect(getDrinkTicketStateVariant('EXPIRING_SOON')).toBe('warning');
		expect(getDrinkTicketStateVariant('USED_UP')).toBe('info');
		expect(getDrinkTicketStateVariant('EXPIRED')).toBe('neutral');
	});

	it('should show the remaining days for an expiring ticket', () => {
		expect(getDrinkTicketStateLabel('EXPIRING_SOON', 3)).toBe('D-3 만료 임박');
		expect(getDrinkTicketStateLabel('EXPIRING_SOON', 0)).toBe('오늘 만료');
	});

	it('should label the other states', () => {
		expect(getDrinkTicketStateLabel('USABLE', 30)).toBe('사용가능');
		expect(getDrinkTicketStateLabel('USED_UP', 30)).toBe('소진');
		expect(getDrinkTicketStateLabel('EXPIRED', -5)).toBe('만료');
	});
});
