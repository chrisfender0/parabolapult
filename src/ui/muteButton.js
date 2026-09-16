import * as sfx from '../audio/sfx.js';

// Mounted once, straight onto document.body rather than #ui, so it
// survives screenManager's replaceChildren() on every screen switch —
// the same mute state and button need to sit in the same corner across
// Landing/Setup/Game/Result.
export function mountMuteButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mute-button';
  button.setAttribute('aria-label', 'Toggle sound');

  function render() {
    const muted = sfx.isMuted();
    button.textContent = muted ? '🔇' : '🔊';
    button.classList.toggle('mute-button--muted', muted);
    button.setAttribute('aria-pressed', String(muted));
  }

  button.addEventListener('click', () => {
    sfx.toggleMuted();
    render();
  });

  render();
  document.body.appendChild(button);
  return button;
}
