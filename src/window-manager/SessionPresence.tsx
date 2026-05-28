import React from 'react';
import { getClientId } from '../client-id';

/**
 * Opens a presence WebSocket so the server can log VR-session join/leave.
 * The connection itself carries no traffic — it exists purely so its
 * open and close events delimit a session in the server logs.
 *
 * Doubles as a kill-switch for immersive mode: if the socket dies
 * unexpectedly while the headset is in VR, drop back to the embedded
 * scene so the user isn't stranded without a working input path
 * (Alt+Q only lands if the keyboard relay is still connected).
 */
export const SessionPresence: React.FC = () => {
  React.useEffect(() => {
    const clientId = getClientId();
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${wsProtocol}//${location.host}/session/${clientId}`,
    );

    let intentionalClose = false;
    ws.addEventListener('close', () => {
      if (intentionalClose) return;
      const scene = document.querySelector('a-scene');
      if (scene?.is('vr-mode')) {
        void scene.exitVR();
      }
    });

    return () => {
      intentionalClose = true;
      ws.close();
    };
  }, []);
  return null;
};
