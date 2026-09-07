import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NativeToWebMessage } from '$lib/native/bridge';

const registerPushToken = vi.fn();
const deletePushToken = vi.fn();

vi.mock('$lib/api/notification', () => ({
	registerPushToken: (...args: unknown[]) => registerPushToken(...args),
	deletePushToken: (...args: unknown[]) => deletePushToken(...args)
}));

type Handler = (message: NativeToWebMessage) => void;

let post: ReturnType<typeof vi.fn>;
let emit: (message: NativeToWebMessage) => void;

type FakeWindow = EventTarget & { __ACAD_NATIVE__?: unknown };

/** 앱이 심어 주는 브릿지를 만든다. post/emit 도 이 브릿지에 맞춰 갈아 끼운다. */
function makeBridge() {
	post = vi.fn();
	let handler: Handler | null = null;
	emit = (message) => handler?.(message);

	return {
		version: 1,
		post,
		receive: emit,
		setHandler: (next: Handler) => {
			handler = next;
		},
		clearHandler: () => {
			handler = null;
		}
	};
}

/**
 * 가짜 window 를 세운다. withBridge 가 false 면 일반 브라우저 상황.
 * 브릿지 준비 이벤트를 쓰기 때문에 window 는 EventTarget 이어야 한다.
 */
function stubWindow({ withBridge }: { withBridge: boolean }) {
	const fakeWindow = new EventTarget() as FakeWindow;
	if (withBridge) fakeWindow.__ACAD_NATIVE__ = makeBridge();

	vi.stubGlobal('window', fakeWindow);
}

/** 이미 세워 둔 window 에 앱이 뒤늦게 브릿지를 심는 상황. */
function attachBridgeLate() {
	(window as unknown as FakeWindow).__ACAD_NATIVE__ = makeBridge();
	window.dispatchEvent(new Event('acad:native-ready'));
}

/** localStorage 를 쓰는 storage 유틸이 node 환경에서도 동작하도록 한다. */
function stubStorage() {
	const data = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
		removeItem: (key: string) => void data.delete(key)
	});
	return data;
}

async function loadStore() {
	const module = await import('./push.svelte');
	return module.pushStore;
}

describe('pushStore', () => {
	let storage: Map<string, string>;

	beforeEach(() => {
		vi.resetModules();
		registerPushToken.mockReset();
		deletePushToken.mockReset();
		registerPushToken.mockResolvedValue({ status: true, data: { id: 42 } });
		deletePushToken.mockResolvedValue({ status: true });
		storage = stubStorage();
		stubWindow({ withBridge: true });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('start', () => {
		it('앱에서는 토큰을 요청하고 대기 상태가 된다', async () => {
			const pushStore = await loadStore();

			await pushStore.start();

			expect(post).toHaveBeenCalledWith({ type: 'REQUEST_PUSH_TOKEN' });
			expect(pushStore.status).toBe('requesting');
		});

		it('일반 브라우저에서는 대기 후 unsupported 로 끝난다', async () => {
			stubWindow({ withBridge: false });
			vi.useFakeTimers();
			const pushStore = await loadStore();

			const started = pushStore.start();
			await vi.runAllTimersAsync();
			await started;
			vi.useRealTimers();

			expect(post).not.toHaveBeenCalled();
			expect(pushStore.status).toBe('unsupported');
		});

		it('브릿지가 늦게 설치돼도 준비 이벤트를 받아 진행한다', async () => {
			stubWindow({ withBridge: false });
			const pushStore = await loadStore();

			const started = pushStore.start();
			attachBridgeLate();
			await started;

			expect(post).toHaveBeenCalledWith({ type: 'REQUEST_PUSH_TOKEN' });
			expect(pushStore.status).toBe('requesting');
		});

		it('토큰을 받으면 서버에 등록한다', async () => {
			const pushStore = await loadStore();
			await pushStore.start();

			emit({
				type: 'PUSH_TOKEN',
				payload: { token: 'fcm-token', deviceType: 'ANDROID' }
			});
			await vi.waitFor(() => expect(pushStore.status).toBe('registered'));

			expect(registerPushToken).toHaveBeenCalledWith({
				device_token: 'fcm-token',
				device_type: 'ANDROID'
			});
			expect(storage.get('acad_push_token_id')).toBe('42');
		});

		it('등록 응답이 실패면 failed 상태가 된다', async () => {
			registerPushToken.mockResolvedValue({ status: false, message: '권한 없음' });
			const pushStore = await loadStore();
			await pushStore.start();

			emit({ type: 'PUSH_TOKEN', payload: { token: 't', deviceType: 'IOS' } });

			await vi.waitFor(() => expect(pushStore.status).toBe('failed'));
			expect(storage.has('acad_push_token_id')).toBe(false);
		});

		it('등록 중 예외가 나도 failed 로 끝난다', async () => {
			registerPushToken.mockRejectedValue(new Error('네트워크 오류'));
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const pushStore = await loadStore();
			await pushStore.start();

			emit({ type: 'PUSH_TOKEN', payload: { token: 't', deviceType: 'IOS' } });

			await vi.waitFor(() => expect(pushStore.status).toBe('failed'));
			expect(errorSpy).toHaveBeenCalled();
		});

		it('권한을 거부하면 denied 상태가 된다', async () => {
			const pushStore = await loadStore();
			await pushStore.start();

			emit({ type: 'PUSH_PERMISSION_DENIED' });

			expect(pushStore.status).toBe('denied');
			expect(registerPushToken).not.toHaveBeenCalled();
		});

		it('알림 탭 콜백에 data 를 넘긴다', async () => {
			const onNotificationOpened = vi.fn();
			const pushStore = await loadStore();
			await pushStore.start({ onNotificationOpened });

			emit({ type: 'PUSH_OPENED', payload: { data: { type: 'NOTIFICATION' } } });

			expect(onNotificationOpened).toHaveBeenCalledWith({ type: 'NOTIFICATION' });
		});

		it('다시 호출해도 구독이 중복되지 않는다', async () => {
			const onNotificationOpened = vi.fn();
			const pushStore = await loadStore();

			await pushStore.start({ onNotificationOpened });
			await pushStore.start({ onNotificationOpened });
			emit({ type: 'PUSH_OPENED', payload: { data: {} } });

			expect(onNotificationOpened).toHaveBeenCalledTimes(1);
		});
	});

	describe('stop', () => {
		it('해제 후에는 앱 메시지를 처리하지 않는다', async () => {
			const onNotificationOpened = vi.fn();
			const pushStore = await loadStore();

			await pushStore.start({ onNotificationOpened });
			pushStore.stop();
			emit({ type: 'PUSH_OPENED', payload: { data: {} } });

			expect(onNotificationOpened).not.toHaveBeenCalled();
		});
	});

	describe('unregister', () => {
		it('등록된 토큰을 서버에서 지우고 앱 토큰도 폐기한다', async () => {
			const pushStore = await loadStore();
			await pushStore.start();
			emit({ type: 'PUSH_TOKEN', payload: { token: 't', deviceType: 'IOS' } });
			await vi.waitFor(() => expect(pushStore.status).toBe('registered'));

			await pushStore.unregister();

			expect(deletePushToken).toHaveBeenCalledWith(42);
			expect(post).toHaveBeenCalledWith({ type: 'CLEAR_PUSH_TOKEN' });
			expect(storage.has('acad_push_token_id')).toBe(false);
			expect(pushStore.status).toBe('idle');
		});

		it('등록된 토큰이 없으면 서버를 호출하지 않는다', async () => {
			const pushStore = await loadStore();

			await pushStore.unregister();

			expect(deletePushToken).not.toHaveBeenCalled();
			expect(post).toHaveBeenCalledWith({ type: 'CLEAR_PUSH_TOKEN' });
		});

		it('배지를 0 으로 내려 이전 사용자의 미읽음 수를 지운다', async () => {
			const pushStore = await loadStore();

			await pushStore.unregister();

			expect(post).toHaveBeenCalledWith({
				type: 'SET_BADGE_COUNT',
				payload: { count: 0 }
			});
		});

		it('서버 삭제가 실패해도 로그아웃 흐름을 막지 않는다', async () => {
			deletePushToken.mockRejectedValue(new Error('네트워크 오류'));
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const pushStore = await loadStore();
			await pushStore.start();
			emit({ type: 'PUSH_TOKEN', payload: { token: 't', deviceType: 'IOS' } });
			await vi.waitFor(() => expect(pushStore.status).toBe('registered'));

			await expect(pushStore.unregister()).resolves.toBeUndefined();

			expect(errorSpy).toHaveBeenCalled();
			expect(storage.has('acad_push_token_id')).toBe(false);
		});
	});

	describe('discardLocalRegistration', () => {
		it('세션이 끊겨도 서버를 부르지 않고 기기 토큰을 폐기한다', async () => {
			const pushStore = await loadStore();
			await pushStore.start();
			emit({ type: 'PUSH_TOKEN', payload: { token: 't', deviceType: 'IOS' } });
			await vi.waitFor(() => expect(pushStore.status).toBe('registered'));

			pushStore.discardLocalRegistration();

			expect(deletePushToken).not.toHaveBeenCalled();
			expect(post).toHaveBeenCalledWith({ type: 'CLEAR_PUSH_TOKEN' });
			expect(post).toHaveBeenCalledWith({
				type: 'SET_BADGE_COUNT',
				payload: { count: 0 }
			});
			expect(storage.has('acad_push_token_id')).toBe(false);
			expect(pushStore.status).toBe('idle');
		});
	});

	describe('브릿지 버전', () => {
		it('요구 버전보다 낮은 앱에서는 푸시를 시도하지 않는다', async () => {
			stubWindow({ withBridge: true });
			(
				window as unknown as FakeWindow & { __ACAD_NATIVE__: { version: number } }
			).__ACAD_NATIVE__.version = 0;
			vi.useFakeTimers();
			const pushStore = await loadStore();

			const started = pushStore.start();
			await vi.runAllTimersAsync();
			await started;
			vi.useRealTimers();

			expect(post).not.toHaveBeenCalled();
			expect(pushStore.status).toBe('unsupported');
		});
	});

	describe('syncBadge', () => {
		it('미읽음 개수를 앱에 전달한다', async () => {
			const pushStore = await loadStore();

			pushStore.syncBadge(7);

			expect(post).toHaveBeenCalledWith({
				type: 'SET_BADGE_COUNT',
				payload: { count: 7 }
			});
		});

		it('일반 브라우저에서는 아무 일도 하지 않는다', async () => {
			stubWindow({ withBridge: false });
			const pushStore = await loadStore();

			pushStore.syncBadge(7);

			expect(post).not.toHaveBeenCalled();
		});
	});
});
