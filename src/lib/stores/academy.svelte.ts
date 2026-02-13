import * as academyApi from '$lib/api/academy';
import { getJson, setJson, removeItem } from '$lib/utils/storage';
import type { Academy, AppConfig, NavItem } from '$lib/types/academy';
import type { MemberRole } from '$lib/types/auth';

const ACADEMY_STORAGE_KEY = 'current_academy';
const APP_CONFIG_STORAGE_KEY = 'app_config';
const MEMBER_ROLE_STORAGE_KEY = 'member_role';

let currentAcademy = $state<Academy | null>(null);
let userAppConfig = $state<AppConfig | null>(null);
let adminAppConfig = $state<AppConfig | null>(null);
let memberRole = $state<MemberRole | null>(null);

export function getAcademyStore() {
	function initialize() {
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
	}

	async function selectAcademy(academyId: number, role: MemberRole): Promise<void> {
		const res = await academyApi.getAcademy(academyId);
		if (res.status && res.data) {
			currentAcademy = res.data;
			setJson(ACADEMY_STORAGE_KEY, res.data);
		}

		memberRole = role;
		setJson(MEMBER_ROLE_STORAGE_KEY, role);

		await loadAppConfig(academyId);
	}

	async function loadAppConfig(academyId: number): Promise<void> {
		const [userRes, adminRes] = await Promise.allSettled([
			academyApi.getAppConfig(academyId, 'USER'),
			academyApi.getAppConfig(academyId, 'ADMIN')
		]);

		if (userRes.status === 'fulfilled' && userRes.value.status) {
			userAppConfig = userRes.value.data;
		}
		if (adminRes.status === 'fulfilled' && adminRes.value.status) {
			adminAppConfig = adminRes.value.data;
		}

		setJson(APP_CONFIG_STORAGE_KEY, {
			user: userAppConfig,
			admin: adminAppConfig
		});
	}

	function getEnabledNavItems(appType: 'USER' | 'ADMIN'): NavItem[] {
		const config = appType === 'USER' ? userAppConfig : adminAppConfig;
		if (!config) return [];
		return config.nav_list.filter((nav) => nav.is_enabled);
	}

	function clear(): void {
		currentAcademy = null;
		userAppConfig = null;
		adminAppConfig = null;
		memberRole = null;
		removeItem(ACADEMY_STORAGE_KEY);
		removeItem(APP_CONFIG_STORAGE_KEY);
		removeItem(MEMBER_ROLE_STORAGE_KEY);
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
		get isAdmin() {
			return memberRole === 'ADMIN';
		},
		initialize,
		selectAcademy,
		loadAppConfig,
		getEnabledNavItems,
		clear
	};
}

export const academyStore = getAcademyStore();
