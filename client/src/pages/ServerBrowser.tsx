import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRooms, createRoom, on, off } from '../services/socket';
import type { RoomListItem } from '../types';
import styles from './ServerBrowser.module.css';

export default function ServerBrowser() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');

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
      off('rooms:list');
      off('room:created');
    };
  }, [navigate]);

  const handleCreate = () => {
    if (!createName.trim()) return;
    setCreating(true);
    createRoom(createName.trim());
  };

  const handleJoin = (roomId: string) => {
    const name = prompt('Введите ваше имя:', 'Игрок') || 'Игрок';
    navigate(`/room/${roomId}`, { state: { playerName: name } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>
          ← Назад
        </button>
        <h1 className={styles.title}>Список серверов</h1>
      </div>
      <div className={styles.create}>
        <input
          type="text"
          placeholder="Название комнаты"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button onClick={handleCreate} disabled={creating || !createName.trim()}>
          {creating ? 'Создание…' : 'Создать сервер'}
        </button>
      </div>
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
    </div>
  );
}
