import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import styles from './Home.module.css';

const getRankName = (rating: number) => {
  if (rating < 1000) return 'Новичок';
  if (rating < 1200) return 'Любитель';
  if (rating < 1500) return 'Профи';
  return 'Грандмастер';
};

export default function Home() {
  const navigate = useNavigate();
  const { user, addChips, logout } = useAuth();
  const [botDifficulty, setBotDifficulty] = useState('NORMAL');
  const [isAdding, setIsAdding] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Стратегическая сетевая игра на конечных автоматах</h1>
        <p className={styles.subtitle}>Техаский холдэм</p>
        
        <div className={styles.mainArea}>
          {user && (
            <div className={styles.profilePanel}>
              <div className={styles.profileAvatar}>👤</div>
              <h3 className={styles.profileName}>{user.username}</h3>
              <p className={styles.profileEmail}>{user.email}</p>
              
              <div className={styles.profileStats}>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{user.chips}</div>
                  <div className={styles.statLabel}>Фишки</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValueGreen}>{user.rating ?? 1000}</div>
                  <div className={styles.statLabel}>Рейтинг</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{getRankName(user.rating ?? 1000)}</div>
                  <div className={styles.statLabel}>Ранг</div>
                </div>
              </div>

              <button 
                className={styles.addChipsBtn}
                disabled={isAdding}
                onClick={async () => {
                  setIsAdding(true);
                  await addChips(1000);
                  setIsAdding(false);
                }}
              >
                {isAdding ? 'Начисление...' : '🎁 Получить бесплатные фишки'}
              </button>

              <button className={styles.logoutBtn} onClick={handleLogout}>
                Выйти из аккаунта
              </button>
            </div>
          )}

          <div className={styles.buttons}>
            {!user ? (
              <>
                <button
                  className={styles.primary}
                  onClick={() => navigate('/login')}
                  style={{ marginBottom: '1.5rem', transform: 'scale(1.1)' }}
                >
                  Войти / Регистрация
                </button>

                <button className={styles.secondary} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  Играть онлайн
                </button>
                <button className={styles.secondary} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  Список игровых комнат
                </button>
                <div className={styles.trainingGroup} style={{ opacity: 0.5, pointerEvents: 'none' }}>
                  <select className={styles.select} disabled>
                    <option>Бот: Обычный (NORMAL)</option>
                  </select>
                  <button className={styles.secondary} disabled>
                    Обучение с ботом
                  </button>
                </div>
              </>
            ) : (
              <>
                <button className={styles.primary} onClick={() => navigate('/servers')}>
                  Играть онлайн
                </button>
                <button className={styles.secondary} onClick={() => navigate('/servers')}>
                  Список игровых комнат
                </button>

                <div className={styles.trainingGroup}>
                  <select
                    className={styles.select}
                    value={botDifficulty}
                    onChange={(e) => setBotDifficulty(e.target.value)}
                  >
                    <option value="EASY">Бот: Новичок (EASY)</option>
                    <option value="NORMAL">Бот: Обычный (NORMAL)</option>
                    <option value="HARD">Бот: Профи (HARD)</option>
                  </select>
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      const name = user?.username || 'Игрок';

                      import('../services/socket').then(({ createTrainingRoom, on, off }) => {
                        const handler = (data: {
                          roomId: string;
                          name?: string;
                        }) => {
                          console.log('Training room created:', data);
                          off('room:created', handler);
                          if (data.roomId) {
                            navigate(`/training/${data.roomId}`, { state: { playerName: name.trim() } });
                          }
                        };
                        on('room:created', handler);
                        createTrainingRoom('Обучение с ботом', botDifficulty);
                      });
                    }}
                  >
                    Обучение с ботом
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className={styles.decor} aria-hidden />
    </div>
  );
}
