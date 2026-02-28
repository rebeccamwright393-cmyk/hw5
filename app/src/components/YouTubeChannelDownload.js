import { useState } from 'react';
import './YouTubeChannelDownload.css';

const CHANNEL_STORAGE_KEY = 'chatapp_channel_data';
const API = process.env.REACT_APP_API_URL || '';

export default function YouTubeChannelDownload({ onChannelLoaded, channelData }) {
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@veritasium');
  const [maxVideos, setMaxVideos] = useState(10);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleDownload = async () => {
    if (!channelUrl?.trim()) {
      setError('Please enter a channel URL');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: 0 });

    try {
      const res = await fetch(`${API}/api/youtube/download-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: channelUrl.trim(), maxVideos }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';
      let data = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'progress') {
              setProgress({ current: msg.current, total: msg.total });
            } else if (msg.type === 'done') {
              data = msg.data;
            } else if (msg.type === 'error') {
              throw new Error(msg.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (data) {
        setResult(data);
        const json = { videos: data.videos, channelTitle: data.channelTitle, channelUrl: data.channelUrl };
        localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(json));
        onChannelLoaded?.(json);
      } else {
        throw new Error('No data received');
      }
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadFile = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channel_${(result.channelTitle || 'data').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="youtube-download">
      <div className="youtube-download-card">
        <h2 className="youtube-download-title">YouTube Channel Download</h2>
        <p className="youtube-download-desc">
          Enter a YouTube channel URL to download video metadata (title, description, transcript, view count, etc.).
        </p>

        <div className="youtube-download-form">
          <label htmlFor="channel-url">Channel URL</label>
          <input
            id="channel-url"
            type="url"
            placeholder="https://www.youtube.com/@veritasium"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            disabled={loading}
          />

          <label htmlFor="max-videos">Max videos (1–100)</label>
          <input
            id="max-videos"
            type="number"
            min={1}
            max={100}
            value={maxVideos}
            onChange={(e) => setMaxVideos(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 10)))}
            disabled={loading}
          />

          <button
            type="button"
            className="youtube-download-btn"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? 'Downloading…' : 'Download Channel Data'}
          </button>
        </div>

        {loading && (
          <div className="youtube-progress-wrap">
            <div className="youtube-progress-bar">
              <div className="youtube-progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="youtube-progress-text">
              {progress.current} / {progress.total} videos
            </span>
          </div>
        )}

        {error && (
          <div className="youtube-error">
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="youtube-result">
            <p className="youtube-result-summary">
              Downloaded {result.totalVideos} videos from <strong>{result.channelTitle}</strong>.
            </p>
            <button type="button" className="youtube-download-file-btn" onClick={handleDownloadFile}>
              Download JSON file
            </button>
            <p className="youtube-result-hint">
              Data is also saved for use in Chat. Switch to the Chat tab to analyze it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
