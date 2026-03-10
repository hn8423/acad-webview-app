import type { LessonSlot } from '$lib/types/reservation';

export function hasActionNeeded(slot: LessonSlot, today: string): boolean {
	return slot.reservations.some((rv) => {
		if (rv.status === 'CONFIRMED' && slot.slot_date <= today) return true;
		return false;
	});
}

export function filterActionDates(
	slotsByDate: Map<string, LessonSlot[]>,
	today: string
): Set<string> {
	const actionDates = new Set<string>();
	for (const [date, slots] of slotsByDate) {
		if (slots.some((slot) => hasActionNeeded(slot, today))) {
			actionDates.add(date);
		}
	}
	return actionDates;
}
