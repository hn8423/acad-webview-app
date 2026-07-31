import { describe, it, expect } from 'vitest';
import { canManageSlot } from './slot-permission';

describe('canManageSlot', () => {
	it('REGULAR 슬롯은 항상 관리 가능하다', () => {
		expect(canManageSlot({ slot_type: 'REGULAR', instructor_id: 7 }, 5)).toBe(true);
		expect(canManageSlot({ slot_type: 'REGULAR', instructor_id: null }, null)).toBe(true);
	});

	it('ENSEMBLE 슬롯 - 소유자 미기록(legacy)이면 누구나 관리 가능하다', () => {
		expect(canManageSlot({ slot_type: 'ENSEMBLE', instructor_id: null }, 5)).toBe(true);
		expect(canManageSlot({ slot_type: 'ENSEMBLE', instructor_id: null }, null)).toBe(true);
	});

	it('ENSEMBLE 슬롯 - 수업을 연 강사 본인이면 관리 가능하다', () => {
		expect(canManageSlot({ slot_type: 'ENSEMBLE', instructor_id: 5 }, 5)).toBe(true);
	});

	it('ENSEMBLE 슬롯 - 다른 강사는 관리할 수 없다', () => {
		expect(canManageSlot({ slot_type: 'ENSEMBLE', instructor_id: 5 }, 9)).toBe(false);
	});

	it('ENSEMBLE 슬롯 - 내 강사 id를 알 수 없으면 관리할 수 없다', () => {
		expect(canManageSlot({ slot_type: 'ENSEMBLE', instructor_id: 5 }, null)).toBe(false);
	});
});
