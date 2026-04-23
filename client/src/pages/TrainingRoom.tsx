import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { joinRoom, leaveRoom, on, off, startGame, gameAction, restartRound } from '../services/socket';
import { socket } from '../services/socket';
import GameTable from '../components/GameTable';
import type { RoomState } from '../types';
import styles from './GameRoom.module.css';

export default function TrainingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myId, setMyId] = useState<string | null>(socket.id ?? null);
  const [playerName, setPlayerName] = useState('');
  const [joinError, setJoinError] = useState('');
  const joined = useRef(false);

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
      leaveRoom(); // Очищаем сервер от этой комнаты
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const stateName = (location.state as { playerName?: string })?.playerName;
    if (stateName) {
      setPlayerName(stateName);
      if (!joined.current) {
        joined.current = true;
        console.log('Auto-joining training room:', roomId, 'as', stateName);
        joinRoom(roomId, stateName);
      }
    }
  }, [roomId, location.state]);

  useEffect(() => {
    if (!roomId) return;
    const handleJoined = (r: RoomState) => {
      console.log('Room joined:', r);
      setRoom(r);
    };
    const handleState = (r: RoomState & { winners?: number[] }) => {
      console.log('Game state:', r);
      setRoom(r);
    };
    const handleUpdated = (r: RoomState) => {
      console.log('Room updated:', r);
      setRoom(r);
    };
    const handleError = (data: { message: string }) => {
      console.error('Socket error:', data);
      setJoinError(data.message);
    };
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
    joinRoom(roomId, name);
  };

  const inRoom = Boolean(myId && room && room.players.some((p) => p.id === myId));

  if (joined.current && !room) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Подключение…</p>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className={styles.page}>
        <p>Режим обучения: комната не указана.</p>
        <button onClick={() => navigate('/')}>На главную</button>
      </div>
    );
  }

  if (!inRoom && !room) {
    return (
      <div className={styles.page}>
        <div className={styles.join}>
          <h1>Режим обучения с ботом</h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button type="submit">Играть</button>
          </form>
          {joinError && <p className={styles.error}>{joinError}</p>}
          <button className={styles.back} onClick={() => navigate('/')}>
            ← На главную
          </button>
        </div>
      </div>
    );
  }

  if (!myId) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Подключение…</p>
      </div>
    );
  }

  if (!inRoom && room) {
    return (
      <div className={styles.page}>
        <p>Ожидание входа…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>
          ← На главную
        </button>
        <h1 className={styles.title}>Обучение с ботом</h1>
      </div>
      {room && (
        <GameTable
          room={room}
          myId={myId}
          onAction={(action, amount) => gameAction(roomId, action, amount)}
          onStart={() => startGame(roomId)}
          onRestart={() => restartRound(roomId)}
          isTraining
        />
      )}
    </div>
  );
}
