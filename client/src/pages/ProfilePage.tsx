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
  
  // Берем последние 3 игры для анализа
  const recentMatches = user.botMatches.slice(0, 3);
  const totalGames = recentMatches.reduce((acc, m) => acc + m.gamesPlayed, 0);
  const totalChips = recentMatches.reduce((acc, m) => acc + m.chipsWon, 0);
  const lastDifficulty = recentMatches[0].botDifficulty;

  if (totalGames < 5 && recentMatches.length < 2) {
     return "Сыграйте еще пару сессий, чтобы ИИ мог дать точный совет.";
  }
  
  if (lastDifficulty === 'EASY') {
    if (totalChips > 0) return "Вы стабильно побеждаете новичка. Пора переходить на уровень NORMAL!";
    return "Продолжайте тренировки на уровне EASY. Пока рановато повышать сложность.";
  }
  if (lastDifficulty === 'NORMAL') {
    if (totalChips > 0) return "Вы отлично справляетесь с обычным ботом! Попробуйте свои силы против HARD.";
    return "Обычный бот дает отпор. Если тяжело, можете вернуться на EASY или продолжить тренировки.";
  }
  if (lastDifficulty === 'HARD') {
    if (totalChips > 0) return "Вы мастер! Вы обыгрываете профи-бота. Пора играть с реальными людьми!";
    return "Профи-бот сложен, но это лучшая тренировка. Анализируйте свои раздачи!";
  }
  
  return "Тренируйтесь и улучшайте свои навыки!";
}

interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'combinations' | 'rounds' | 'ranks' | 'chips';
}

const ACHIEVEMENTS_LIST: AchievementDef[] = [
  // Combinations (Сбор комбинаций)
  { key: 'comb_pair', title: 'Первая пара', description: 'Соберите комбинацию Пара', icon: '🤝', category: 'combinations' },
  { key: 'comb_twopair', title: 'Две пары', description: 'Соберите комбинацию Две пары', icon: '✌️', category: 'combinations' },
  { key: 'comb_trips', title: 'Тройной удар', description: 'Соберите сет (тройку)', icon: '🎯', category: 'combinations' },
  { key: 'comb_straight', title: 'Порядок во всём', description: 'Соберите стрит', icon: '📈', category: 'combinations' },
  { key: 'comb_flush', title: 'Одноцветный мир', description: 'Соберите флеш', icon: '🌈', category: 'combinations' },
  { key: 'comb_fullhouse', title: 'Полный дом', description: 'Соберите фулл-хаус', icon: '🏡', category: 'combinations' },
  { key: 'comb_quads', title: 'Каре!', description: 'Соберите каре', icon: '👑', category: 'combinations' },
  { key: 'comb_straightflush', title: 'Чистый блеск', description: 'Соберите стрит-флеш', icon: '⚡', category: 'combinations' },
  { key: 'comb_royalflush', title: 'Королевский флеш', description: 'Соберите легендарный Роял-флеш!', icon: '💎', category: 'combinations' },

  // Rounds (Раунды)
  { key: 'rounds_10', title: 'Покерный дебют', description: 'Сыграйте 10 раундов в игре', icon: '🃏', category: 'rounds' },
  { key: 'rounds_50', title: 'Завсегдатай клуба', description: 'Сыграйте 50 раундов в игре', icon: '🕶️', category: 'rounds' },
  { key: 'rounds_100', title: 'Акула покера', description: 'Сыграйте 100 раундов в игре', icon: '🦈', category: 'rounds' },

  // Ranks (Ранги)
  { key: 'rank_amateur', title: 'Серьёзный любитель', description: 'Достигните рейтинга 1000+', icon: '🥉', category: 'ranks' },
  { key: 'rank_pro', title: 'Настоящий профи', description: 'Достигните рейтинга 1200+', icon: '🥈', category: 'ranks' },
  { key: 'rank_grandmaster', title: 'Великий гроссмейстер', description: 'Достигните рейтинга 1500+', icon: '🥇', category: 'ranks' },
  { key: 'rank_legend', title: 'Легенда покера', description: 'Достигните рейтинга 1800+', icon: '🏆', category: 'ranks' },

  // Chips (Скопленные фишки)
  { key: 'chips_5k', title: 'Начальный капитал', description: 'Накопите баланс в 5 000 фишек', icon: '💰', category: 'chips' },
  { key: 'chips_25k', title: 'Успешный игрок', description: 'Накопите баланс в 25 000 фишек', icon: '💼', category: 'chips' },
  { key: 'chips_100k', title: 'Золотой сейф', description: 'Накопите баланс в 100 000 фишек', icon: '🏦', category: 'chips' },
  { key: 'chips_1m', title: 'Покерный олигарх', description: 'Накопите баланс в 1 000 000 фишек!', icon: '💸', category: 'chips' },
];

const ProfilePage: React.FC = () => {
  const { user, logout, addChips, updateSettings, isLoading } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'combinations' | 'rounds' | 'ranks' | 'chips'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSendEmail = async () => {
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/send-stats-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setEmailStatus('✅ Отчет успешно отправлен на вашу почту!');
      } else {
        setEmailStatus(`❌ Ошибка: ${data.error || 'Не удалось отправить письмо'}`);
      }
    } catch (e) {
      console.error(e);
      setEmailStatus('❌ Сетевая ошибка при отправке отчета');
    } finally {
      setSendingEmail(false);
    }
  };

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
      <div className="profile-wrapper">
        <div className="auth-card" style={{ width: '100%', maxWidth: '500px', flex: '1 1 400px' }}>
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

        <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0.5rem' }}>Настройки</h4>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#fff' }}>
            <input 
              type="checkbox" 
              checked={user.showHints ?? true} 
              onChange={(e) => updateSettings({ showHints: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }}
            />
            Показывать подсказки комбинаций в игре
          </label>
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

        <div className="auth-card" style={{ width: '100%', maxWidth: '500px', flex: '1 1 400px' }}>
          <h2 className="auth-title">Рекомендации с ИИ</h2>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
              💡 Совет: {getRecommendation(user)}
            </p>
            
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1.5rem' }}>
              <button
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #c9a227 0%, #a8841f 100%)',
                  color: '#0c1a12',
                  boxShadow: '0 4px 15px rgba(201, 162, 39, 0.4)',
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
                disabled={sendingEmail}
                onClick={handleSendEmail}
              >
                {sendingEmail ? 'Отправка отчета...' : '📧 Отправить отчет и рекомендации на почту'}
              </button>
              {emailStatus && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.85rem', 
                  color: emailStatus.includes('успешно') ? '#4ade80' : '#f87171',
                  textAlign: 'center'
                }}>
                  {emailStatus}
                </div>
              )}
            </div>
            
            {user.botMatches && user.botMatches.length > 0 ? (
              <div className="history-slider">
                {user.botMatches.map((match, index) => (
                  <div key={match.id} className="history-card">
                    <h5 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>
                      {index === 0 ? 'Последняя игра' : new Date(match.createdAt).toLocaleDateString('ru-RU')}
                    </h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Сложность:</span>
                      <span style={{ color: 'var(--accent-gold)' }}>{match.botDifficulty}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Стиль (ваш):</span>
                      <span style={{ color: '#4ade80' }}>
                        {match.opponentStyle === 'AGGRESSIVE' ? 'Агрессор' : 
                         match.opponentStyle === 'TIGHT' ? 'Осторожный' : 'Нормальный'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Партий:</span>
                      <span style={{ color: '#fff' }}>{match.gamesPlayed}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Баланс:</span>
                      <span style={{ color: match.chipsWon >= 0 ? '#4ade80' : '#ef4444' }}>
                        {match.chipsWon > 0 ? '+' : ''}{match.chipsWon}
                      </span>
                    </div>
                    
                    {match.botLogs && match.botLogs.length > 0 && (
                      <div style={{ marginTop: 'auto' }}>
                        <button 
                          onClick={() => setExpandedLogId(expandedLogId === match.id ? null : match.id)}
                          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.5rem', width: '100%', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}
                        >
                          {expandedLogId === match.id ? 'Скрыть логи' : 'Показать логи бота'}
                        </button>
                        {expandedLogId === match.id && (
                          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', fontSize: '0.75rem', color: '#ccc' }}>
                            {match.botLogs.map((log, idx) => (
                              <div key={idx} style={{ marginBottom: '0.2rem' }}>{log}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
               <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Нет данных о играх с ботом.</p>
            )}
          </div>
        </div>

        <div className="auth-card" style={{ width: '100%', maxWidth: '1020px', flex: '1 1 100%', marginTop: '1rem' }}>
          <h2 className="auth-title" style={{ marginBottom: '1.5rem' }}>🏆 Ваши достижения</h2>
          
          <div className="achievements-tabs">
            <button 
              className={`achievement-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Все ({user.achievements?.length ?? 0}/{ACHIEVEMENTS_LIST.length})
            </button>
            <button 
              className={`achievement-tab ${activeTab === 'combinations' ? 'active' : ''}`}
              onClick={() => setActiveTab('combinations')}
            >
              🃏 Комбинации
            </button>
            <button 
              className={`achievement-tab ${activeTab === 'rounds' ? 'active' : ''}`}
              onClick={() => setActiveTab('rounds')}
            >
              🔄 Активность
            </button>
            <button 
              className={`achievement-tab ${activeTab === 'ranks' ? 'active' : ''}`}
              onClick={() => setActiveTab('ranks')}
            >
              📈 Рейтинг
            </button>
            <button 
              className={`achievement-tab ${activeTab === 'chips' ? 'active' : ''}`}
              onClick={() => setActiveTab('chips')}
            >
              💰 Фишки
            </button>
          </div>

          <div className="achievements-grid">
            {ACHIEVEMENTS_LIST.filter(
              (ach) => activeTab === 'all' || ach.category === activeTab
            ).map((ach) => {
              const unlocked = user.achievements?.find((ua) => ua.key === ach.key);
              return (
                <div 
                  key={ach.key} 
                  className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="achievement-icon">{ach.icon}</div>
                  <h4 className="achievement-card-title">{ach.title}</h4>
                  <p className="achievement-card-desc">{ach.description}</p>
                  
                  {unlocked ? (
                    <span className="achievement-date">
                      🎉 Получено {new Date(unlocked.unlockedAt).toLocaleDateString('ru-RU')}
                    </span>
                  ) : (
                    <span className="achievement-lock-badge">
                      🔒 Заблокировано
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
