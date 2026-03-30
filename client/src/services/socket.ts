//Сервис Socket.io: подключение к серверу, события комнат и игры.

import { io } from 'socket.io-client';
import type { RoomState, RoomListItem } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

export const socket = io(SOCKET_URL, { autoConnect: true });

export type SocketEventMap = {
  'rooms:list': (rooms: RoomListItem[]) => void;
  'room:created': (data: { roomId: string; name: string; playerCount: number; maxPlayers: number; isTraining?: boolean }) => void;
  'room:joined': (room: RoomState) => void;
  'room:updated': (room: RoomState) => void;
  'game:state': (room: RoomState & { winners?: number[] }) => void;
  error: (data: { message: string }) => void;
};

export function on<K extends keyof SocketEventMap>(event: K, cb: SocketEventMap[K]) {
  (socket.on as any)(event, cb);
}

export function off<K extends keyof SocketEventMap>(event: K) {
  socket.off(event);
}

export function emit(event: string, ...args: unknown[]) {
  socket.emit(event, ...args);
}

export function listRooms() {
  emit('rooms:list');
}

export function createRoom(name: string) {
  emit('room:create', name);
}

export function createTrainingRoom(name: string) {
  emit('room:createTraining', name);
}

export function joinRoom(roomId: string, playerName: string) {
  emit('room:join', { roomId, playerName });
}

export function startGame(roomId: string) {
  emit('game:start', roomId);
}

export function gameAction(roomId: string, action: string, amount?: number) {
  emit('game:action', { roomId, action, amount });
}

export function restartRound(roomId: string) {
  emit('game:restart', roomId);
}
