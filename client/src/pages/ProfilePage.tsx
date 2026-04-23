import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import './AuthPages.css';

const getRankName = (rating: number) => {
  if (rating < 1000) return 'Новичок';
  if (rating < 1200) return 'Любитель';
  if (rating < 1500) return 'Профи';
  return 'Грандмастер';
};

const ProfilePage: React.FC = () => {
  const { user, logout, addChips, isLoading } = useAuth();
  const [isAdding, setIsAdding] = React.useState(false);
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

        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '2rem 0', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
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
