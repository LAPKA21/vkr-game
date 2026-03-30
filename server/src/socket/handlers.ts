// Обработчики Socket.io: подключение, комнаты, действия в игре. 

import type { Server, Socket } from 'socket.io';
import {
  createRoom,
  getRoom,
  listRooms,
  joinRoom,
  leaveRoom,
  startGame,
  applyPlayerAction,
  restartRound,
  serializeRoom,
} from '../rooms/roomManager.js';
import { trainingGameService } from '../application/trainingGameService.js';

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('rooms:list', () => {
      const rooms = listRooms().map((r) => ({
        id: r.id,
        name: r.name,
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
      }));
      socket.emit('rooms:list', rooms);
    });

    socket.on('room:create', (name: string) => {
      const room = createRoom(name || 'Новая комната', false);
      socket.emit('room:created', {
        roomId: room.id,
        name: room.name,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
      });
    });

    socket.on('room:createTraining', (name: string) => {
      const room = createRoom(name || 'Обучение с ботом', true);
      socket.emit('room:created', {
        roomId: room.id,
        name: room.name,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        isTraining: true,
      });
    });

    socket.on('room:join', (data: { roomId: string; playerName: string }) => {
      const { roomId, playerName } = data || {};
      if (!roomId || !playerName?.trim()) {
        socket.emit('error', { message: 'roomId и playerName обязательны' });
        return;
      }
      const result = joinRoom(roomId, socket.id, playerName.trim());
      if (!result) {
        socket.emit('error', { message: 'Не удалось войти в комнату' });
        return;
      }
      socket.join(roomId);
      socket.emit('room:joined', serializeRoom(result.room));
      socket.to(roomId).emit('room:updated', serializeRoom(result.room));

      // Автоматически запускаем игру в режиме обучения, если есть 2 игрока (бот + игрок)
      if (result.room.isTraining && result.room.players.length >= 2) {
        setTimeout(() => {
          const room = getRoom(roomId);
          if (room && room.gameContext.state === 'WAITING_FOR_PLAYERS') {
            const started = startGame(roomId);
            if (started) {
              // Получаем обновленную комнату после запуска игры
              const updatedRoom = getRoom(roomId);
              if (updatedRoom) {
                io.to(roomId).emit('game:state', serializeRoom(updatedRoom));

                // Если первым ходит бот — сразу запускаем его ход
                const current =
                  updatedRoom.players[updatedRoom.gameContext.currentPlayerIndex];
                if (current?.isBot) {
                  trainingGameService.executeBotTurn(
                    updatedRoom,
                    (event, payload) => io.to(roomId).emit(event, payload),
                    applyPlayerAction
                  );
                }
              }
            }
          }
        }, 100);
      }
    });

    socket.on('game:start', (roomId: string) => {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Комната не найдена' });
        return;
      }
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) {
        socket.emit('error', { message: 'Вы не в этой комнате' });
        return;
      }
      const started = startGame(roomId);
      if (!started) {
        socket.emit('error', { message: 'Не удалось начать игру (нужно минимум 2 игрока)' });
        return;
      }
      io.to(roomId).emit('game:state', serializeRoom(room));
    });

    socket.on('game:action', (data: { roomId: string; action: string; amount?: number }) => {
      const { roomId, action, amount } = data || {};
      if (!roomId || !action) {
        socket.emit('error', { message: 'roomId и action обязательны' });
        return;
      }
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Комната не найдена' });
        return;
      }
      const validAction = ['fold', 'check', 'call', 'raise', 'allin'].includes(action);
      if (!validAction) {
        socket.emit('error', { message: 'Недопустимое действие' });
        return;
      }
      const ok = applyPlayerAction(
        room,
        socket.id,
        action as 'fold' | 'check' | 'call' | 'raise' | 'allin',
        amount,
        (event, payload) => io.to(roomId).emit(event, payload)
      );
      if (!ok) socket.emit('error', { message: 'Действие не разрешено' });
    });

    socket.on('game:restart', (roomId: string) => {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Комната не найдена' });
        return;
      }
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) {
        socket.emit('error', { message: 'Вы не в этой комнате' });
        return;
      }
      restartRound(roomId, (event, payload) => io.to(roomId).emit(event, payload));
    });

    socket.on('disconnect', () => {
      const room = leaveRoom(socket.id);
      if (room) {
        io.to(room.id).emit('room:updated', serializeRoom(room));
        if (room.gameContext.state !== 'WAITING_FOR_PLAYERS') {
          io.to(room.id).emit('game:state', serializeRoom(room));
        }
      }
    });
  });
}
