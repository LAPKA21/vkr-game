import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Многопользовательский покер</h1>
        <p className={styles.subtitle}>Техаский холдэм</p>
        <div className={styles.buttons}>
          <button className={styles.primary} onClick={() => navigate('/servers')}>
            Играть онлайн
          </button>
          <button className={styles.secondary} onClick={() => navigate('/servers')}>
            Список серверов
          </button>
          <button
            className={styles.secondary}
            onClick={() => {
              const name = prompt('Введите имя для режима обучения:', 'Игрок');
              // Если пользователь нажал «Отмена» или оставил пустую строку — ничего не делаем
              if (!name || !name.trim()) return;

              import('../services/socket').then(({ createTrainingRoom, on, off }) => {
                const handler = (data: {
                  roomId: string;
                  name?: string;
                  playerCount?: number;
                  maxPlayers?: number;
                  isTraining?: boolean;
                }) => {
                  console.log('Training room created:', data);
                  off('room:created');
                  if (data.roomId) {
                    navigate(`/training/${data.roomId}`, { state: { playerName: name.trim() } });
                  } else {
                    console.error('No roomId in room:created event');
                  }
                };
                on('room:created', handler);
                createTrainingRoom('Обучение с ботом');
              });
            }}
          >
            Обучение с ботом
          </button>
        </div>
      </div>
      <div className={styles.decor} aria-hidden />
    </div>
  );
}
