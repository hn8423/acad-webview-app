<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/global.scss';
	import '$lib/stores/auth.svelte';
	import '$lib/stores/academy.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { goto } from '$app/navigation';
	import { setSessionExpiredHandler } from '$lib/api/client';
	import { authStore } from '$lib/stores/auth.svelte';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { pushStore } from '$lib/stores/push.svelte';

	let { children } = $props();

	/** 알림을 탭해 앱이 열리면 역할에 맞는 알림함으로 보낸다. */
	function handleNotificationOpened() {
		const role = academyStore.memberRole;
		const isStaff = role === 'ADMIN' || role === 'INSTRUCTOR';
		goto(isStaff ? '/admin/notifications' : '/app/notifications');
	}

	// 리프레시 실패로 세션이 끊길 때도 기기 토큰을 폐기해야 한다.
	// 그러지 않으면 같은 기기에 다른 사용자가 로그인해도 이전 사용자의 토큰이
	// 서버에 살아 있어 그 사람 알림이 이 기기로 온다.
	$effect(() => {
		setSessionExpiredHandler(pushStore.discardLocalRegistration);
		return () => setSessionExpiredHandler(null);
	});

	// 푸시 토큰 등록은 로그인 이후에만 의미가 있다.
	// 앱이 아닌 일반 브라우저에서는 pushStore 가 알아서 아무 일도 하지 않는다.
	$effect(() => {
		if (!authStore.isInitialized) return;

		if (!authStore.isAuthenticated) {
			pushStore.stop();
			return;
		}

		void pushStore.start({ onNotificationOpened: handleNotificationOpened });
		return () => pushStore.stop();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#110e1a" />
</svelte:head>

{@render children()}

<ToastContainer />
