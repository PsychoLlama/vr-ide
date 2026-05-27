import React from 'react';
import type { RelayKeyEvent } from '../../keyboard-relay-protocol';
import {
  card,
  cardLabel,
  cardValue,
  captureHint,
  content,
  heading,
  lastKey,
  page,
  statusError,
  statusOk,
  statusWarn,
  subheading,
} from './KeyboardSender.css';

type ConnectionStatus =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'open' }
  | { kind: 'closed'; code: number; reason: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function describeKey(event: RelayKeyEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');
  parts.push(event.key === ' ' ? 'Space' : event.key);
  return parts.join('+');
}

function toRelayEvent(event: KeyboardEvent): RelayKeyEvent {
  return {
    key: event.key,
    code: event.code,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
  };
}

export const KeyboardSender: React.FC = () => {
  const target = React.useMemo(() => {
    // Same URL the WebSocket route lives at: target lives in the path.
    const match = /^\/keyboard\/([^/?#]+)/.exec(window.location.pathname);
    const raw = match?.[1];
    if (!raw || !UUID_RE.test(raw)) return null;
    return raw.toLowerCase();
  }, []);

  const [status, setStatus] = React.useState<ConnectionStatus>({
    kind: 'idle',
  });
  const [lastSent, setLastSent] = React.useState<string>('');
  const wsRef = React.useRef<WebSocket | null>(null);

  React.useEffect(() => {
    if (!target) return;

    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${wsProtocol}//${location.host}/keyboard/${target}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus({ kind: 'connecting' });

    ws.onopen = () => setStatus({ kind: 'open' });
    ws.onclose = (event) =>
      setStatus({
        kind: 'closed',
        code: event.code,
        reason: event.reason || 'no reason given',
      });
    ws.onerror = () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        setStatus({ kind: 'closed', code: 0, reason: 'connection failed' });
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [target]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      // Suppress the browser default so combos like Tab don't shift focus
      // away from the page and Backspace doesn't navigate back. Some
      // browser-reserved combos (Ctrl+T, F5, etc.) can't actually be
      // suppressed — those will still fire locally.
      event.preventDefault();
      const relayEvent = toRelayEvent(event);
      ws.send(JSON.stringify(relayEvent));
      setLastSent(describeKey(relayEvent));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const statusContent = renderStatus(status);

  return (
    <div className={page}>
      <div className={content}>
        <div>
          <h1 className={heading}>VR-IDE Keyboard Relay</h1>
          <p className={subheading}>
            Keys typed in this tab are forwarded to the headset, where Alt-
            combinations drive the window manager and everything else goes to
            the focused terminal — the same as typing locally in VR.
          </p>
        </div>

        <div className={card}>
          <div className={cardLabel}>Target client</div>
          <div className={cardValue}>
            {target ?? (
              <span className={statusError}>
                Missing or invalid UUID in path; expected{' '}
                <code>/keyboard/&lt;uuid&gt;</code>
              </span>
            )}
          </div>
        </div>

        <div className={card}>
          <div className={cardLabel}>Connection</div>
          <div className={cardValue}>{statusContent}</div>
        </div>

        <div className={card}>
          <div className={cardLabel}>Last key sent</div>
          <div className={lastKey}>{lastSent || '—'}</div>
          <div className={captureHint}>
            This tab must stay focused for keys to be captured.
          </div>
        </div>
      </div>
    </div>
  );
};

function renderStatus(status: ConnectionStatus) {
  switch (status.kind) {
    case 'idle':
      return <span className={statusWarn}>Waiting for target…</span>;
    case 'connecting':
      return <span className={statusWarn}>Connecting…</span>;
    case 'open':
      return <span className={statusOk}>Connected</span>;
    case 'closed':
      return (
        <span className={statusError}>
          Disconnected (code {status.code}): {status.reason}
        </span>
      );
  }
}
