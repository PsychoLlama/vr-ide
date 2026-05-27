import 'aframe';
import { container } from './App.css';
import {
  WindowManagerProvider,
  WindowRenderer,
  KeyboardHandler,
  KeyboardRelay,
  Launcher,
} from '../../window-manager';
import { KeyboardSender } from '../keyboard-sender/KeyboardSender';

export const App = () => {
  if (window.location.pathname.startsWith('/keyboard/')) {
    return <KeyboardSender />;
  }
  return (
    <div className={container}>
      <WindowManagerProvider>
        <a-scene embedded>
          <a-sky color="#ECECEC" />
          <WindowRenderer />
        </a-scene>
        <KeyboardHandler />
        <KeyboardRelay />
        <Launcher />
      </WindowManagerProvider>
    </div>
  );
};
