import { describe, it, expect } from 'vitest';
import { buildDateIndicators } from './reservation';
import type { LessonSlot } from '$lib/types/reservation';

function makeSlot(overrides: Partial<LessonSlot> = {}): LessonSlot {
	return {
		id: 1,
		slot_type: 'REGULAR',
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
