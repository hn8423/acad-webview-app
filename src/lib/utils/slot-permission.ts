import type { LessonSlot } from '$lib/types/reservation';

type SlotOwnership = Pick<LessonSlot, 'slot_type' | 'instructor_id'>;

// REGULAR 슬롯은 서버가 본인 것만 내려주므로 항상 허용.
// ENSEMBLE 슬롯은 수업을 연 강사만 관리 가능 (소유자 미기록 legacy 슬롯은 허용).
export function canManageSlot(slot: SlotOwnership, ownInstructorId: number | null): boolean {
	if (slot.slot_type !== 'ENSEMBLE') return true;
	if (slot.instructor_id == null) return true;
	return ownInstructorId != null && slot.instructor_id === ownInstructorId;
}
