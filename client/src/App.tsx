import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './state/AuthContext';
import Home from './pages/Home';
import ServerBrowser from './pages/ServerBrowser';
import GameRoom from './pages/GameRoom';
import TrainingRoom from './pages/TrainingRoom';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Загрузка...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/servers" element={<ProtectedRoute><ServerBrowser /></ProtectedRoute>} />
      <Route path="/room/:roomId" element={<ProtectedRoute><GameRoom /></ProtectedRoute>} />
      <Route path="/training/:roomId" element={<ProtectedRoute><TrainingRoom /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
