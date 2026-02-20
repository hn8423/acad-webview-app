const PREFIX = 'acad_';

function getKey(key: string): string {
	return `${PREFIX}${key}`;
}

export function getItem(key: string): string | null {
	if (typeof window === 'undefined') return null;
	try {
		return localStorage.getItem(getKey(key));
	} catch {
		return null;
	}
}

export function setItem(key: string, value: string): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(getKey(key), value);
	} catch {
		// storage full or unavailable
	}
}

export function removeItem(key: string): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(getKey(key));
	} catch {
		// storage unavailable
	}
}

export function getJson<T>(key: string): T | null {
	const raw = getItem(key);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export function setJson<T>(key: string, value: T): void {
	setItem(key, JSON.stringify(value));
}
