import React from 'react';
import 'aframe';
import { container } from './App.css';
import {
  WindowManagerProvider,
  WindowRenderer,
  KeyboardHandler,
} from '../../window-manager';

export const App = () => {
  return (
    <div className={container}>
      <WindowManagerProvider>
        <a-scene embedded>
          <a-sky color="#ECECEC" />
          <WindowRenderer />
        </a-scene>
        <KeyboardHandler />
      </WindowManagerProvider>
    </div>
  );
};
