import { get, post, patch } from './client';
import type { ApiResponse } from '$lib/types/api';
import type {
	User,
	LoginRequest,
	LoginResponse,
	SignupRequest,
	SignupResponse,
	SendVerificationRequest,
	VerifyCodeRequest,
	UserAcademy
} from '$lib/types/auth';

export function sendVerification(data: SendVerificationRequest) {
	return post<ApiResponse<{ expires_in: number }>>(
		'/academic/auth/send-verification',
		data,
		true
	);
}

export function verifyCode(data: VerifyCodeRequest) {
	return post<ApiResponse<{ is_verified: boolean }>>('/academic/auth/verify-code', data, true);
}

export function signup(data: SignupRequest) {
	return post<ApiResponse<SignupResponse>>('/academic/auth/signup', data, true);
}

export function login(data: LoginRequest) {
	return post<ApiResponse<LoginResponse>>('/academic/auth/login', data, true);
}

export function refresh(refreshToken: string) {
	return post<ApiResponse<{ access_token: string; refresh_token: string }>>(
		'/academic/auth/refresh',
		{ refresh_token: refreshToken },
		true
	);
}

export function logout(refreshToken: string) {
	return post<ApiResponse<null>>('/academic/auth/logout', { refresh_token: refreshToken });
}

export function getMe() {
	return get<ApiResponse<User>>('/academic/auth/me');
}

export function updateMe(data: Partial<Pick<User, 'user_name' | 'user_birthday' | 'user_gender' | 'profile_img'>>) {
	return patch<ApiResponse<User>>('/academic/auth/me', data);
}

export function getMyAcademies() {
	return get<ApiResponse<UserAcademy[]>>('/academic/auth/me/academies');
}
