// On-screen keypad for Parabolic mode's `ax + b` input. There's no <input>
// behind the blank it feeds — see hud.js's renderParabolicEquation — so the
// phone's own numeric/full keyboard never opens (a number pad has no `x`,
// and a full keyboard would cover half a 390x844 screen). This module only
// renders the physical keys and reports the text the player has built up;
// hud.js owns what that text means (parsing, display, submit).

const KEYS = [
  ['7', '8', '9', 'back'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['x', '0', 'clear', 'submit'],
];

const KEY_LABELS = {
  back: '⌫',
  clear: 'C',
  submit: 'Launch',
};

const MAX_LENGTH = 8;

/**
 * @param {HTMLElement} root
 * @param {{ onChange: (value: string) => void, onSubmit: () => void }} handlers
 * @returns {{
 *   setValue: (value: string) => void,
 *   clear: () => void,
 *   setDisabled: (disabled: boolean) => void,
 *   unmount: () => void,
 * }}
 */
export function mountKeypad(root, { onChange, onSubmit }) {
  let value = '';
  const buttons = [];

  const pad = document.createElement('div');
  pad.className = 'keypad';

  function setValue(next) {
    value = next.length > MAX_LENGTH ? next.slice(0, MAX_LENGTH) : next;
    onChange(value);
  }

  function pressKey(key) {
    if (key === 'back') {
      setValue(value.slice(0, -1));
    } else if (key === 'clear') {
      setValue('');
    } else if (key === 'submit') {
      onSubmit();
    } else if (value.length < MAX_LENGTH) {
      // The minus key is drawn as U+2212 but stored/typed as ASCII '-' —
      // parseLinear normalizes either one, this just keeps the internal
      // value plain-ASCII so it round-trips through form fields cleanly.
      setValue(value + (key === '−' ? '-' : key));
    }
  }

  for (const row of KEYS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'keypad__row';
    for (const key of row) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = key === 'submit' ? 'keypad__key keypad__key--submit' : 'keypad__key';
      button.textContent = KEY_LABELS[key] ?? key;
      // pointerdown rather than click — no ~300ms tap delay on mobile.
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        pressKey(key);
      });
      rowEl.appendChild(button);
      buttons.push(button);
    }
    pad.appendChild(rowEl);
  }

  root.appendChild(pad);

  // Physical keyboard support for desktop, per plan/13.1-parabolic-play.md.
  // Checked via offsetParent (null when the keypad or any ancestor is
  // display:none) rather than pad.hidden: hud.js hides the *ancestor*
  // panel when Classic mode is active, which never touches this element's
  // own `hidden` property, so that check silently stayed false forever —
  // meaning every digit typed into Classic's answer field also hit this
  // handler and got preventDefault()'d before it could reach the input.
  function handleKeydown(event) {
    if (pad.offsetParent === null || buttons[0]?.disabled) return;
    const key = event.key;
    if (/^[0-9]$/.test(key)) pressKey(key);
    else if (key.toLowerCase() === 'x') pressKey('x');
    else if (key === '+') pressKey('+');
    else if (key === '-') pressKey('−');
    else if (key === 'Backspace') pressKey('back');
    else if (key === 'Escape') pressKey('clear');
    else if (key === 'Enter') pressKey('submit');
    else return;
    event.preventDefault();
  }
  document.addEventListener('keydown', handleKeydown);

  function clear() {
    setValue('');
  }

  function setDisabled(disabled) {
    for (const button of buttons) button.disabled = disabled;
  }

  function unmount() {
    document.removeEventListener('keydown', handleKeydown);
    pad.remove();
  }

  return { setValue, clear, setDisabled, unmount };
}
