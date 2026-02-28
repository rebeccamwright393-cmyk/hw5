import { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import './App.css';

function parseStoredUser() {
  const stored = localStorage.getItem('chatapp_user');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed === 'string') return { username: parsed, firstName: null, lastName: null };
    if (parsed?.username) return parsed;
    return null;
  } catch {
    return stored ? { username: stored, firstName: null, lastName: null } : null;
  }
}

function App() {
  const [user, setUser] = useState(parseStoredUser);

  const handleLogin = (userObj) => {
    const u = typeof userObj === 'string'
      ? { username: userObj, firstName: null, lastName: null }
      : userObj;
    localStorage.setItem('chatapp_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatapp_user');
    setUser(null);
  };

  if (user) {
    return <Chat user={user} onLogout={handleLogout} />;
  }
  return <Auth onLogin={handleLogin} />;
}

export default App;
