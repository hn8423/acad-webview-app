interface ToastItem {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info';
}

let toasts = $state<ToastItem[]>([]);
let nextId = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearDismissTimer() {
	if (dismissTimer !== null) {
		clearTimeout(dismissTimer);
		dismissTimer = null;
	}
}

function scheduleDismiss(id: number, duration: number) {
	clearDismissTimer();
	dismissTimer = setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
		dismissTimer = null;
	}, duration);
}

export function getToastStore() {
	function show(message: string, type: ToastItem['type'] = 'info', duration = 3000) {
		const id = nextId++;
		toasts = [{ id, message, type }];
		scheduleDismiss(id, duration);
	}

	function error(message: string, duration = 3000) {
		show(message, 'error', duration);
	}

	function success(message: string, duration = 3000) {
		show(message, 'success', duration);
	}

	function info(message: string, duration = 3000) {
		show(message, 'info', duration);
	}

	function remove(id: number) {
		clearDismissTimer();
		toasts = toasts.filter((t) => t.id !== id);
	}

	return {
		get items() {
			return toasts;
		},
		show,
		error,
		success,
		info,
		remove
	};
}

export const toastStore = getToastStore();
