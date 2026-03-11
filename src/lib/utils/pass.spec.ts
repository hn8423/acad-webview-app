import { describe, it, expect } from 'vitest';
import {
	getPassStatusVariant,
	getPassStatusLabel,
	getTicketValue,
	getCapacityWeight,
	getReservationWeight,
	isActiveReservationStatus
} from './pass';

describe('getCapacityWeight', () => {
	it('should return 0.5 for ROTATION', () => {
		expect(getCapacityWeight('ROTATION')).toBe(0.5);
	});

	it('should return 2 for FULL', () => {
		expect(getCapacityWeight('FULL')).toBe(2);
	});

	it('should return 1 for ENSEMBLE', () => {
		expect(getCapacityWeight('ENSEMBLE')).toBe(1);
	});

	it('should return 1 for PT', () => {
		expect(getCapacityWeight('PT')).toBe(1);
	});

	it('should return 1 for GROUP', () => {
		expect(getCapacityWeight('GROUP')).toBe(1);
	});

	it('should return 1 for undefined', () => {
		expect(getCapacityWeight(undefined)).toBe(1);
	});

	it('should return 1 for unknown category', () => {
		expect(getCapacityWeight('UNKNOWN')).toBe(1);
	});
});

describe('isActiveReservationStatus', () => {
	it('should return true for PENDING', () => {
		expect(isActiveReservationStatus('PENDING')).toBe(true);
	});

	it('should return true for CONFIRMED', () => {
		expect(isActiveReservationStatus('CONFIRMED')).toBe(true);
	});

	it('should return false for COMPLETED', () => {
		expect(isActiveReservationStatus('COMPLETED')).toBe(false);
	});

	it('should return false for CANCELLED', () => {
		expect(isActiveReservationStatus('CANCELLED')).toBe(false);
	});

	it('should return false for NO_SHOW', () => {
		expect(isActiveReservationStatus('NO_SHOW')).toBe(false);
	});
});

describe('getTicketValue', () => {
	it('should return value when positive', () => {
		expect(getTicketValue(3)).toBe(3);
	});

	it('should return 1 when undefined', () => {
		expect(getTicketValue(undefined)).toBe(1);
	});

	it('should return 1 when zero', () => {
		expect(getTicketValue(0)).toBe(1);
	});

	it('should return 1 when negative', () => {
		expect(getTicketValue(-1)).toBe(1);
	});
});

describe('getReservationWeight', () => {
	it('should return 2.0 for FULL with ticket_value 1', () => {
		expect(getReservationWeight('FULL', 1)).toBe(2);
	});

	it('should return 4.0 for FULL with ticket_value 2', () => {
		expect(getReservationWeight('FULL', 2)).toBe(4);
	});

	it('should return 0.5 for ROTATION with ticket_value 1', () => {
		expect(getReservationWeight('ROTATION', 1)).toBe(0.5);
	});

	it('should return 1.0 for ROTATION with ticket_value 2', () => {
		expect(getReservationWeight('ROTATION', 2)).toBe(1);
	});

	it('should return 1.5 for ROTATION with ticket_value 3', () => {
		expect(getReservationWeight('ROTATION', 3)).toBe(1.5);
	});

	it('should return 1.0 for undefined values', () => {
		expect(getReservationWeight(undefined, undefined)).toBe(1);
	});

	it('should return 2.0 for FULL with ticket_value 0', () => {
		expect(getReservationWeight('FULL', 0)).toBe(2);
	});

	it('should return 2.0 for FULL with negative ticket_value', () => {
		expect(getReservationWeight('FULL', -1)).toBe(2);
	});
});

describe('getPassStatusVariant', () => {
	it('should return success for ACTIVE', () => {
		expect(getPassStatusVariant('ACTIVE')).toBe('success');
	});

	it('should return warning for HOLDING', () => {
		expect(getPassStatusVariant('HOLDING')).toBe('warning');
	});

	it('should return info for USED_UP', () => {
		expect(getPassStatusVariant('USED_UP')).toBe('info');
	});

	it('should return neutral for EXPIRED', () => {
		expect(getPassStatusVariant('EXPIRED')).toBe('neutral');
	});

	it('should return neutral for unknown', () => {
		expect(getPassStatusVariant('UNKNOWN')).toBe('neutral');
	});
});

describe('getPassStatusLabel', () => {
	it('should return 이용중 for ACTIVE', () => {
		expect(getPassStatusLabel('ACTIVE')).toBe('이용중');
	});

	it('should return 홀딩 for HOLDING', () => {
		expect(getPassStatusLabel('HOLDING')).toBe('홀딩');
	});

	it('should return 소진 for USED_UP', () => {
		expect(getPassStatusLabel('USED_UP')).toBe('소진');
	});

	it('should return 만료 for EXPIRED', () => {
		expect(getPassStatusLabel('EXPIRED')).toBe('만료');
	});

	it('should return raw status for unknown', () => {
		expect(getPassStatusLabel('UNKNOWN')).toBe('UNKNOWN');
	});
});
