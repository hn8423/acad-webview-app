import { io, type Socket } from 'socket.io-client';
import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { getAccessToken } from '$lib/api/client';
import type { EnsembleMessage } from '$lib/types/ensemble';
import { z } from 'zod';

const messagePayloadSchema = z.object({
	id: z.number(),
	sender_member_id: z.number(),
	sender_name: z.string(),
	sender_profile_img: z.string().nullable().optional(),
	message: z.string(),
	message_type: z.enum(['TEXT', 'SYSTEM']),
	created_at: z.string()
});

export function createEnsembleChat(groupId: number, academyId: number) {
	let socket: Socket | null = null;
	const messageListeners = new Set<(msg: EnsembleMessage) => void>();
	const connectionListeners = new Set<(connected: boolean) => void>();
	const errorListeners = new Set<(error: string) => void>();

	function connect() {
		if (socket?.connected) return;

		socket = io(`${PUBLIC_API_BASE_URL}/academic/chat`, {
			auth: (cb) => {
				const token = getAccessToken();
				cb({ token: token ?? '' });
			},
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 30000
		});

		socket.on('connect', () => {
			socket?.emit('join_room', { group_id: groupId, academy_id: academyId });
			connectionListeners.forEach((cb) => cb(true));
		});

		socket.on('disconnect', () => {
			connectionListeners.forEach((cb) => cb(false));
		});

		socket.on('message:new', (data: unknown) => {
			const parsed = messagePayloadSchema.safeParse(data);
			if (parsed.success) {
				messageListeners.forEach((cb) => cb(parsed.data));
			} else {
				console.error('[EnsembleChat] Invalid message payload:', parsed.error.issues, data);
			}
		});

		socket.on('connect_error', () => {
			connectionListeners.forEach((cb) => cb(false));
		});

		socket.on('error', (err: { message?: string }) => {
			const errorMessage = err?.message ?? '채팅 서버 오류가 발생했습니다.';
			errorListeners.forEach((cb) => cb(errorMessage));
		});
	}

	function disconnect() {
		if (socket?.connected) {
			socket.emit('leave_room', { group_id: groupId });
		}
		socket?.disconnect();
		socket = null;
		messageListeners.clear();
		connectionListeners.clear();
		errorListeners.clear();
	}

	function send(message: string): boolean {
		const trimmed = message.trim();
		if (!trimmed || trimmed.length > 1000 || !socket?.connected) return false;
		socket.emit('send_message', { group_id: groupId, message: trimmed, message_type: 'TEXT' });
		return true;
	}

	function onMessage(callback: (msg: EnsembleMessage) => void): () => void {
		messageListeners.add(callback);
		return () => messageListeners.delete(callback);
	}

	function onConnectionChange(callback: (connected: boolean) => void): () => void {
		connectionListeners.add(callback);
		return () => connectionListeners.delete(callback);
	}

	function onError(callback: (error: string) => void): () => void {
		errorListeners.add(callback);
		return () => errorListeners.delete(callback);
	}

	return {
		connect,
		disconnect,
		send,
		onMessage,
		onConnectionChange,
		onError,
		get connected() {
			return socket?.connected ?? false;
		}
	};
}

export type EnsembleChatService = ReturnType<typeof createEnsembleChat>;
