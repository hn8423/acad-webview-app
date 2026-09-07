/**
 * 네이티브 앱(WebView) 브릿지.
 *
 * 앱은 페이지가 뜨기 전에 `window.__ACAD_NATIVE__` 를 심어 둔다.
 * 웹에서 먼저 로드된 경우를 대비해 앱 쪽이 메시지를 큐에 쌓아 두므로,
 * 여기서는 핸들러만 등록하면 밀린 메시지까지 순서대로 받는다.
 *
 * 일반 브라우저에서는 브릿지가 없다. 그 경우 전송은 조용히 무시되고
 * 구독은 아무 일도 하지 않으므로, 호출부에서 분기할 필요가 없다.
 */

export type DeviceType = 'IOS' | 'ANDROID';

/** 웹 → 앱 */
export type WebToNativeMessage =
	| { type: 'REQUEST_PUSH_TOKEN' }
	| { type: 'CLEAR_PUSH_TOKEN' }
	| { type: 'SET_BADGE_COUNT'; payload: { count: number } };

/** 앱 → 웹 */
export type NativeToWebMessage =
	| { type: 'PUSH_TOKEN'; payload: { token: string; deviceType: DeviceType } }
	| { type: 'PUSH_PERMISSION_DENIED' }
	| { type: 'PUSH_OPENED'; payload: { data: Record<string, string> } };

type NativeBridge = {
	version: number;
	receive: (message: NativeToWebMessage) => void;
	setHandler: (handler: (message: NativeToWebMessage) => void) => void;
	/** 구버전 앱에는 없을 수 있다. */
	clearHandler?: () => void;
	post: (message: WebToNativeMessage) => void;
};

/**
 * 이 웹앱이 요구하는 최소 브릿지 버전.
 * 사용자가 앱을 업데이트하지 않으면 구버전 브릿지에 붙을 수 있으므로,
 * 프로토콜을 바꿀 때 이 값을 올려 옛 앱에서는 푸시를 시도하지 않게 한다.
 */
const MIN_BRIDGE_VERSION = 1;

/** 앱이 브릿지 설치를 마쳤을 때 쏘는 이벤트. 앱의 injectedBridge.ts 와 같아야 한다. */
const NATIVE_READY_EVENT = 'acad:native-ready';

/** 브릿지를 기다릴 최대 시간. 이 시간을 넘기면 앱이 아니라고 본다. */
const BRIDGE_WAIT_MS = 3000;

function getBridge(): NativeBridge | null {
	if (typeof window === 'undefined') return null;
	return (window as { __ACAD_NATIVE__?: NativeBridge }).__ACAD_NATIVE__ ?? null;
}

/** 이 웹앱과 통신 가능한 네이티브 앱의 WebView 안에서 실행 중인지. */
export function isNativeApp(): boolean {
	const bridge = getBridge();
	return bridge !== null && bridge.version >= MIN_BRIDGE_VERSION;
}

/**
 * 브릿지가 준비될 때까지 기다린다. 준비되면 true, 앱이 아니면 false.
 *
 * Android 에서는 앱이 브릿지를 심는 시점이 페이지 스크립트보다 늦을 수 있다.
 * 그래서 존재 여부만 즉시 확인하면 앱 안인데도 일반 브라우저로 오판할 수 있어,
 * 설치 완료 이벤트를 짧게 기다린 뒤 판단한다.
 */
export function whenBridgeReady(timeoutMs: number = BRIDGE_WAIT_MS): Promise<boolean> {
	if (typeof window === 'undefined') return Promise.resolve(false);
	if (getBridge()) return Promise.resolve(isNativeApp());

	return new Promise((resolve) => {
		const finish = (ready: boolean) => {
			clearTimeout(timer);
			window.removeEventListener(NATIVE_READY_EVENT, onReady);
			resolve(ready);
		};
		const onReady = () => finish(isNativeApp());
		const timer = setTimeout(() => finish(false), timeoutMs);

		window.addEventListener(NATIVE_READY_EVENT, onReady);
	});
}

/** 앱에 메시지를 보낸다. 앱 밖에서는 아무 일도 일어나지 않는다. */
export function postToNative(message: WebToNativeMessage): void {
	const bridge = getBridge();
	if (!bridge) return;

	try {
		bridge.post(message);
	} catch (error) {
		console.error('네이티브 메시지 전송 실패:', error);
	}
}

/**
 * 앱이 보내는 메시지를 구독한다. 구독 해제 함수를 돌려준다.
 * 브릿지는 핸들러를 하나만 유지하므로 앱 전역에서 한 번만 호출해야 한다.
 */
export function subscribeToNative(handler: (message: NativeToWebMessage) => void): () => void {
	const bridge = getBridge();
	if (!bridge) return () => {};

	let active = true;

	try {
		bridge.setHandler((message) => {
			if (active) handler(message);
		});
	} catch (error) {
		console.error('네이티브 메시지 구독 실패:', error);
		return () => {};
	}

	return () => {
		active = false;
		// 핸들러를 떼야 앱 쪽이 다시 큐에 쌓는다.
		// 안 그러면 구독이 없는 동안 온 메시지가 조용히 사라진다.
		bridge.clearHandler?.();
	};
}
