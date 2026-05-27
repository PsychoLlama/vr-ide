# VR IDE

Render floating terminals in a VR environment connected to a real machine over WebSockets.

> [!CAUTION]
> Completely vibed. It's purely an experiment to prove the concept.

## Purpose

Big displays are clunky. Laptops are clunky. The dream is strapping a giant monitor to my face and linking it to a keyboard.

This project explores APIs and the experience working inside a headset.

## Running

```sh
pnpm install
pnpm run dev
```

WebXR only runs on secure origins, so the headset can't reach `http://localhost`
across the network. Front the dev server with a TLS tunnel and open the HTTPS
URL in the headset's browser:

```sh
cloudflared tunnel --url http://localhost:5173
```

The dev server hosts the app and every WebSocket endpoint (`/pty`,
`/keyboard/...`, `/session/...`) on a single origin, so one tunnel covers
everything.

The first connection is rejected. Vite logs the client's UUID and the path to
`.authorized-clients.json` (project root by default) — add the ID there to
authorize the device:

```json
{ "clients": [{ "id": "<uuid>", "label": "optional" }] }
```

Set `VR_TRUST_ALL=1` on `pnpm run dev` to skip the allowlist (only safe for
purely local use).

## Features

### Terminal

Floating terminal windows rendered as 3D planes. Each terminal runs a real PTY session connected via WebSocket, with xterm.js handling rendering.

### Window Manager

Windows spawn where you're looking and can be repositioned freely in 3D space. A spotlight-style launcher (`Alt+Space`) provides quick access to apps.

### Keyboard Relay

A laptop tab can drive the headset. Open `/keyboard/<headset-client-id>` on the laptop; every keydown is shipped to the headset and dispatched through the same handler real keypresses go through. Alt-combinations trigger window-manager actions (`Alt+N` spawns a terminal at the gaze position, `Alt+W` closes the focused one, etc.), everything else goes to the focused terminal. The headset's client ID must be in `.authorized-clients.json` (the laptop tab itself doesn't need to be authorized — it's a dumb keyboard pipe, and `/pty` is already reachable to anyone holding the same UUID).

## Keybindings

| Key                   | Action                                     |
| --------------------- | ------------------------------------------ |
| `Alt+Space`           | Open launcher                              |
| `Alt+N` / `Alt+Enter` | New terminal at gaze position              |
| `Alt+W`               | Close focused window                       |
| `Alt+F`               | Focus the window under the gaze ray        |
| `Alt+M`               | Move window (toggle select/place mode)     |
| `Alt+Q`               | Exit immersive VR (back to embedded scene) |
| `Escape`              | Cancel move / close launcher               |

## Hardware

Only tested on a Meta Quest and my laptop's built-in browser. No idea whether it works on other headsets.
