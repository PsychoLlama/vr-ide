import React from 'react';
import { useWindowManager } from './WindowManagerContext';
import { useCameraDirection } from './hooks/useCameraDirection';

interface App {
  id: string;
  name: string;
  icon: string;
  action: () => void;
}

/**
 * Launcher provides a spotlight-style app launcher.
 * Shows a search input and filtered list of apps.
 */
export const Launcher: React.FC = () => {
  const { state, closeLauncher, createWindow } = useWindowManager();
  const getPlacement = useCameraDirection();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Define available apps
  const apps: App[] = React.useMemo(
    () => [
      {
        id: 'terminal',
        name: 'Terminal',
        icon: '>_',
        action: () => {
          const { position, rotation } = getPlacement();
          createWindow(position, rotation);
          closeLauncher();
        },
      },
    ],
    [createWindow, closeLauncher, getPlacement]
  );

  // Filter apps based on query
  const filteredApps = React.useMemo(() => {
    if (!query.trim()) return apps;
    const lowerQuery = query.toLowerCase();
    return apps.filter((app) => app.name.toLowerCase().includes(lowerQuery));
  }, [apps, query]);

  // Reset selection when filtered results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredApps.length]);

  // Focus input when launcher opens
  React.useEffect(() => {
    if (state.launcherOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay to ensure DOM is ready
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [state.launcherOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredApps.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (filteredApps[selectedIndex]) {
          filteredApps[selectedIndex].action();
        }
        break;
      case 'Escape':
        event.preventDefault();
        closeLauncher();
        break;
    }
  };

  if (!state.launcherOpen) return null;

  return (
    <div style={styles.overlay} onClick={closeLauncher}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search apps..."
          style={styles.input}
          autoFocus
        />
        <div style={styles.list}>
          {filteredApps.length === 0 ? (
            <div style={styles.empty}>No apps found</div>
          ) : (
            filteredApps.map((app, index) => (
              <div
                key={app.id}
                style={{
                  ...styles.item,
                  ...(index === selectedIndex ? styles.itemSelected : {}),
                }}
                onClick={() => app.action()}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span style={styles.icon}>{app.icon}</span>
                <span style={styles.name}>{app.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// OneDarkPro-inspired styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '20vh',
    zIndex: 9999,
  },
  container: {
    backgroundColor: '#282c34',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    width: '400px',
    maxWidth: '90vw',
    overflow: 'hidden',
    border: '1px solid #3e4451',
  },
  input: {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    backgroundColor: '#1e1e1e',
    border: 'none',
    borderBottom: '1px solid #3e4451',
    color: '#abb2bf',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  list: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    color: '#abb2bf',
    transition: 'background-color 0.1s',
  },
  itemSelected: {
    backgroundColor: '#3e4451',
    color: '#ffffff',
  },
  icon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61afef',
    borderRadius: '6px',
    marginRight: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1e1e1e',
    fontFamily: 'monospace',
  },
  name: {
    fontSize: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: '#5c6370',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};
