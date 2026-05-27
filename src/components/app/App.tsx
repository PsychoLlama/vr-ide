import 'aframe';
import React from 'react';
import type { Scene } from 'aframe';
import { container } from './App.css';
import { installXrRafBridge } from './xr-raf-bridge';
import {
  WindowManagerProvider,
  WindowRenderer,
  KeyboardHandler,
  KeyboardRelay,
  Launcher,
  SessionPresence,
} from '../../window-manager';
import { KeyboardSender } from '../keyboard-sender/KeyboardSender';

export const App = () => {
  const sceneRef = React.useRef<Scene | null>(null);

  React.useEffect(() => {
    if (sceneRef.current) {
      installXrRafBridge(sceneRef.current);
    }
  }, []);

  if (window.location.pathname.startsWith('/keyboard/')) {
    return <KeyboardSender />;
  }

  return (
    <div className={container}>
      <WindowManagerProvider>
        <a-scene embedded ref={sceneRef}>
          <a-sky color="#ECECEC" />
          <WindowRenderer />
        </a-scene>
        <KeyboardHandler />
        <KeyboardRelay />
        <SessionPresence />
        <Launcher />
      </WindowManagerProvider>
    </div>
  );
};
