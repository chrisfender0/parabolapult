// Minimal event emitter used across game/UI modules.
export class Emitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }
}
