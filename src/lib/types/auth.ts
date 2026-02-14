export interface User {
	id: number;
	user_name: string;
	user_phone: string;
	user_birthday: string | null;
	user_gender: string;
	profile_img: string;
	created_at: string;
}

export interface AuthTokens {
	access_token: string;
	refresh_token: string;
}

export interface LoginRequest {
	user_phone: string;
	password: string;
	device_type: 'IOS' | 'ANDROID';
}

export interface LoginResponse extends AuthTokens {
	user: Pick<User, 'id' | 'user_name' | 'user_phone' | 'profile_img'>;
}

export interface SignupRequest {
	user_name: string;
	user_phone: string;
	password: string;
	user_birthday?: string;
	user_gender?: 'MALE' | 'FEMALE';
}

export interface SignupResponse extends AuthTokens {
	user: Pick<User, 'id' | 'user_name' | 'user_phone'>;
}

export interface SendVerificationRequest {
	phone: string;
}

export interface VerifyCodeRequest {
	phone: string;
	code: string;
}

export type MemberRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface UserAcademy {
	academy_id: number;
	academy_name: string;
	academy_logo_img: string;
	member_role: MemberRole;
	member_id: number;
	joined_at: string;
}
