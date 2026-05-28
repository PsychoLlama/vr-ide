import 'aframe';
import React from 'react';
import type { Scene } from 'aframe';
import { container } from './App.css';
import { installXrRafBridge } from './xr-raf-bridge';
import { mountVrCore } from '../../vr/mount';
import { WindowStore } from '../../vr/store';
import { Launcher } from '../launcher/Launcher';
import { KeyboardSender } from '../keyboard-sender/KeyboardSender';

export const App = () => {
  if (window.location.pathname.startsWith('/keyboard/')) {
    return <KeyboardSender />;
  }

  return <VrApp />;
};

const VrApp: React.FC = () => {
  const sceneRef = React.useRef<Scene | null>(null);
  const storeRef = React.useRef<WindowStore | null>(null);
  storeRef.current ??= new WindowStore();
  const store = storeRef.current;

  // Single imperative mount: bridge XR rAF, then spin up the VR core
  // (window manager + keyboard listener + relay socket + presence
  // socket). The teardown order matches mount order in reverse.
  React.useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    installXrRafBridge(scene);
    return mountVrCore(scene, store);
  }, [store]);

  return (
    <div className={container}>
      <a-scene embedded ref={sceneRef}>
        <a-sky color="#ECECEC" />
      </a-scene>
      <Launcher store={store} />
    </div>
  );
};
