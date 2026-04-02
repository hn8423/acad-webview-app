import type { DateIndicators, LessonSlot } from '$lib/types/reservation';
import { getTodayString, toLocalDateString } from '$lib/utils/format';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function countSlotDates(
	startDate: string,
	endDate: string,
	daysOfWeek: number[]
): number {
	if (daysOfWeek.length === 0) return 0;
	const start = new Date(startDate);
	const end = new Date(endDate);
	if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

	const daySet = new Set(daysOfWeek);
	let count = 0;
	const current = new Date(start);
	while (current <= end) {
		if (daySet.has(current.getDay())) count++;
		current.setDate(current.getDate() + 1);
	}
	return count;
}

export function formatDayLabels(daysOfWeek: number[]): string {
	const sorted = [...daysOfWeek].sort((a, b) => a - b);
	return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

export function isReservationDay(slotDate: string): boolean {
	return toLocalDateString(slotDate) <= getTodayString();
}

export function hasActionNeeded(slot: LessonSlot, today: string): boolean {
	return slot.reservations.some((rv) => {
		if (rv.status === 'CONFIRMED' && toLocalDateString(slot.slot_date) <= today) return true;
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

export function buildDateIndicators(
	slotsByDate: Map<string, LessonSlot[]>
): Map<string, DateIndicators> {
	const result = new Map<string, DateIndicators>();

	for (const [date, slots] of slotsByDate) {
		let hasConfirmed = false;
		let hasPending = false;
		let hasAvailable = false;

		for (const slot of slots) {
			if (slot.status === 'CANCELLED') continue;

			const hasConfirmedOrCompleted = slot.reservations.some(
				(rv) => rv.status === 'CONFIRMED' || rv.status === 'COMPLETED'
			);
			const hasPendingReservation = slot.reservations.some(
				(rv) => rv.status === 'PENDING'
			);
			const hasActiveReservation = hasConfirmedOrCompleted || hasPendingReservation;

			if (hasConfirmedOrCompleted) hasConfirmed = true;
			if (hasPendingReservation) hasPending = true;
			if (!hasActiveReservation) hasAvailable = true;
		}

		if (hasConfirmed || hasPending || hasAvailable) {
			result.set(date, {
				has_confirmed: hasConfirmed,
				has_pending: hasPending,
				has_available: hasAvailable
			});
		}
	}

	return result;
}
