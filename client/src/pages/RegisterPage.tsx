import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthPages.css';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при регистрации');
      }

      setSuccess('Регистрация успешна! Проверьте свою почту для подтверждения аккаунта.');
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Создать аккаунт</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="error-message" style={{ background: 'rgba(40,167,69,0.1)', borderColor: '#28a745', color: '#28a745' }}>{success}</div>}
        
        <form className="auth-form" onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input 
              className="auth-input"
              type="email" 
              id="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="player@example.com"
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="username">Имя пользователя (Никнейм)</label>
            <input 
              className="auth-input"
              type="text" 
              id="username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="CoolPlayer"
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Пароль</label>
            <input 
              className="auth-input"
              type="password" 
              id="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          
          <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
