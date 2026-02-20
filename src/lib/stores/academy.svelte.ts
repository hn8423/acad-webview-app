import * as academyApi from '$lib/api/academy';
import { getMyMembership } from '$lib/api/member';
import { getJson, setJson, removeItem } from '$lib/utils/storage';
import type { Academy, AppConfig, NavItem } from '$lib/types/academy';
import type { MemberRole } from '$lib/types/auth';

const ACADEMY_STORAGE_KEY = 'current_academy';
const APP_CONFIG_STORAGE_KEY = 'app_config';
const MEMBER_ROLE_STORAGE_KEY = 'member_role';
const MEMBER_ID_STORAGE_KEY = 'member_id';

let currentAcademy = $state<Academy | null>(null);
let userAppConfig = $state<AppConfig | null>(null);
let adminAppConfig = $state<AppConfig | null>(null);
let memberRole = $state<MemberRole | null>(null);
let currentMemberId = $state<number | null>(null);
let isInitialized = $state(false);

export function getAcademyStore() {
	function initialize() {
		if (isInitialized) return;

		const storedAcademy = getJson<Academy>(ACADEMY_STORAGE_KEY);
		const storedConfig = getJson<{ user: AppConfig | null; admin: AppConfig | null }>(
			APP_CONFIG_STORAGE_KEY
		);

		if (storedAcademy) {
			currentAcademy = storedAcademy;
		}
		if (storedConfig) {
			userAppConfig = storedConfig.user;
			adminAppConfig = storedConfig.admin;
		}

		const storedRole = getJson<string>(MEMBER_ROLE_STORAGE_KEY);
		if (storedRole === 'STUDENT' || storedRole === 'INSTRUCTOR' || storedRole === 'ADMIN') {
			memberRole = storedRole;
		}

		const storedMemberId = getJson<number>(MEMBER_ID_STORAGE_KEY);
		if (storedMemberId) {
			currentMemberId = storedMemberId;
		}

		isInitialized = true;
	}

	async function selectAcademy(
		academyId: number,
		role: MemberRole,
		memberId?: number
	): Promise<void> {
		const res = await academyApi.getAcademy(academyId);
		if (res.status && res.data) {
			currentAcademy = res.data;
			setJson(ACADEMY_STORAGE_KEY, res.data);
		}

		memberRole = role;
		setJson(MEMBER_ROLE_STORAGE_KEY, role);

		if (memberId) {
			currentMemberId = memberId;
			setJson(MEMBER_ID_STORAGE_KEY, memberId);
		} else {
			try {
				const memberRes = await getMyMembership(academyId);
				if (memberRes.status && memberRes.data) {
					currentMemberId = memberRes.data.id;
					setJson(MEMBER_ID_STORAGE_KEY, memberRes.data.id);
				}
			} catch {
				// membership fetch failed, continue without memberId
			}
		}

		await loadAppConfig(academyId, role);
	}

	async function loadAppConfig(academyId: number, role: MemberRole): Promise<void> {
		if (role === 'STUDENT') {
			try {
				const res = await academyApi.getAppConfig(academyId, 'USER');
				if (res.status) {
					userAppConfig = res.data;
				}
			} catch {
				// USER config 로드 실패, 빈 상태 유지
			}
			adminAppConfig = null;
		} else {
			try {
				const res = await academyApi.getAppConfig(academyId, 'ADMIN');
				if (res.status) {
					adminAppConfig = res.data;
				}
			} catch {
				// ADMIN config 로드 실패, 빈 상태 유지
			}
			userAppConfig = null;
		}

		setJson(APP_CONFIG_STORAGE_KEY, {
			user: userAppConfig,
			admin: adminAppConfig
		});
	}

	function getEnabledNavItems(appType: 'USER' | 'ADMIN'): NavItem[] {
		const config = appType === 'USER' ? userAppConfig : adminAppConfig;
		if (!config) return [];
		return config.nav_list.filter((item) => item.is_enabled);
	}

	function clear(): void {
		currentAcademy = null;
		userAppConfig = null;
		adminAppConfig = null;
		memberRole = null;
		currentMemberId = null;
		removeItem(ACADEMY_STORAGE_KEY);
		removeItem(APP_CONFIG_STORAGE_KEY);
		removeItem(MEMBER_ROLE_STORAGE_KEY);
		removeItem(MEMBER_ID_STORAGE_KEY);
	}

	return {
		get academy() {
			return currentAcademy;
		},
		get academyId() {
			return currentAcademy?.id ?? null;
		},
		get userAppConfig() {
			return userAppConfig;
		},
		get adminAppConfig() {
			return adminAppConfig;
		},
		get memberRole() {
			return memberRole;
		},
		get memberId() {
			return currentMemberId;
		},
		get isAdmin() {
			return memberRole === 'ADMIN';
		},
		get isInitialized() {
			return isInitialized;
		},
		initialize,
		selectAcademy,
		loadAppConfig,
		getEnabledNavItems,
		clear
	};
}

export const academyStore = getAcademyStore();

if (typeof window !== 'undefined') {
	academyStore.initialize();
}
