import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ServerBrowser from './pages/ServerBrowser';
import GameRoom from './pages/GameRoom';
import TrainingRoom from './pages/TrainingRoom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/servers" element={<ServerBrowser />} />
      <Route path="/room/:roomId" element={<GameRoom />} />
      <Route path="/training/:roomId" element={<TrainingRoom />} />
    </Routes>
  );
}

export default App;
