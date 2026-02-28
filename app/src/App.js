import { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import YouTubeChannelDownload from './components/YouTubeChannelDownload';
import './App.css';

const CHANNEL_STORAGE_KEY = 'chatapp_channel_data';

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

function parseStoredChannel() {
  try {
    const stored = localStorage.getItem(CHANNEL_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState(parseStoredUser);
  const [channelData, setChannelData] = useState(parseStoredChannel);
  const [activeTab, setActiveTab] = useState('chat');

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

  const handleChannelLoaded = (data) => {
    setChannelData(data);
    if (data) localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(CHANNEL_STORAGE_KEY);
  };

  const handleSetChannelData = (dataOrUpdater) => {
    const next = typeof dataOrUpdater === 'function' ? dataOrUpdater(channelData) : dataOrUpdater;
    setChannelData(next);
    if (next) localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(CHANNEL_STORAGE_KEY);
  };

  if (user) {
    return (
      <div className="app-post-login">
        <div className="app-tabs">
          <button
            type="button"
            className={`app-tab${activeTab === 'chat' ? ' active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button
            type="button"
            className={`app-tab${activeTab === 'youtube' ? ' active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            YouTube Channel Download
          </button>
        </div>
        <div className="app-tab-content">
          {activeTab === 'chat' ? (
            <Chat
              user={user}
              onLogout={handleLogout}
              channelData={channelData}
              setChannelData={handleSetChannelData}
            />
          ) : (
            <YouTubeChannelDownload
              onChannelLoaded={handleChannelLoaded}
              channelData={channelData}
            />
          )}
        </div>
      </div>
    );
  }
  return <Auth onLogin={handleLogin} />;
}

export default App;
