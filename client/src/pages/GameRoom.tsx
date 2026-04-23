import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { joinRoom, leaveRoom, on, off, startGame, gameAction, restartRound } from '../services/socket';
import { socket } from '../services/socket';
import { useAuth } from '../state/AuthContext';
import GameTable from '../components/GameTable';
import type { RoomState } from '../types';
import styles from './GameRoom.module.css';

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(socket.id ?? null);
  const [playerName, setPlayerName] = useState('');
  const [joinError, setJoinError] = useState('');
  const joined = useRef(false);
  const { token, user } = useAuth();

  useEffect(() => {
    const handleConnect = () => setMyId(socket.id ?? null);
    const handleDisconnect = () => setMyId(null);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // на случай, если уже подключены
    handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      leaveRoom(); // Отправляем серверу явный сигнал о выходе со страницы
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const stateName = (location.state as { playerName?: string })?.playerName || user?.username;
    if (stateName) {
      setPlayerName(stateName);
      if (!joined.current) {
        joined.current = true;
        joinRoom(roomId, stateName, token ?? undefined);
      }
    }
  }, [roomId, location.state, user, token]);

  useEffect(() => {
    if (!roomId) return;
    const handleJoined = (r: RoomState) => setRoom(r);
    const handleState = (r: RoomState & { winners?: number[] }) => setRoom(r);
    const handleUpdated = (r: RoomState) => setRoom(r);
    const handleError = (data: { message: string }) => setJoinError(data.message);
    on('room:joined', handleJoined);
    on('game:state', handleState);
    on('room:updated', handleUpdated);
    on('error', handleError);
    return () => {
      off('room:joined');
      off('game:state');
      off('room:updated');
      off('error');
    };
  }, [roomId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = playerName.trim();
    if (!name || !roomId) return;
    setJoinError('');
    joined.current = true;
    joinRoom(roomId, name, token ?? undefined);
  };

  const inRoom = Boolean(myId && room && room.players.some((p) => p.id === myId));

  if (!roomId) {
    return (
      <div className={styles.page}>
        <p>Комната не указана.</p>
        <button onClick={() => navigate('/servers')}>К списку серверов</button>
      </div>
    );
  }

  if (!myId) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Подключение к комнате…</p>
      </div>
    );
  }

  if (joined.current && !room) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Подключение к комнате…</p>
      </div>
    );
  }

  if (!inRoom && !room) {
    return (
      <div className={styles.page}>
        <div className={styles.join}>
          <h1>Вход в комнату</h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button type="submit">Войти</button>
          </form>
          {joinError && <p className={styles.error}>{joinError}</p>}
          <button className={styles.back} onClick={() => navigate('/servers')}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (!inRoom && room) {
    return (
      <div className={styles.page}>
        <p>Ожидание входа в комнату…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/servers')}>
          ← Назад
        </button>
        <h1 className={styles.title}>{room?.name ?? 'Покер'}</h1>
      </div>
      {room && (
        <GameTable
          room={room}
          myId={myId}
          onAction={(action, amount) => gameAction(roomId, action, amount)}
          onStart={() => startGame(roomId)}
          onRestart={() => restartRound(roomId)}
        />
      )}
    </div>
  );
}
