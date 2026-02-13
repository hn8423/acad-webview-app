import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '$lib/api/client';
import * as authApi from '$lib/api/auth';
import { getJson, setJson, removeItem } from '$lib/utils/storage';
import type { User, UserAcademy } from '$lib/types/auth';

const USER_STORAGE_KEY = 'user';

let user = $state<User | null>(null);
let isAuthenticated = $state(false);
let isLoading = $state(true);
let isInitialized = $state(false);

export function getAuthStore() {
	function initialize() {
		if (isInitialized) return;

		const token = getAccessToken();
		const storedUser = getJson<User>(USER_STORAGE_KEY);

		if (token && storedUser) {
			user = storedUser;
			isAuthenticated = true;
		}
		isLoading = false;
		isInitialized = true;
	}

	async function login(phone: string, password: string): Promise<void> {
		const res = await authApi.login({
			user_phone: phone,
			password: btoa(password),
			device_type: 'ANDROID'
		});

		if (!res.status || !res.data) {
			throw new Error(res.message || '로그인에 실패했습니다.');
		}

		setTokens(res.data.access_token, res.data.refresh_token);

		const meRes = await authApi.getMe();
		if (!meRes.status || !meRes.data) {
			throw new Error('사용자 정보를 불러올 수 없습니다.');
		}

		user = meRes.data;
		setJson(USER_STORAGE_KEY, meRes.data);
		isAuthenticated = true;
	}

	async function signup(
		name: string,
		phone: string,
		password: string,
		birthday?: string,
		gender?: 'MALE' | 'FEMALE'
	): Promise<void> {
		const res = await authApi.signup({
			user_name: name,
			user_phone: phone,
			password: btoa(password),
			user_birthday: birthday,
			user_gender: gender
		});

		if (!res.status || !res.data) {
			throw new Error(res.message || '회원가입에 실패했습니다.');
		}

		setTokens(res.data.access_token, res.data.refresh_token);

		const meRes = await authApi.getMe();
		if (!meRes.status || !meRes.data) {
			throw new Error('사용자 정보를 불러올 수 없습니다.');
		}

		user = meRes.data;
		setJson(USER_STORAGE_KEY, meRes.data);
		isAuthenticated = true;
	}

	async function logout(): Promise<void> {
		const refreshToken = getRefreshToken();
		if (refreshToken) {
			try {
				await authApi.logout(refreshToken);
			} catch {
				// ignore logout API errors
			}
		}
		user = null;
		isAuthenticated = false;
		clearTokens();
		removeItem(USER_STORAGE_KEY);
	}

	async function fetchMyAcademies(): Promise<UserAcademy[]> {
		const res = await authApi.getMyAcademies();
		if (res.status && res.data) {
			return res.data.academies;
		}
		return [];
	}

	return {
		get user() {
			return user;
		},
		get isAuthenticated() {
			return isAuthenticated;
		},
		get isLoading() {
			return isLoading;
		},
		get isInitialized() {
			return isInitialized;
		},
		initialize,
		login,
		signup,
		logout,
		fetchMyAcademies
	};
}

export const authStore = getAuthStore();

if (typeof window !== 'undefined') {
	authStore.initialize();
}
