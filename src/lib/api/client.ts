import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { ApiError } from '$lib/types/api';
import { getItem, setItem, removeItem } from '$lib/utils/storage';

const STORAGE_KEY_ACCESS = 'access_token';
const STORAGE_KEY_REFRESH = 'refresh_token';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export function getAccessToken(): string | null {
	return getItem(STORAGE_KEY_ACCESS);
}

export function getRefreshToken(): string | null {
	return getItem(STORAGE_KEY_REFRESH);
}

export function setTokens(accessToken: string, refreshToken: string): void {
	setItem(STORAGE_KEY_ACCESS, accessToken);
	setItem(STORAGE_KEY_REFRESH, refreshToken);
}

export function clearTokens(): void {
	removeItem(STORAGE_KEY_ACCESS);
	removeItem(STORAGE_KEY_REFRESH);
}

async function refreshAccessToken(): Promise<boolean> {
	const refreshToken = getRefreshToken();
	if (!refreshToken) return false;

	try {
		const res = await fetch(`${PUBLIC_API_BASE_URL}/academic/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refresh_token: refreshToken })
		});

		if (!res.ok) return false;

		const json = await res.json();
		if (json.status && json.data) {
			setTokens(json.data.access_token, json.data.refresh_token);
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

async function handleTokenRefresh(): Promise<boolean> {
	if (isRefreshing && refreshPromise) {
		return refreshPromise;
	}

	isRefreshing = true;
	refreshPromise = refreshAccessToken().finally(() => {
		isRefreshing = false;
		refreshPromise = null;
	});

	return refreshPromise;
}

interface RequestOptions {
	method?: string;
	body?: unknown;
	headers?: Record<string, string>;
	skipAuth?: boolean;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
	const { method = 'GET', body, headers = {}, skipAuth = false } = options;

	const requestHeaders: Record<string, string> = {
		...headers
	};

	if (body && !(body instanceof FormData)) {
		requestHeaders['Content-Type'] = 'application/json';
	}

	if (!skipAuth) {
		const token = getAccessToken();
		if (token) {
			requestHeaders['Authorization'] = `Bearer ${token}`;
		}
	}

	const fetchOptions: RequestInit = {
		method,
		headers: requestHeaders
	};

	if (body) {
		fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
	}

	let res = await fetch(`${PUBLIC_API_BASE_URL}${endpoint}`, fetchOptions);

	if (res.status === 401 && !skipAuth) {
		const refreshed = await handleTokenRefresh();
		if (refreshed) {
			const newToken = getAccessToken();
			if (newToken) {
				requestHeaders['Authorization'] = `Bearer ${newToken}`;
			}
			res = await fetch(`${PUBLIC_API_BASE_URL}${endpoint}`, {
				...fetchOptions,
				headers: requestHeaders
			});
		} else {
			clearTokens();
			if (typeof window !== 'undefined') {
				window.location.href = '/auth/login';
			}
			throw new ApiError(401, '인증이 만료되었습니다. 다시 로그인해주세요.');
		}
	}

	if (!res.ok) {
		let message = '요청에 실패했습니다.';
		try {
			const errorJson = await res.json();
			message = errorJson.response?.data?.result_message || errorJson.message || message;
		} catch {
			// ignore parse error
		}
		throw new ApiError(res.status, message);
	}

	const json = await res.json();

	// 서버 응답 envelope 언래핑: { response: { data: { result_status, result_data, ... } } }
	if (json.response?.data) {
		const inner = json.response.data;
		return {
			status: inner.result_status === 'success',
			message: inner.result_message || json.response.message || '',
			data: inner.result_data
		} as T;
	}

	return json as T;
}

export function get<T>(endpoint: string, skipAuth = false): Promise<T> {
	return apiRequest<T>(endpoint, { skipAuth });
}

export function post<T>(endpoint: string, body?: unknown, skipAuth = false): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'POST', body, skipAuth });
}

export function patch<T>(endpoint: string, body?: unknown): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'PATCH', body });
}

export function del<T>(endpoint: string): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'DELETE' });
}

export function upload<T>(endpoint: string, formData: FormData): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'POST', body: formData });
}
