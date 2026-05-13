import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import styles from './Home.module.css';
import PostGamePopup, { PostGameStats } from '../components/PostGamePopup';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [botDifficulty, setBotDifficulty] = useState('NORMAL');
  const location = useLocation();
  const postGameStats = location.state?.postGameStats as PostGameStats | undefined;

  const closePopup = () => {
    navigate(location.pathname, { replace: true, state: {} });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          Стратегическая сетевая игра<br />
          на конечных автоматах
        </h1>
        <p className={styles.subtitle}>Техаский холдэм</p>
        
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

      {user && (
        <div className={styles.bottomLeftControls}>
          <button className={styles.profileBtn} onClick={() => navigate('/profile')}>
            👤 Профиль ({user.username})
          </button>
          <button className={styles.logoutBtnSmall} onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}
      <div className={styles.decor} aria-hidden />

      {postGameStats && <PostGamePopup stats={postGameStats} onClose={closePopup} />}
    </div>
  );
}
