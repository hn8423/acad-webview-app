import { describe, it, expect } from 'vitest';
import {
	getPassStatusVariant,
	getPassStatusLabel,
	getPassBadgeVariant,
	getTicketValue,
	getCapacityWeight,
	getReservationWeight,
	isActiveReservationStatus,
	isCapacityOccupyingStatus,
	getPassDisplayName,
	getEffectivePassStatus,
	isExpireTransition,
	isPassUsable
} from './pass';

describe('isExpireTransition', () => {
	it('should return true only when status newly becomes EXPIRED', () => {
		expect(isExpireTransition('ACTIVE', 'EXPIRED')).toBe(true);
		expect(isExpireTransition('HOLDING', 'EXPIRED')).toBe(true);
		expect(isExpireTransition('USED_UP', 'EXPIRED')).toBe(true);
	});

	it('should return false when already EXPIRED or not changing to EXPIRED', () => {
		expect(isExpireTransition('EXPIRED', 'EXPIRED')).toBe(false);
		expect(isExpireTransition('ACTIVE', 'HOLDING')).toBe(false);
		expect(isExpireTransition('EXPIRED', 'ACTIVE')).toBe(false);
	});
});

describe('isPassUsable', () => {
	const TODAY = '2026-07-30';

	function createPass(overrides: Partial<Parameters<typeof isPassUsable>[0]> = {}) {
		return {
			status: 'ACTIVE',
			remaining_lessons: 5,
			start_date: '2026-07-01',
			end_date: '2026-08-31',
			...overrides
		};
	}

	it('should return true for active pass within period', () => {
		expect(isPassUsable(createPass(), TODAY)).toBe(true);
	});

	it('should return true on the expiry date itself (inclusive)', () => {
		expect(isPassUsable(createPass({ end_date: '2026-07-30' }), TODAY)).toBe(true);
	});

	it('should return true on the start date itself (inclusive)', () => {
		expect(isPassUsable(createPass({ start_date: '2026-07-30' }), TODAY)).toBe(true);
	});

	it('should return false when end_date has passed', () => {
		expect(isPassUsable(createPass({ end_date: '2026-07-29' }), TODAY)).toBe(false);
	});

	it('should return false before the pass starts', () => {
		expect(isPassUsable(createPass({ start_date: '2026-07-31' }), TODAY)).toBe(false);
	});

	it('should handle ISO datetime date strings on both sides', () => {
		expect(isPassUsable(createPass({ end_date: '2026-07-29T00:00:00.000Z' }), TODAY)).toBe(false);
		expect(isPassUsable(createPass({ end_date: '2026-07-30T00:00:00.000Z' }), TODAY)).toBe(true);
		expect(isPassUsable(createPass(), '2026-07-30T00:00:00.000Z')).toBe(true);
		expect(isPassUsable(createPass({ end_date: '2026-07-29' }), '2026-07-30T00:00:00.000Z')).toBe(
			false
		);
	});

	it('should evaluate against a future target date (slot date), not just today', () => {
		const pass = createPass({ end_date: '2026-08-31' });
		expect(isPassUsable(pass, '2026-08-31')).toBe(true);
		expect(isPassUsable(pass, '2026-09-01')).toBe(false);
	});

	it('should return false for EXPIRED, HOLDING, and USED_UP statuses', () => {
		expect(isPassUsable(createPass({ status: 'EXPIRED' }), TODAY)).toBe(false);
		expect(isPassUsable(createPass({ status: 'HOLDING' }), TODAY)).toBe(false);
		expect(isPassUsable(createPass({ status: 'USED_UP' }), TODAY)).toBe(false);
	});

	it('should return false when no lessons remain', () => {
		expect(isPassUsable(createPass({ remaining_lessons: 0 }), TODAY)).toBe(false);
	});

	it('should return true when period dates are missing', () => {
		expect(isPassUsable(createPass({ start_date: undefined, end_date: undefined }), TODAY)).toBe(
			true
		);
	});
});

describe('getEffectivePassStatus', () => {
	const TODAY = '2026-07-30';

	it('should keep ACTIVE while within period', () => {
		expect(getEffectivePassStatus({ status: 'ACTIVE', end_date: '2026-07-30' }, TODAY)).toBe(
			'ACTIVE'
		);
	});

	it('should treat date-expired ACTIVE pass as EXPIRED (pre-cron window)', () => {
		expect(getEffectivePassStatus({ status: 'ACTIVE', end_date: '2026-07-29' }, TODAY)).toBe(
			'EXPIRED'
		);
	});

	it('should keep non-ACTIVE statuses as-is', () => {
		expect(getEffectivePassStatus({ status: 'HOLDING', end_date: '2026-07-01' }, TODAY)).toBe(
			'HOLDING'
		);
		expect(getEffectivePassStatus({ status: 'USED_UP', end_date: '2026-07-01' }, TODAY)).toBe(
			'USED_UP'
		);
	});

	it('should keep ACTIVE when end_date is missing', () => {
		expect(getEffectivePassStatus({ status: 'ACTIVE' }, TODAY)).toBe('ACTIVE');
	});
});

describe('getCapacityWeight', () => {
	it('should return 0.5 for ROTATION', () => {
		expect(getCapacityWeight('ROTATION')).toBe(0.5);
	});

	it('should return 1 for FULL', () => {
		expect(getCapacityWeight('FULL')).toBe(1);
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

describe('getCapacityWeight with slotType', () => {
	it('should return 1 for ROTATION on ENSEMBLE slot', () => {
		expect(getCapacityWeight('ROTATION', 'ENSEMBLE')).toBe(1);
	});

	it('should return 1 for FULL on ENSEMBLE slot', () => {
		expect(getCapacityWeight('FULL', 'ENSEMBLE')).toBe(1);
	});

	it('should return 1 for undefined passCategory on ENSEMBLE slot', () => {
		expect(getCapacityWeight(undefined, 'ENSEMBLE')).toBe(1);
	});

	it('should return 0.5 for ROTATION on REGULAR slot', () => {
		expect(getCapacityWeight('ROTATION', 'REGULAR')).toBe(0.5);
	});

	it('should return 1 for FULL on REGULAR slot', () => {
		expect(getCapacityWeight('FULL', 'REGULAR')).toBe(1);
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

describe('isCapacityOccupyingStatus', () => {
	it('should return true for PENDING', () => {
		expect(isCapacityOccupyingStatus('PENDING')).toBe(true);
	});

	it('should return true for CONFIRMED', () => {
		expect(isCapacityOccupyingStatus('CONFIRMED')).toBe(true);
	});

	it('should return true for COMPLETED', () => {
		expect(isCapacityOccupyingStatus('COMPLETED')).toBe(true);
	});

	it('should return false for CANCELLED', () => {
		expect(isCapacityOccupyingStatus('CANCELLED')).toBe(false);
	});

	it('should return false for NO_SHOW', () => {
		expect(isCapacityOccupyingStatus('NO_SHOW')).toBe(false);
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
	it('should return 1.0 for FULL with ticket_value 1', () => {
		expect(getReservationWeight('FULL', 1)).toBe(1);
	});

	it('should return 2.0 for FULL with ticket_value 2', () => {
		expect(getReservationWeight('FULL', 2)).toBe(2);
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

	it('should return 1.0 for FULL with ticket_value 0', () => {
		expect(getReservationWeight('FULL', 0)).toBe(1);
	});

	it('should return 1.0 for FULL with negative ticket_value', () => {
		expect(getReservationWeight('FULL', -1)).toBe(1);
	});
});

describe('getReservationWeight with slotType', () => {
	it('should return 1 for ROTATION ticket_value=1 on ENSEMBLE', () => {
		expect(getReservationWeight('ROTATION', 1, 'ENSEMBLE')).toBe(1);
	});

	it('should return 1 for ROTATION ticket_value=2 on ENSEMBLE', () => {
		expect(getReservationWeight('ROTATION', 2, 'ENSEMBLE')).toBe(1);
	});

	it('should return 1 for FULL ticket_value=3 on ENSEMBLE', () => {
		expect(getReservationWeight('FULL', 3, 'ENSEMBLE')).toBe(1);
	});

	it('should return 1 for undefined values on ENSEMBLE', () => {
		expect(getReservationWeight(undefined, undefined, 'ENSEMBLE')).toBe(1);
	});

	it('should return 0.5 for ROTATION ticket_value=1 on REGULAR', () => {
		expect(getReservationWeight('ROTATION', 1, 'REGULAR')).toBe(0.5);
	});

	it('should return 1 for ROTATION ticket_value=2 on REGULAR', () => {
		expect(getReservationWeight('ROTATION', 2, 'REGULAR')).toBe(1);
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

	it('should return 환불 for HOLDING', () => {
		expect(getPassStatusLabel('HOLDING')).toBe('환불');
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

describe('getPassBadgeVariant', () => {
	it('should return danger when remaining lessons is at threshold (2)', () => {
		expect(getPassBadgeVariant('FULL', 2)).toBe('danger');
	});

	it('should return danger when remaining lessons is 0', () => {
		expect(getPassBadgeVariant('ROTATION', 0)).toBe('danger');
	});

	it('should return category variant when remaining lessons is above threshold', () => {
		expect(getPassBadgeVariant('FULL', 3)).toBe('success');
		expect(getPassBadgeVariant('ROTATION', 3)).toBe('info');
	});

	it('should return neutral for unknown category above threshold', () => {
		expect(getPassBadgeVariant('UNKNOWN', 10)).toBe('neutral');
	});
});

describe('getPassDisplayName', () => {
	it('should return 취미반 for ROTATION', () => {
		expect(getPassDisplayName('로테이션 4회', 'ROTATION')).toBe('취미반');
	});

	it('should return 전문반 for FULL', () => {
		expect(getPassDisplayName('풀 수강권', 'FULL')).toBe('전문반');
	});

	it('should fall back to pass name for unknown category', () => {
		expect(getPassDisplayName('풀 수강권', 'UNKNOWN')).toBe('풀 수강권');
	});

	it('should fall back to pass name when category is missing', () => {
		expect(getPassDisplayName('풀 수강권', undefined)).toBe('풀 수강권');
	});

	it('should return empty string when both are missing', () => {
		expect(getPassDisplayName(undefined, undefined)).toBe('');
	});
});
