import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { CanvasAddon } from '@xterm/addon-canvas';
import type { THREE as ThreeLib } from 'aframe';
import { isServerMessage } from '../pty-protocol';
import { getClientId } from '../client-id';
import { HIDDEN_PX_PER_COL, HIDDEN_PX_PER_ROW } from './sizing';

declare const THREE: typeof ThreeLib;

const TERMINAL_BG = '#1e1e1e';

const TERMINAL_THEME = {
  background: TERMINAL_BG,
  foreground: '#abb2bf',
  cursor: '#ffffff',
  cursorAccent: '#1e1e1e',
  selectionBackground: '#3e4451',
  selectionForeground: '#1e1e1e',
  black: '#1e1e1e',
  red: '#e06c75',
  green: '#98c379',
  yellow: '#e5c07b',
  blue: '#61afef',
  magenta: '#c678dd',
  cyan: '#56b6c2',
  white: '#abb2bf',
  brightBlack: '#3e4451',
  brightRed: '#ff7a85',
  brightGreen: '#a8d389',
  brightYellow: '#f0d08b',
  brightBlue: '#71bfff',
  brightMagenta: '#d688ed',
  brightCyan: '#66c6d2',
  brightWhite: '#ffffff',
};

export interface TerminalControllerOptions {
  /**
   * Unique identifier for this terminal, used only for log prefixes.
   */
  windowId: string;
  /**
   * Initial grid size. xterm boots at this dimension and the off-screen
   * host is sized to fit.
   */
  cols: number;
  rows: number;
  /**
   * Fires synchronously the moment the Three.js texture is first created
   * (before the WebSocket starts connecting). Use this to bind the
   * texture to a material so the plane stops showing its default colour
   * during the WS handshake.
   */
  onTextureReady?: (texture: ThreeLib.CanvasTexture) => void;
  /**
   * Fires once the PTY WebSocket is open and ready for input.
   */
  onReady?: () => void;
  /**
   * Called when the PTY process exits on the server.
   */
  onExit?: (exitCode: number) => void;
}

/**
 * Owns one xterm.js terminal: the hidden DOM host, the PTY WebSocket, the
 * canvas composite, and the Three.js texture sourced from it. Lifecycle is
 * driven by the caller — `new` to start, `dispose()` to tear everything
 * down. Apply `getTexture()` to whichever Three material you want.
 */
export class TerminalController {
  private readonly windowId: string;
  private readonly onTextureReady?: (texture: ThreeLib.CanvasTexture) => void;
  private readonly onReady?: () => void;
  private readonly onExit?: (exitCode: number) => void;

  private readonly container: HTMLDivElement;
  private readonly terminal: Terminal;
  private socket: WebSocket | null = null;
  private texture: ThreeLib.CanvasTexture | null = null;
  private composite: (() => void) | null = null;
  private rafId = 0;
  private disposed = false;

  constructor(options: TerminalControllerOptions) {
    this.windowId = options.windowId;
    this.onTextureReady = options.onTextureReady;
    this.onReady = options.onReady;
    this.onExit = options.onExit;

    // xterm needs a real DOM host to lay out its canvas. We park it
    // off-screen and inert so it stays invisible and untabbable, but
    // still measures correctly.
    this.container = document.createElement('div');
    this.container.dataset.windowId = this.windowId;
    this.container.inert = true;
    Object.assign(this.container.style, {
      position: 'fixed',
      width: `${options.cols * HIDDEN_PX_PER_COL}px`,
      height: `${options.rows * HIDDEN_PX_PER_ROW}px`,
      left: '0',
      top: '0',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(this.container);

    this.terminal = new Terminal({
      cursorBlink: false,
      cursorStyle: 'block',
      cursorInactiveStyle: 'block',
      cols: options.cols,
      rows: options.rows,
      fontSize: 16,
      fontFamily: 'monospace',
      allowTransparency: false,
      theme: TERMINAL_THEME,
    });

    this.terminal.loadAddon(new FitAddon());
    this.terminal.open(this.container);
    this.terminal.loadAddon(new CanvasAddon());

    // Cursor still renders correctly without focus thanks to
    // cursorInactiveStyle='block'. The container is `inert` anyway, so
    // calling terminal.focus() would no-op. All input arrives through
    // sendInput(), not xterm's helper textarea.

    this.terminal.onData((data) => {
      this.send({ type: 'input', data });
    });

    this.terminal.onResize(({ cols, rows }) => {
      this.send({ type: 'resize', cols, rows });
    });

    this.rafId = requestAnimationFrame(this.initTexture);
  }

  /**
   * Send a raw input string to the PTY (already-encoded keystrokes).
   */
  sendInput(data: string): void {
    this.send({ type: 'input', data });
  }

  /**
   * Resize the underlying xterm grid. Triggers xterm's `onResize`,
   * which forwards a `resize` message to the PTY server — SIGWINCH
   * follows from there. The off-screen host is grown to match so xterm's
   * canvas can lay out at the new dimensions; the composite loop picks
   * up the larger canvas on its next tick.
   */
  setSize(cols: number, rows: number): void {
    if (this.terminal.cols === cols && this.terminal.rows === rows) return;
    this.container.style.width = `${cols * HIDDEN_PX_PER_COL}px`;
    this.container.style.height = `${rows * HIDDEN_PX_PER_ROW}px`;
    this.terminal.resize(cols, rows);
  }

  /**
   * The Three.js texture sourced from the composited xterm canvas.
   * Null until the initial texture init has run; check `onReady` first.
   */
  getTexture(): ThreeLib.CanvasTexture | null {
    return this.texture;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.socket?.close();
    this.terminal.dispose();
    this.container.remove();
  }

  private send(message: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private initTexture = (): void => {
    if (this.disposed) return;

    // xterm 5.x creates one or more canvas layers inside its host.
    // Wait until at least one exists before sampling it.
    const canvases = Array.from(this.container.querySelectorAll('canvas'));
    if (canvases.length === 0) {
      this.rafId = requestAnimationFrame(this.initTexture);
      return;
    }

    const mainCanvas = canvases.reduce((largest, canvas) =>
      canvas.width * canvas.height > largest.width * largest.height
        ? canvas
        : largest,
    );

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = mainCanvas.width;
    compositeCanvas.height = mainCanvas.height;
    const ctx = compositeCanvas.getContext('2d')!;

    const compositeCanvases = () => {
      // Re-sample on each tick: xterm's canvas pixel dimensions grow
      // after `terminal.resize()`, and CanvasAddon may add or replace
      // layer canvases over time. Caching the array from initTexture
      // would leave us drawing into a stale-sized buffer after a
      // resize.
      const layers = Array.from(this.container.querySelectorAll('canvas'));
      if (layers.length === 0) return;
      const main = layers.reduce((largest, canvas) =>
        canvas.width * canvas.height > largest.width * largest.height
          ? canvas
          : largest,
      );
      if (compositeCanvas.width !== main.width) {
        compositeCanvas.width = main.width;
      }
      if (compositeCanvas.height !== main.height) {
        compositeCanvas.height = main.height;
      }
      // Fill with the theme background instead of clearing to
      // transparent. xterm's CanvasAddon redraws dirty cells
      // incrementally, so a layer can be momentarily transparent
      // where a cell is mid-update; the opaque fill keeps those
      // regions dark instead of flashing the a-sky through the plane.
      ctx.fillStyle = TERMINAL_BG;
      ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
      layers.forEach((canvas) => {
        ctx.drawImage(canvas, 0, 0);
      });
    };

    compositeCanvases();

    const texture = new THREE.CanvasTexture(compositeCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    this.texture = texture;
    this.composite = compositeCanvases;

    // Fire onTextureReady before connecting so callers can bind the
    // texture to their material immediately, matching the pre-refactor
    // behaviour where the plane was never visible without its terminal
    // texture.
    this.onTextureReady?.(texture);

    this.connectWebSocket();
    this.tickTexture();
  };

  private tickTexture = (): void => {
    if (this.disposed) return;
    if (this.texture) {
      this.composite?.();
      this.texture.needsUpdate = true;
    }
    this.rafId = requestAnimationFrame(this.tickTexture);
  };

  private connectWebSocket(): void {
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${wsProtocol}//${location.host}/pty?clientId=${getClientId()}`,
    );
    this.socket = ws;

    ws.onopen = () => {
      console.log(`[${this.windowId}] Connected to PTY server`);
      this.send({
        type: 'resize',
        cols: this.terminal.cols,
        rows: this.terminal.rows,
      });
      this.onReady?.();
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg: unknown = JSON.parse(event.data);
        if (!isServerMessage(msg)) {
          console.warn(
            `[${this.windowId}] Received invalid message from server`,
          );
          return;
        }
        switch (msg.type) {
          case 'output':
            this.terminal.write(msg.data);
            break;
          case 'exit':
            this.terminal.writeln(
              `\r\n[Process exited with code ${msg.exitCode}]`,
            );
            this.onExit?.(msg.exitCode);
            break;
        }
      } catch (err) {
        console.error(`[${this.windowId}] Failed to parse message:`, err);
      }
    };

    ws.onclose = () => {
      console.log(`[${this.windowId}] Disconnected from PTY server`);
      this.terminal.writeln('\r\n[Connection closed]');
    };

    ws.onerror = (err) => {
      console.error(`[${this.windowId}] WebSocket error:`, err);
      this.terminal.writeln(
        '\r\n[Connection error - is the PTY server running?]',
      );
    };
  }
}
