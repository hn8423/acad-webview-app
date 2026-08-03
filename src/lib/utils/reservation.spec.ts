import { describe, it, expect } from 'vitest';
import {
	buildActiveReservationMap,
	buildDateIndicators,
	buildSlotKey,
	hasVisibleSequence
} from './reservation';
import type { AvailableSlot, LessonSlot, MyReservation } from '$lib/types/reservation';

function makeSlot(overrides: Partial<LessonSlot> = {}): LessonSlot {
	return {
		id: 1,
		slot_type: 'REGULAR',
		instructor_id: null,
		instructor_name: 'Test',
		slot_date: '2026-04-01',
		start_time: '10:00',
		end_time: '11:00',
		max_capacity: 4,
		current_count: 0,
		status: 'OPEN',
		reservations: [],
		...overrides
	};
}

describe('buildDateIndicators', () => {
	it('should return empty map for empty input', () => {
		const result = buildDateIndicators(new Map());
		expect(result.size).toBe(0);
	});

	it('should not add entry for date with empty slots array', () => {
		const slotsByDate = new Map([['2026-04-01', []]]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.has('2026-04-01')).toBe(false);
	});

	it('should mark has_available for OPEN slot with no reservations', () => {
		const slotsByDate = new Map([['2026-04-01', [makeSlot()]]]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.get('2026-04-01')).toEqual({
			has_confirmed: false,
			has_pending: false,
			has_available: true
		});
	});

	it('should mark has_confirmed for slot with CONFIRMED reservation', () => {
		const slotsByDate = new Map([
			[
				'2026-04-01',
				[
					makeSlot({
						reservations: [{ reservation_id: 1, member_name: 'A', status: 'CONFIRMED' }]
					})
				]
			]
		]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.get('2026-04-01')).toEqual({
			has_confirmed: true,
			has_pending: false,
			has_available: false
		});
	});

	it('should mark has_confirmed for slot with COMPLETED reservation', () => {
		const slotsByDate = new Map([
			[
				'2026-04-01',
				[
					makeSlot({
						reservations: [{ reservation_id: 1, member_name: 'A', status: 'COMPLETED' }]
					})
				]
			]
		]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.get('2026-04-01')).toEqual({
			has_confirmed: true,
			has_pending: false,
			has_available: false
		});
	});

	it('should mark has_pending for slot with PENDING reservation', () => {
		const slotsByDate = new Map([
			[
				'2026-04-01',
				[
					makeSlot({
						reservations: [{ reservation_id: 1, member_name: 'A', status: 'PENDING' }]
					})
				]
			]
		]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.get('2026-04-01')).toEqual({
			has_confirmed: false,
			has_pending: true,
			has_available: false
		});
	});

	it('should mark multiple indicators for mixed slots', () => {
		const slotsByDate = new Map([
			[
				'2026-04-01',
				[
					makeSlot({ id: 1, reservations: [] }),
					makeSlot({
						id: 2,
						reservations: [
							{ reservation_id: 1, member_name: 'A', status: 'CONFIRMED' },
							{ reservation_id: 2, member_name: 'B', status: 'PENDING' }
						]
					})
				]
			]
		]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.get('2026-04-01')).toEqual({
			has_confirmed: true,
			has_pending: true,
			has_available: true
		});
	});

	it('should ignore CANCELLED slots', () => {
		const slotsByDate = new Map([
			['2026-04-01', [makeSlot({ status: 'CANCELLED', reservations: [] })]]
		]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.has('2026-04-01')).toBe(false);
	});

	it('should treat slot with only CANCELLED/NO_SHOW reservations as available', () => {
		const slotsByDate = new Map([
			[
				'2026-04-01',
				[
					makeSlot({
						reservations: [
							{ reservation_id: 1, member_name: 'A', status: 'CANCELLED' },
							{ reservation_id: 2, member_name: 'B', status: 'NO_SHOW' }
						]
					})
				]
			]
		]);
		const result = buildDateIndicators(slotsByDate);
		expect(result.get('2026-04-01')).toEqual({
			has_confirmed: false,
			has_pending: false,
			has_available: true
		});
	});
});

function makeAvailableSlot(overrides: Partial<AvailableSlot> = {}): AvailableSlot {
	return {
		slot_id: 1,
		slot_type: 'REGULAR',
		instructor_name: 'Daniel',
		slot_date: '2026-04-01',
		start_time: '16:00',
		end_time: '17:00',
		remaining_capacity: 1,
		...overrides
	};
}

function makeMyReservation(overrides: Partial<MyReservation> = {}): MyReservation {
	return {
		reservation_id: 1,
		slot_type: 'REGULAR',
		instructor_name: 'Daniel',
		slot_date: '2026-04-01',
		start_time: '16:00',
		end_time: '17:00',
		status: 'CONFIRMED',
		created_at: '2026-03-01T00:00:00.000Z',
		...overrides
	};
}

describe('buildSlotKey', () => {
	it('should join date, time range, slot type and instructor name', () => {
		const key = buildSlotKey(makeAvailableSlot());
		expect(key).toBe('2026-04-01|16:00|17:00|REGULAR|Daniel');
	});

	it('should normalize a null instructor name to an empty segment', () => {
		const key = buildSlotKey(makeAvailableSlot({ instructor_name: null }));
		expect(key).toBe('2026-04-01|16:00|17:00|REGULAR|');
	});

	it('should produce the same key for a slot and its matching reservation', () => {
		expect(buildSlotKey(makeAvailableSlot())).toBe(buildSlotKey(makeMyReservation()));
	});

	it('should produce different keys for different slot types at the same time', () => {
		const regular = buildSlotKey(makeAvailableSlot({ slot_type: 'REGULAR' }));
		const ensemble = buildSlotKey(makeAvailableSlot({ slot_type: 'ENSEMBLE' }));
		expect(regular).not.toBe(ensemble);
	});
});

describe('buildActiveReservationMap', () => {
	it('should return an empty map for an empty list', () => {
		expect(buildActiveReservationMap([]).size).toBe(0);
	});

	it('should index PENDING and CONFIRMED reservations by slot key', () => {
		const pending = makeMyReservation({
			reservation_id: 1,
			status: 'PENDING',
			start_time: '15:00',
			end_time: '16:00'
		});
		const confirmed = makeMyReservation({ reservation_id: 2, status: 'CONFIRMED' });
		const result = buildActiveReservationMap([pending, confirmed]);

		expect(result.size).toBe(2);
		expect(result.get('2026-04-01|15:00|16:00|REGULAR|Daniel')).toBe(pending);
		expect(result.get('2026-04-01|16:00|17:00|REGULAR|Daniel')).toBe(confirmed);
	});

	it('should exclude CANCELLED, NO_SHOW and COMPLETED reservations', () => {
		const result = buildActiveReservationMap([
			makeMyReservation({ reservation_id: 1, status: 'CANCELLED' }),
			makeMyReservation({ reservation_id: 2, status: 'NO_SHOW', start_time: '17:00' }),
			makeMyReservation({ reservation_id: 3, status: 'COMPLETED', start_time: '18:00' })
		]);
		expect(result.size).toBe(0);
	});

	it('should keep the first active reservation when keys collide', () => {
		const first = makeMyReservation({ reservation_id: 1 });
		const second = makeMyReservation({ reservation_id: 2 });
		const result = buildActiveReservationMap([first, second]);
		expect(result.get('2026-04-01|16:00|17:00|REGULAR|Daniel')).toBe(first);
	});
});

describe('hasVisibleSequence', () => {
	it('should be true when a sequence exists and the slot holds more than one person', () => {
		const reservation = makeMyReservation({ sequence: 2, slot_total_count: 2 });
		expect(hasVisibleSequence(reservation)).toBe(true);
	});

	it('should be false when the reservation is alone in the slot', () => {
		const reservation = makeMyReservation({ sequence: 1, slot_total_count: 1 });
		expect(hasVisibleSequence(reservation)).toBe(false);
	});

	it('should be false when sequence is null or missing', () => {
		expect(hasVisibleSequence(makeMyReservation({ sequence: null, slot_total_count: 3 }))).toBe(
			false
		);
		expect(hasVisibleSequence(makeMyReservation({ slot_total_count: 3 }))).toBe(false);
	});

	it('should be false when slot_total_count is missing', () => {
		expect(hasVisibleSequence(makeMyReservation({ sequence: 1 }))).toBe(false);
	});

	it('should be false for a null reservation', () => {
		expect(hasVisibleSequence(null)).toBe(false);
	});
});
