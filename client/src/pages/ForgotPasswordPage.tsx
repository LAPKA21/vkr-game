import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AuthPages.css';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при восстановлении пароля');
      }

      setMessage(data.message || 'Ссылка для сброса пароля успешно отправлена.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Сброс пароля</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {message ? (
          <div style={{ textAlign: 'center' }}>
            <div className="error-message" style={{ background: 'rgba(40,167,69,0.1)', borderColor: '#28a745', color: '#28a745' }}>
              {message}
            </div>
            <br />
            <Link to="/login">
              <button className="btn-primary" style={{ width: '100%' }}>Вернуться ко входу</button>
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleForgotPassword}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
              Введите ваш адрес электронной почты, и мы отправим вам ссылку для восстановления доступа к аккаунту.
            </p>
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
            
            <button className="btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Отправка...' : 'Получить ссылку'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          Вспомнили пароль? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
