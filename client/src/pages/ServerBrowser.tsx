import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listRooms, createRoom, on, off } from '../services/socket';
import { useAuth } from '../state/AuthContext';
import type { RoomListItem } from '../types';
import styles from './ServerBrowser.module.css';
import PostGamePopup, { PostGameStats } from '../components/PostGamePopup';

export default function ServerBrowser() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState('');
  const location = useLocation();
  const postGameStats = location.state?.postGameStats as PostGameStats | undefined;

  const closePopup = () => {
    navigate(location.pathname, { replace: true, state: {} });
  };

  useEffect(() => {
    listRooms();
    const handleList = (list: RoomListItem[]) => setRooms(list);
    const handleCreated = (data: { roomId: string }) => {
      setCreating(false);
      setCreateName('');
      navigate(`/room/${data.roomId}`);
    };
    on('rooms:list', handleList);
    on('room:created', handleCreated);
    return () => {
      off('rooms:list', handleList);
      off('room:created', handleCreated);
    };
  }, [navigate]);

  const handleCreate = () => {
    const trimmed = createName.trim();
    if (!trimmed) return;

    if (trimmed.length > 20) {
      setCreateError('Максимальная длина названия — 20 символов');
      return;
    }

    const isValid = /^[a-zA-Zа-яА-ЯёЁ0-9\s]+$/.test(trimmed);
    if (!isValid) {
      setCreateError('Разрешены только буквы, цифры и пробелы');
      return;
    }

    setCreateError('');
    setCreating(true);
    createRoom(trimmed);
  };

  const handleJoin = (roomId: string) => {
    const name = user?.username || 'Игрок';
    navigate(`/room/${roomId}`, { state: { playerName: name } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>
          ← Назад
        </button>
        <h1 className={styles.title}>Список игровых комнат</h1>
      </div>
      <div className={styles.create}>
        <input
          type="text"
          placeholder="Название комнаты"
          value={createName}
          onChange={(e) => {
            setCreateName(e.target.value);
            setCreateError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          maxLength={20}
        />
        <button onClick={handleCreate} disabled={creating || !createName.trim()}>
          {creating ? 'Создание…' : 'Создать игровую комнату'}
        </button>
      </div>
      {createError && (
        <div style={{ color: '#ef4444', marginBottom: '1.5rem', marginTop: '-1rem' }}>
          {createError}
        </div>
      )}
      <div className={styles.list}>
        <h2>Доступные комнаты</h2>
        {rooms.length === 0 ? (
          <p className={styles.empty}>Нет доступных комнат. Создайте свою.</p>
        ) : (
          <ul>
            {rooms.map((r) => (
              <li key={r.id} className={styles.roomRow}>
                <span className={styles.roomName}>{r.name}</span>
                <span className={styles.roomCount}>
                  {r.playerCount} / {r.maxPlayers}
                </span>
                <button onClick={() => handleJoin(r.id)}>Войти</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {postGameStats && <PostGamePopup stats={postGameStats} onClose={closePopup} />}
    </div>
  );
}
