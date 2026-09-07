import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	isNativeApp,
	postToNative,
	subscribeToNative,
	whenBridgeReady,
	type NativeToWebMessage
} from './bridge';

type Handler = (message: NativeToWebMessage) => void;

type FakeWindow = EventTarget & { __ACAD_NATIVE__?: unknown };

/**
 * 이 스펙은 node 환경에서 돌기 때문에 window 가 없다.
 * 브릿지는 `typeof window` 로 환경을 판별하고 준비 이벤트도 window 에서 듣기 때문에
 * EventTarget 기반의 가짜 window 를 세운다.
 */
function stubWindow(bridge?: Record<string, unknown>) {
	const fakeWindow = new EventTarget() as FakeWindow;
	if (bridge) fakeWindow.__ACAD_NATIVE__ = bridge;
	vi.stubGlobal('window', fakeWindow);
}

/** 앱이 심어 주는 브릿지를 흉내낸다. */
function installBridge() {
	const post = vi.fn();
	let handler: Handler | null = null;

	const bridge = {
		version: 1,
		post,
		receive: (message: NativeToWebMessage) => handler?.(message),
		setHandler: (next: Handler) => {
			handler = next;
		},
		clearHandler: () => {
			handler = null;
		}
	};

	stubWindow(bridge);

	return {
		bridge,
		post,
		emit: (message: NativeToWebMessage) => handler?.(message)
	};
}

describe('native bridge', () => {
	beforeEach(() => stubWindow());
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	describe('isNativeApp', () => {
		it('브릿지가 있으면 true', () => {
			installBridge();
			expect(isNativeApp()).toBe(true);
		});

		it('일반 브라우저에서는 false', () => {
			expect(isNativeApp()).toBe(false);
		});

		it('요구 버전보다 낮은 브릿지는 false', () => {
			const { bridge } = installBridge();
			bridge.version = 0;

			expect(isNativeApp()).toBe(false);
		});
	});

	describe('postToNative', () => {
		it('브릿지로 메시지를 넘긴다', () => {
			const { post } = installBridge();

			postToNative({ type: 'REQUEST_PUSH_TOKEN' });

			expect(post).toHaveBeenCalledWith({ type: 'REQUEST_PUSH_TOKEN' });
		});

		it('브릿지가 없으면 조용히 넘어간다', () => {
			expect(() => postToNative({ type: 'CLEAR_PUSH_TOKEN' })).not.toThrow();
		});

		it('전송이 실패해도 예외를 던지지 않는다', () => {
			const { post } = installBridge();
			post.mockImplementation(() => {
				throw new Error('브릿지 오류');
			});
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			expect(() => postToNative({ type: 'CLEAR_PUSH_TOKEN' })).not.toThrow();
			expect(errorSpy).toHaveBeenCalled();
		});
	});

	describe('subscribeToNative', () => {
		it('앱이 보낸 메시지를 받는다', () => {
			const { emit } = installBridge();
			const handler = vi.fn();

			subscribeToNative(handler);
			emit({ type: 'PUSH_PERMISSION_DENIED' });

			expect(handler).toHaveBeenCalledWith({ type: 'PUSH_PERMISSION_DENIED' });
		});

		it('구독을 해제하면 더 이상 받지 않는다', () => {
			const { emit } = installBridge();
			const handler = vi.fn();

			const unsubscribe = subscribeToNative(handler);
			unsubscribe();
			emit({ type: 'PUSH_PERMISSION_DENIED' });

			expect(handler).not.toHaveBeenCalled();
		});

		it('구독을 해제하면 앱 쪽 핸들러도 떼어 다시 큐잉되게 한다', () => {
			const { bridge } = installBridge();
			const clearSpy = vi.spyOn(bridge, 'clearHandler');

			subscribeToNative(vi.fn())();

			expect(clearSpy).toHaveBeenCalledTimes(1);
		});

		it('브릿지가 없으면 해제 함수만 돌려준다', () => {
			const handler = vi.fn();

			expect(() => subscribeToNative(handler)()).not.toThrow();
			expect(handler).not.toHaveBeenCalled();
		});

		it('구독 등록이 실패해도 예외를 던지지 않는다', () => {
			const { bridge } = installBridge();
			bridge.setHandler = () => {
				throw new Error('브릿지 오류');
			};
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			expect(() => subscribeToNative(vi.fn())()).not.toThrow();
			expect(errorSpy).toHaveBeenCalled();
		});
	});

	describe('whenBridgeReady', () => {
		it('이미 설치돼 있으면 곧바로 true', async () => {
			installBridge();

			await expect(whenBridgeReady(50)).resolves.toBe(true);
		});

		it('늦게 설치되면 준비 이벤트를 받아 true', async () => {
			const pending = whenBridgeReady(1000);

			(window as unknown as FakeWindow).__ACAD_NATIVE__ = { version: 1 };
			window.dispatchEvent(new Event('acad:native-ready'));

			await expect(pending).resolves.toBe(true);
		});

		it('시간 안에 설치되지 않으면 false', async () => {
			await expect(whenBridgeReady(10)).resolves.toBe(false);
		});

		it('구버전 브릿지가 설치돼 있으면 false', async () => {
			const { bridge } = installBridge();
			bridge.version = 0;

			await expect(whenBridgeReady(50)).resolves.toBe(false);
		});
	});
});
