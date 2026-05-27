/**
 * Wire format for the keyboard relay. The sender captures DOM
 * KeyboardEvents on the laptop, ships this subset over the WebSocket,
 * and the receiver in the headset feeds it back into `useKeyDispatcher`
 * — the same code path local keydown events take.
 *
 * Mirroring `KeyboardEvent` shape (rather than a custom one) means a
 * dispatched relay event is indistinguishable from a local one once it
 * lands in the dispatcher.
 */
export interface RelayKeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export function isRelayKeyEvent(value: unknown): value is RelayKeyEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.key === 'string' &&
    typeof v.code === 'string' &&
    typeof v.ctrlKey === 'boolean' &&
    typeof v.altKey === 'boolean' &&
    typeof v.shiftKey === 'boolean' &&
    typeof v.metaKey === 'boolean'
  );
}
