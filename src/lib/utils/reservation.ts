import type { LessonSlot } from '$lib/types/reservation';
import { getTodayString } from '$lib/utils/format';

export function isReservationDay(slotDate: string): boolean {
	return slotDate.slice(0, 10) <= getTodayString();
}

export function hasActionNeeded(slot: LessonSlot, today: string): boolean {
	return slot.reservations.some((rv) => {
		if (rv.status === 'CONFIRMED' && slot.slot_date.slice(0, 10) <= today) return true;
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
