/**
 * Converts a browser KeyboardEvent into the byte sequence a PTY-backed
 * terminal expects on stdin (control chars, ANSI cursor sequences, etc).
 *
 * Returns null when the event shouldn't be forwarded — e.g. an Alt-
 * combination, which the in-headset KeyboardHandler reserves for window
 * commands. Sender pages should suppress those too so they don't leak
 * accidental shortcuts to the headset.
 */
export function keyEventToInput(event: {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
}): string | null {
  const { key, ctrlKey, altKey } = event;

  if (ctrlKey) {
    const char = key.toLowerCase();
    if (char.length === 1 && char >= 'a' && char <= 'z') {
      return String.fromCharCode(char.charCodeAt(0) - 96);
    }
    switch (char) {
      case '[':
        return '\x1b';
      case '\\':
        return '\x1c';
      case ']':
        return '\x1d';
      case '^':
        return '\x1e';
      case '_':
        return '\x1f';
    }
  }

  if (altKey) {
    return null;
  }

  switch (key) {
    case 'Enter':
      return '\r';
    case 'Backspace':
      return '\x7f';
    case 'Tab':
      return '\t';
    case 'Escape':
      return '\x1b';
    case 'ArrowUp':
      return '\x1b[A';
    case 'ArrowDown':
      return '\x1b[B';
    case 'ArrowRight':
      return '\x1b[C';
    case 'ArrowLeft':
      return '\x1b[D';
    case 'Home':
      return '\x1b[H';
    case 'End':
      return '\x1b[F';
    case 'PageUp':
      return '\x1b[5~';
    case 'PageDown':
      return '\x1b[6~';
    case 'Delete':
      return '\x1b[3~';
    case 'Insert':
      return '\x1b[2~';
  }

  if (key.length === 1) {
    return key;
  }

  return null;
}
