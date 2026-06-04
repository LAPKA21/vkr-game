import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './AuthPages.css';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const token = searchParams.get('token');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!token) {
      setError('Отсутствует токен восстановления пароля. Пожалуйста, запросите ссылку заново.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при восстановлении пароля');
      }

      setMessage(data.message || 'Пароль успешно изменен!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Новый пароль</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {!token ? (
          <div style={{ textAlign: 'center' }}>
            <div className="error-message">
              Токен восстановления отсутствует или недействителен.
            </div>
            <br />
            <Link to="/forgot-password">
              <button className="btn-primary" style={{ width: '100%' }}>Запросить сброс пароля</button>
            </Link>
          </div>
        ) : message ? (
          <div style={{ textAlign: 'center' }}>
            <div className="error-message" style={{ background: 'rgba(40,167,69,0.1)', borderColor: '#28a745', color: '#28a745' }}>
              {message}
            </div>
            <br />
            <Link to="/login">
              <button className="btn-primary" style={{ width: '100%' }}>Перейти к авторизации</button>
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
              Придумайте и введите новый сложный пароль для вашего аккаунта.
            </p>
            <div className="input-group">
              <label htmlFor="password">Новый пароль</label>
              <input 
                className="auth-input"
                type="password" 
                id="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Минимум 6 символов"
                required 
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="confirmPassword">Подтвердите пароль</label>
              <input 
                className="auth-input"
                type="password" 
                id="confirmPassword" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Повторите новый пароль"
                required 
              />
            </div>
            
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Обновить пароль'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          Вернуться к <Link to="/login">авторизации</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
