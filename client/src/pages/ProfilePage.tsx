import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, User } from '../state/AuthContext';
import './AuthPages.css';

const getRankName = (rating: number) => {
  if (rating < 1000) return 'Новичок';
  if (rating < 1200) return 'Любитель';
  if (rating < 1500) return 'Профи';
  return 'Грандмастер';
};

const getRecommendation = (user: User) => {
  if (!user.botMatches || user.botMatches.length === 0) {
    return "Сыграйте с ботом уровня EASY, чтобы мы могли оценить ваш навык.";
  }
  const lastMatch = user.botMatches[0];
  const { botDifficulty, chipsWon, gamesPlayed } = lastMatch;
  if (gamesPlayed === 0) return "Сыграйте хотя бы одну партию до конца.";
  
  if (botDifficulty === 'EASY' && chipsWon > 0) {
    return "Отлично! Вы победили новичка. Рекомендуем перейти на уровень NORMAL.";
  }
  if (botDifficulty === 'EASY' && chipsWon <= 0) {
    return "Продолжайте тренировки на уровне EASY, пока не начнете стабильно выигрывать.";
  }
  if (botDifficulty === 'NORMAL' && chipsWon > 0) {
    return "Вы отлично справляетесь с обычным ботом. Пора бросить вызов профи (уровень HARD)!";
  }
  if (botDifficulty === 'NORMAL' && chipsWon <= 0) {
    return "Обычный бот оказался не прост. Попробуйте еще раз или спуститесь на EASY.";
  }
  if (botDifficulty === 'HARD' && chipsWon > 0) {
    return "Вы мастер! Вы обыграли профи-бота. Вы готовы к онлайн-игре с реальными людьми!";
  }
  return "Тренировка с профи — отличная практика. Продолжайте в том же духе!";
}

const ProfilePage: React.FC = () => {
  const { user, logout, addChips, isLoading } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="auth-container"><h2 className="auth-title">Загрузка...</h2></div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ width: '100%', maxWidth: '500px' }}>
        <h2 className="auth-title">Ваш профиль</h2>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            width: '100px', height: '100px', background: 'rgba(201, 162, 39, 0.2)', 
            borderRadius: '50%', margin: '0 auto 1rem', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
            border: '2px solid var(--accent-gold)'
          }}>
            👤
          </div>
          <h3 style={{ margin: '0.5rem 0', color: '#fff' }}>{user.username}</h3>
          <p style={{ color: 'var(--text-muted)' }}>{user.email}</p>
        </div>

        <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0.5rem' }}>Текущий статус</h4>
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '0 0 1.5rem 0', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{user.chips}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Фишки</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: 'bold' }}>{user.rating ?? 1000}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Рейтинг</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>{getRankName(user.rating ?? 1000)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ранг</div>
          </div>
        </div>

        <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0.5rem' }}>Статистика</h4>
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '0 0 2rem 0', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#f8fafc', fontWeight: 'bold' }}>{user.totalGamesPlayed ?? 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Партий сыграно</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#4ade80', fontWeight: 'bold' }}>{user.totalChipsWon ?? 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Всего выиграно</div>
          </div>
        </div>

        <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0.5rem' }}>Аналитика игры с ИИ</h4>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
            💡 Совет: {getRecommendation(user)}
          </p>
          
          {user.botMatches && user.botMatches.length > 0 ? (
            <div>
              <h5 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>Последняя игра</h5>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Сложность:</span>
                <span style={{ color: 'var(--accent-gold)' }}>{user.botMatches[0].botDifficulty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Выявленный стиль (ваш):</span>
                <span style={{ color: '#4ade80' }}>
                  {user.botMatches[0].opponentStyle === 'AGGRESSIVE' ? 'Агрессор' : 
                   user.botMatches[0].opponentStyle === 'TIGHT' ? 'Осторожный' : 'Нормальный'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Сыграно партий:</span>
                <span style={{ color: '#fff' }}>{user.botMatches[0].gamesPlayed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Изменение баланса:</span>
                <span style={{ color: user.botMatches[0].chipsWon >= 0 ? '#4ade80' : '#ef4444' }}>
                  {user.botMatches[0].chipsWon > 0 ? '+' : ''}{user.botMatches[0].chipsWon}
                </span>
              </div>
              
              {user.botMatches[0].botLogs && user.botMatches[0].botLogs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <button 
                    onClick={() => setExpandedLogId(expandedLogId === user.botMatches![0].id ? null : user.botMatches![0].id)}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.5rem', width: '100%', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {expandedLogId === user.botMatches[0].id ? 'Скрыть логи бота' : 'Показать логи бота (размышления)'}
                  </button>
                  {expandedLogId === user.botMatches[0].id && (
                    <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto', fontSize: '0.8rem', color: '#ccc' }}>
                      {user.botMatches[0].botLogs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: '0.2rem' }}>{log}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
             <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Нет данных о играх с ботом.</p>
          )}
        </div>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <button 
            className="btn-primary" 
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              color: 'white', 
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            disabled={isAdding}
            onClick={async () => {
              setIsAdding(true);
              await addChips(1000);
              setIsAdding(false);
            }}
          >
            {isAdding ? 'Начисление...' : '🎁 Получить бесплатные фишки (+1000)'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>На главную</button>
          <button className="btn-primary" style={{ flex: 1, background: 'rgba(220, 53, 69, 0.2)', color: '#ff8795' }} onClick={handleLogout}>Выйти</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
