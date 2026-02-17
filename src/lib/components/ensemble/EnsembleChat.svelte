<script lang="ts">
	import { onDestroy } from 'svelte';
	import { untrack } from 'svelte';
	import { createEnsembleChat, type EnsembleChatService } from '$lib/services/ensemble-chat';
	import { getMessages, getComments } from '$lib/api/ensemble';
	import { academyStore } from '$lib/stores/academy.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import ChatMessageList from './chat/ChatMessageList.svelte';
	import ChatInput from './chat/ChatInput.svelte';
	import type { EnsembleMessage, EnsembleComment } from '$lib/types/ensemble';

	interface Props {
		ensembleId: number;
		isMember: boolean;
		isOpen: boolean;
	}

	let { ensembleId, isMember, isOpen }: Props = $props();

	let messages = $state<EnsembleMessage[]>([]);
	let legacyComments = $state<EnsembleComment[]>([]);
	let loading = $state(true);
	let currentPage = $state(1);
	let hasMore = $state(false);
	let loadingMore = $state(false);
	let connected = $state(false);
	let chat: EnsembleChatService | null = null;

	let lastMessageId = $derived(
		messages.length > 0 ? Math.max(...messages.map((m) => m.id)) : 0
	);

	async function initializeChat(signal: { cancelled: boolean }) {
		const academyId = academyStore.academyId;
		if (!academyId) return;

		loading = true;
		try {
			const [msgRes, commentRes] = await Promise.allSettled([
				getMessages(academyId, ensembleId, 1, 50),
				getComments(academyId, ensembleId)
			]);

			if (signal.cancelled) return;

			if (msgRes.status === 'fulfilled' && msgRes.value.status) {
				const data = msgRes.value.data;
				messages = data.list;
				hasMore = data.meta.page < Math.ceil(data.meta.total / 50);
				currentPage = 1;
			}

			if (commentRes.status === 'fulfilled' && commentRes.value.status) {
				legacyComments = commentRes.value.data;
			}
		} finally {
			if (!signal.cancelled) {
				loading = false;
			}
		}

		if (signal.cancelled) return;

		chat = createEnsembleChat(ensembleId, academyId);
		chat.onMessage((msg) => {
			const exists = untrack(() => messages).some((m) => m.id === msg.id);
			if (!exists) {
				messages = [...messages, msg];
			}
		});
		chat.onConnectionChange((status) => {
			connected = status;
		});
		chat.onError((msg) => {
			toastStore.error(msg);
		});
		chat.onReconnect(() => {
			loadMissedMessages();
		});
		chat.connect();
	}

	function disconnectChat() {
		chat?.disconnect();
		chat = null;
	}

	async function handleLoadMore() {
		const academyId = academyStore.academyId;
		if (!academyId || loadingMore || !hasMore) return;

		loadingMore = true;
		try {
			const nextPage = currentPage + 1;
			const res = await getMessages(academyId, ensembleId, nextPage, 50);
			if (res.status) {
				messages = [...res.data.list, ...messages];
				currentPage = nextPage;
				hasMore = res.data.meta.page < Math.ceil(res.data.meta.total / 50);
			}
		} catch {
			toastStore.error('이전 메시지를 불러오지 못했습니다.');
		} finally {
			loadingMore = false;
		}
	}

	function handleSend(content: string) {
		if (!chat?.send(content)) {
			toastStore.error('연결이 끊어져 메시지를 보낼 수 없습니다.');
		}
	}

	async function loadMissedMessages() {
		const academyId = academyStore.academyId;
		const sinceId = untrack(() => lastMessageId);
		if (!academyId || sinceId === 0) return;

		try {
			const res = await getMessages(academyId, ensembleId, 1, 50, sinceId);
			if (!chat) return;
			if (res.status && res.data.list.length > 0) {
				const currentMessages = untrack(() => messages);
				const existingIds = new Set(currentMessages.map((m) => m.id));
				const newMessages = res.data.list.filter((m) => !existingIds.has(m.id));
				if (newMessages.length > 0) {
					messages = [...currentMessages, ...newMessages].sort((a, b) => a.id - b.id);
				}
			}
		} catch {
			// 소켓이 재연결되어 실시간 메시지는 받으므로 silent fail
		}
	}

	$effect(() => {
		const signal = { cancelled: false };

		if (isOpen && ensembleId) {
			initializeChat(signal);
		}

		return () => {
			signal.cancelled = true;
			disconnectChat();
			messages = [];
			legacyComments = [];
			loading = true;
			connected = false;
		};
	});

	onDestroy(() => {
		disconnectChat();
	});
</script>

<section class="ensemble-chat">
	<div class="ensemble-chat__header">
		<h3 class="ensemble-chat__title">채팅</h3>
		{#if !loading && !connected}
			<span class="ensemble-chat__status">연결 끊김</span>
		{/if}
	</div>
	<ChatMessageList
		{messages}
		{legacyComments}
		currentMemberId={academyStore.memberId ?? 0}
		{loading}
		{loadingMore}
		{hasMore}
		onloadmore={handleLoadMore}
	/>
	{#if isMember}
		<ChatInput onsend={handleSend} disabled={!connected} />
	{:else}
		<p class="ensemble-chat__readonly">멤버만 채팅에 참여할 수 있습니다.</p>
	{/if}
</section>

<style lang="scss">
	@use '$lib/styles/variables' as *;

	.ensemble-chat {
		display: flex;
		flex-direction: column;

		&__header {
			display: flex;
			align-items: center;
			gap: var(--space-sm);
			margin-bottom: var(--space-sm);
		}

		&__title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text);
		}

		&__status {
			font-size: var(--font-size-xs);
			color: var(--color-danger);
		}

		&__readonly {
			font-size: var(--font-size-sm);
			color: var(--color-text-muted);
			text-align: center;
			padding: var(--space-md) 0;
			border-top: 1px solid var(--color-divider);
		}
	}
</style>
