import { io, type Socket } from 'socket.io-client';
import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { getAccessToken } from '$lib/api/client';
import type { EnsembleMessage } from '$lib/types/ensemble';
import { z } from 'zod';

const messagePayloadSchema = z.object({
	id: z.number(),
	sender_member_id: z.number(),
	sender_name: z.string(),
	sender_profile_img: z.string().optional(),
	message: z.string(),
	message_type: z.enum(['TEXT', 'SYSTEM']),
	created_at: z.string()
});

export function createEnsembleChat(groupId: number, academyId: number) {
	let socket: Socket | null = null;
	const messageListeners = new Set<(msg: EnsembleMessage) => void>();
	const connectionListeners = new Set<(connected: boolean) => void>();

	function connect() {
		if (socket?.connected) return;

		socket = io(`${PUBLIC_API_BASE_URL}/academic/chat`, {
			auth: (cb) => {
				const token = getAccessToken();
				cb({ token: token ?? '' });
			},
			transports: ['websocket'],
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
			}
		});

		socket.on('connect_error', () => {
			connectionListeners.forEach((cb) => cb(false));
		});
	}

	function disconnect() {
		socket?.disconnect();
		socket = null;
		messageListeners.clear();
		connectionListeners.clear();
	}

	function send(message: string): boolean {
		const trimmed = message.trim();
		if (!trimmed || trimmed.length > 1000 || !socket?.connected) return false;
		socket.emit('send_message', { group_id: groupId, message: trimmed });
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

	return {
		connect,
		disconnect,
		send,
		onMessage,
		onConnectionChange,
		get connected() {
			return socket?.connected ?? false;
		}
	};
}

export type EnsembleChatService = ReturnType<typeof createEnsembleChat>;
