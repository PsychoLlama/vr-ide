import React from 'react';
import { getClientId } from '../client-id';

/**
 * Opens a presence WebSocket so the server can log VR-session join/leave.
 * The connection itself carries no traffic — it exists purely so its
 * open and close events delimit a session in the server logs.
 */
export const SessionPresence: React.FC = () => {
  React.useEffect(() => {
    const clientId = getClientId();
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${wsProtocol}//${location.host}/session/${clientId}`,
    );
    return () => ws.close();
  }, []);
  return null;
};
