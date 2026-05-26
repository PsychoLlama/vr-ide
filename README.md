# VR IDE

An experimental development environment built for virtual reality. This project explores what coding might look like in an immersive 3D space using A-Frame and WebXR.

> **Note:** This is an experiment. Expect rough edges.

## Running

Start the PTY server and dev server:

```sh
pnpm install
pnpm run pty &
pnpm run dev
```

Then open the URL in a WebXR-compatible browser.

## Features

### Terminal

Floating terminal windows rendered as 3D planes. Each terminal runs a real PTY session connected via WebSocket, with xterm.js handling rendering.

### Window Manager

Windows spawn where you're looking and can be repositioned freely in 3D space. A spotlight-style launcher (`Alt+Space`) provides quick access to apps.

## Keybindings

| Key | Action |
|-----|--------|
| `Alt+Space` | Open launcher |
| `Alt+N` / `Alt+Enter` | New terminal at gaze position |
| `Alt+W` | Close focused window |
| `Alt+M` | Move window (toggle select/place mode) |
| `Escape` | Cancel move / close launcher |
