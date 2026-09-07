import { deletePushToken, registerPushToken } from '$lib/api/notification';
import {
	isNativeApp,
	postToNative,
	subscribeToNative,
	whenBridgeReady,
	type NativeToWebMessage
} from '$lib/native/bridge';
import { getJson, removeItem, setJson } from '$lib/utils/storage';

/** 로그아웃 때 서버에서 지우려면 등록된 토큰의 id 를 기억해야 한다. */
const PUSH_TOKEN_ID_KEY = 'push_token_id';

/**
 * 서버에서 토큰을 지우는 데 기다려 줄 시간.
 * 로그아웃 버튼이 네트워크 상태에 따라 몇 초씩 멈추면 안 되고,
 * 정작 중요한 기기 토큰 폐기는 네트워크 없이도 되기 때문이다.
 */
const DELETE_TIMEOUT_MS = 3000;

export type PushStatus =
	/** 앱이 아니라 일반 브라우저 — 푸시를 쓸 수 없다. */
	| 'unsupported'
	/** 앱이지만 아직 토큰을 요청하지 않았다. */
	| 'idle'
	/** 권한 요청 / 토큰 발급 대기 중. */
	| 'requesting'
	/** 서버에 토큰을 등록했다. */
	| 'registered'
	/** 사용자가 알림 권한을 거부했다. */
	| 'denied'
	/** 등록을 시도했으나 실패했다. */
	| 'failed';

export type PushOptions = {
	/** 알림을 탭해 앱이 열렸을 때. FCM data 페이로드가 그대로 넘어온다. */
	onNotificationOpened?: (data: Record<string, string>) => void;
};

let status = $state<PushStatus>('unsupported');
let unsubscribe: (() => void) | null = null;
/** stop() 이후에 늦게 도착한 start() 가 구독을 되살리지 않도록 하는 세대 번호. */
let generation = 0;

async function handlePushToken(token: string, deviceType: 'IOS' | 'ANDROID') {
	try {
		const res = await registerPushToken({ device_token: token, device_type: deviceType });

		if (!res.status || !res.data) {
			status = 'failed';
			return;
		}

		setJson(PUSH_TOKEN_ID_KEY, res.data.id);
		status = 'registered';
	} catch (error) {
		console.error('푸시 토큰 등록 실패:', error);
		status = 'failed';
	}
}

export function getPushStore() {
	/**
	 * 앱에 토큰을 요청하고, 받으면 서버에 등록한다.
	 * 로그인이 끝난 뒤에 호출해야 한다 — 토큰 등록 API 가 인증을 요구하고,
	 * 알림 권한 창도 맥락이 있는 시점에 떠야 한다.
	 */
	async function start(options: PushOptions = {}): Promise<void> {
		stop();

		const current = ++generation;

		if (!(await whenBridgeReady())) {
			if (current === generation) status = 'unsupported';
			return;
		}

		// 기다리는 사이에 stop() 또는 다른 start() 가 있었다면 이 호출은 버린다.
		if (current !== generation) return;

		unsubscribe = subscribeToNative((message: NativeToWebMessage) => {
			switch (message.type) {
				case 'PUSH_TOKEN':
					void handlePushToken(message.payload.token, message.payload.deviceType);
					break;
				case 'PUSH_PERMISSION_DENIED':
					status = 'denied';
					break;
				case 'PUSH_OPENED':
					options.onNotificationOpened?.(message.payload.data);
					break;
			}
		});

		status = 'requesting';
		postToNative({ type: 'REQUEST_PUSH_TOKEN' });
	}

	/** 구독만 해제한다. 서버에 등록된 토큰은 그대로 둔다. */
	function stop(): void {
		generation += 1;
		unsubscribe?.();
		unsubscribe = null;
	}

	/**
	 * 로그아웃 시 호출한다.
	 * 서버 등록을 지우고 기기 토큰도 폐기해, 다음 사용자에게 알림이 새지 않게 한다.
	 * 인증이 살아 있는 동안 호출해야 서버 삭제가 성공한다.
	 */
	async function unregister(): Promise<void> {
		const tokenId = getJson<number>(PUSH_TOKEN_ID_KEY);

		if (tokenId) {
			// 서버 삭제는 되면 좋고 안 되면 그만이다. 로그아웃을 붙잡아 두지 않는다.
			await Promise.race([
				deletePushToken(tokenId).catch((error) => {
					console.error('푸시 토큰 삭제 실패:', error);
				}),
				new Promise((resolve) => setTimeout(resolve, DELETE_TIMEOUT_MS))
			]);
		}

		discardLocalRegistration();
	}

	/**
	 * 세션이 끊겨 서버를 부를 수 없을 때의 정리.
	 *
	 * 기기 FCM 토큰을 폐기하는 것이 핵심이다. 서버에는 이전 사용자의 토큰 행이
	 * 남지만, 토큰 자체가 무효가 되므로 다음 사용자 기기로 알림이 가지 않는다.
	 */
	function discardLocalRegistration(): void {
		removeItem(PUSH_TOKEN_ID_KEY);
		// 배지를 남겨 두면 로그아웃한 뒤에도 이전 사용자의 미읽음 수가 아이콘에 붙어 있는다.
		syncBadge(0);
		postToNative({ type: 'CLEAR_PUSH_TOKEN' });
		stop();
		status = isNativeApp() ? 'idle' : 'unsupported';
	}

	/**
	 * 앱 아이콘 배지를 미읽음 개수에 맞춘다.
	 * 실제 반영은 iOS 에서만 된다 — Android 는 배지를 앱이 지정할 수 없어
	 * 앱 쪽에서 걸러낸다. 여기서는 플랫폼을 구분하지 않고 보낸다.
	 */
	function syncBadge(count: number): void {
		postToNative({ type: 'SET_BADGE_COUNT', payload: { count } });
	}

	return {
		get status() {
			return status;
		},
		start,
		stop,
		unregister,
		discardLocalRegistration,
		syncBadge
	};
}

export const pushStore = getPushStore();
