import 'aframe';
import React from 'react';
import type { Scene } from 'aframe';
import { container } from './App.css';
import { installXrRafBridge } from './xr-raf-bridge';
import {
  WindowManagerProvider,
  KeyboardHandler,
  KeyboardRelay,
  Launcher,
  SessionPresence,
  useWindowManager,
  useCameraDirection,
} from '../../window-manager';
import { WindowManager } from '../../vr/window-manager';
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
          <SceneWindows sceneRef={sceneRef} />
        </a-scene>
        <KeyboardHandler />
        <KeyboardRelay />
        <SessionPresence />
        <Launcher />
      </WindowManagerProvider>
    </div>
  );
};

interface SceneWindowsProps {
  sceneRef: React.RefObject<Scene | null>;
}

/**
 * Bridge between the React provider and the imperative VR core. Spins
 * up a `WindowManager` once the scene element exists and tears it down
 * on unmount. Renders nothing — all entities are appended directly to
 * the scene by the manager.
 */
const SceneWindows: React.FC<SceneWindowsProps> = ({ sceneRef }) => {
  const { store, registerTerminal, unregisterTerminal } = useWindowManager();
  const getPlacement = useCameraDirection();

  React.useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const manager = new WindowManager({
      parent: scene,
      store,
      getSelectPlacement: getPlacement,
      registerTerminal,
      unregisterTerminal,
    });
    manager.start();

    return () => manager.stop();
  }, [sceneRef, store, getPlacement, registerTerminal, unregisterTerminal]);

  return null;
};
