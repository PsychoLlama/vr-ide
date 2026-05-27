import React from 'react';
import { getClientId } from '../client-id';
import { isRelayKeyEvent } from '../keyboard-relay-protocol';
import { useKeyDispatcher } from './useKeyDispatcher';

/**
 * Subscribes to the keyboard relay broker at `/keyboard/<own-clientId>`
 * and feeds incoming events into the same dispatcher the local
 * KeyboardHandler uses. From the dispatcher's point of view a remote
 * keypress is indistinguishable from a local one — so Alt+N from the
 * laptop spawns a window, plain typing goes to the focused terminal,
 * etc.
 */
export const KeyboardRelay: React.FC = () => {
  const dispatch = useKeyDispatcher();

  // Stash dispatch in a ref so the WebSocket effect can stay mounted
  // across state changes without reopening the connection.
  const dispatchRef = React.useRef(dispatch);
  React.useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  React.useEffect(() => {
    const clientId = getClientId();
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${wsProtocol}//${location.host}/keyboard/${clientId}`;
    const ws = new WebSocket(url);

    ws.onmessage = (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!isRelayKeyEvent(parsed)) return;
      dispatchRef.current(parsed);
    };

    return () => ws.close();
  }, []);

  return null;
};
