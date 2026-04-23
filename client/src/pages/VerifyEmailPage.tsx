import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './AuthPages.css';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Проверка токена...');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Отсутствует токен подтверждения');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Почта успешно подтверждена! Теперь вы можете войти в аккаунт.');
        } else {
          throw new Error(data.error || 'Неверный или просроченный токен');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2 className="auth-title">Подтверждение почты</h2>
        
        {status === 'loading' && <div style={{color: 'var(--text-muted)'}}>{message}</div>}
        
        {status === 'success' && (
          <div>
            <div className="error-message" style={{ background: 'rgba(40,167,69,0.1)', borderColor: '#28a745', color: '#28a745' }}>
              {message}
            </div>
            <br />
            <Link to="/login">
              <button className="btn-primary">Перейти к окну входа</button>
            </Link>
          </div>
        )}
        
        {status === 'error' && (
          <div>
            <div className="error-message">{message}</div>
            <br />
            <Link to="/register">
              <button className="btn-primary" style={{background: 'var(--bg-table)', color: '#fff'}}>Вернуться к регистрации</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
