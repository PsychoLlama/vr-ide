import React from 'react';
import { useWindowManager } from './WindowManagerContext';

/**
 * BrowserWindow provides a sandboxed browser overlay.
 * No permissions are granted to the iframe - it's fully isolated.
 */
export const BrowserWindow: React.FC = () => {
  const { state, closeBrowser } = useWindowManager();
  const [url, setUrl] = React.useState('https://example.com');
  const [inputValue, setInputValue] = React.useState('https://example.com');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when browser opens
  React.useEffect(() => {
    if (state.browserOpen) {
      setTimeout(() => inputRef.current?.select(), 10);
    }
  }, [state.browserOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newUrl = inputValue.trim();
    // Add https:// if no protocol specified
    if (newUrl && !newUrl.match(/^https?:\/\//)) {
      newUrl = 'https://' + newUrl;
    }
    setUrl(newUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeBrowser();
    }
  };

  if (!state.browserOpen) return null;

  return (
    <div style={styles.overlay} onKeyDown={handleKeyDown}>
      <div style={styles.container}>
        {/* Title bar */}
        <div style={styles.titleBar}>
          <span style={styles.title}>Browser</span>
          <button style={styles.closeButton} onClick={closeBrowser}>
            ✕
          </button>
        </div>

        {/* URL bar */}
        <form onSubmit={handleSubmit} style={styles.urlBarContainer}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter URL..."
            style={styles.urlInput}
          />
          <button type="submit" style={styles.goButton}>
            Go
          </button>
        </form>

        {/* Sandboxed iframe - no permissions granted */}
        <iframe
          src={url}
          style={styles.iframe}
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
          title="Browser"
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  container: {
    width: '90vw',
    height: '85vh',
    maxWidth: '1400px',
    backgroundColor: '#282c34',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #3e4451',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#21252b',
    borderBottom: '1px solid #3e4451',
  },
  title: {
    color: '#abb2bf',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 500,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#abb2bf',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.1s',
  },
  urlBarContainer: {
    display: 'flex',
    padding: '8px',
    gap: '8px',
    backgroundColor: '#1e1e1e',
    borderBottom: '1px solid #3e4451',
  },
  urlInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '14px',
    backgroundColor: '#282c34',
    border: '1px solid #3e4451',
    borderRadius: '4px',
    color: '#abb2bf',
    outline: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  goButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#61afef',
    border: 'none',
    borderRadius: '4px',
    color: '#1e1e1e',
    cursor: 'pointer',
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  iframe: {
    flex: 1,
    border: 'none',
    backgroundColor: '#ffffff',
  },
};
