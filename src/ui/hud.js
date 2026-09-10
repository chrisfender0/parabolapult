// The in-game overlay: equation + answer input + Launch button, tries
// pips, target readout, and hit/miss feedback — entirely driven by
// GameController events. No game logic lives here; this only renders
// state and forwards player input via game.submit()/game.nextRound().

const MAX_TRIES = 3;
const HIT_ADVANCE_DELAY = 1400; // ms the success banner stays up before the next round starts
const SHAKE_DURATION = 400; // ms, must match the CSS animation below

/**
 * @param {HTMLElement} root
 * @param {import('../game/GameController.js').GameController} game
 * @returns {{ unmount: () => void }}
 */
export function mountHud(root, game) {
  const hud = document.createElement('div');
  hud.className = 'hud';

  const targetReadout = document.createElement('div');
  targetReadout.className = 'hud__target';
  hud.appendChild(targetReadout);

  const pipsRow = document.createElement('div');
  pipsRow.className = 'hud__pips';
  const pips = Array.from({ length: MAX_TRIES }, () => {
    const pip = document.createElement('span');
    pip.className = 'hud__pip';
    pipsRow.appendChild(pip);
    return pip;
  });
  hud.appendChild(pipsRow);

  const feedback = document.createElement('div');
  feedback.className = 'hud__feedback';
  feedback.hidden = true;
  hud.appendChild(feedback);

  const form = document.createElement('form');
  form.className = 'hud__equation-panel';

  const equationEl = document.createElement('div');
  equationEl.className = 'hud__equation';
  form.appendChild(equationEl);

  const launchButton = document.createElement('button');
  launchButton.type = 'submit';
  launchButton.className = 'hud__launch';
  launchButton.textContent = 'Launch';
  form.appendChild(launchButton);

  hud.appendChild(form);

  const roundOver = document.createElement('div');
  roundOver.className = 'hud__round-over';
  roundOver.hidden = true;
  const roundOverMessage = document.createElement('p');
  roundOverMessage.textContent = 'Out of tries';
  roundOver.appendChild(roundOverMessage);
  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'hud__continue';
  continueButton.textContent = 'Continue';
  roundOver.appendChild(continueButton);
  hud.appendChild(roundOver);

  root.appendChild(hud);

  let answerInput = null;
  let shakeTimeoutId = null;
  let advanceTimeoutId = null;

  function renderEquation(equation) {
    equationEl.replaceChildren();

    answerInput = document.createElement('input');
    answerInput.type = 'text';
    answerInput.inputMode = 'numeric';
    answerInput.pattern = '[0-9]*';
    answerInput.autocomplete = 'off';
    answerInput.size = 3;
    answerInput.className = 'hud__answer';
    // Belt-and-suspenders alongside the form's native submit-on-Enter —
    // some mobile numeric keypads send a bare Enter/Go keydown without it
    // reliably triggering the browser's default form submission.
    answerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') form.requestSubmit();
    });

    const appendTokens = (tokens) => {
      for (const token of tokens) {
        if (token.type === 'blank') {
          equationEl.appendChild(answerInput);
        } else {
          const span = document.createElement('span');
          span.className = 'hud__token';
          span.textContent = String(token.value);
          equationEl.appendChild(span);
        }
      }
    };

    appendTokens(equation.lhs);
    const eq = document.createElement('span');
    eq.className = 'hud__token';
    eq.textContent = '=';
    equationEl.appendChild(eq);
    appendTokens(equation.rhs);

    answerInput.focus();
  }

  function setPips(triesRemaining) {
    pips.forEach((pip, i) => {
      pip.classList.toggle('hud__pip--burnt', i >= triesRemaining);
    });
  }

  function showFeedback(message, kind) {
    feedback.textContent = message;
    feedback.className = `hud__feedback hud__feedback--${kind}`;
    feedback.hidden = false;
  }

  function hideFeedback() {
    feedback.hidden = true;
  }

  function setInputEnabled(enabled) {
    if (answerInput) answerInput.disabled = !enabled;
    launchButton.disabled = !enabled;
  }

  function shakeInput() {
    if (!answerInput) return;
    clearTimeout(shakeTimeoutId);
    answerInput.classList.remove('hud__answer--shake');
    // Force reflow so re-adding the class restarts the animation on repeat misses.
    void answerInput.offsetWidth;
    answerInput.classList.add('hud__answer--shake');
    shakeTimeoutId = setTimeout(() => answerInput?.classList.remove('hud__answer--shake'), SHAKE_DURATION);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!answerInput || answerInput.disabled) return;

    const value = answerInput.value.trim();
    if (value === '') return;

    hideFeedback();
    setInputEnabled(false);
    game.submit(value);
  }

  function handleRoundBegin({ equation, targetMarker, triesRemaining }) {
    clearTimeout(advanceTimeoutId);
    targetReadout.textContent = `Target: marker ${targetMarker}`;
    setPips(triesRemaining);
    hideFeedback();
    roundOver.hidden = true;
    renderEquation(equation);
    setInputEnabled(true);
  }

  function handleHit({ landedAt }) {
    setInputEnabled(false);
    showFeedback(`Nailed it — landed at ${landedAt}!`, 'hit');
    advanceTimeoutId = setTimeout(() => game.nextRound(), HIT_ADVANCE_DELAY);
  }

  function handleMiss({ landedAt, targetAt, triesRemaining }) {
    setPips(triesRemaining);
    showFeedback(`Landed at ${landedAt} — target was ${targetAt}`, 'miss');
    shakeInput();
    if (answerInput) answerInput.value = '';
    setInputEnabled(triesRemaining > 0);
    if (triesRemaining > 0) answerInput?.focus();
  }

  function handleRoundLost() {
    setInputEnabled(false);
    roundOver.hidden = false;
  }

  function handleContinue() {
    roundOver.hidden = true;
    game.nextRound();
  }

  form.addEventListener('submit', handleSubmit);
  continueButton.addEventListener('click', handleContinue);

  const unsubscribers = [
    game.on('round:begin', handleRoundBegin),
    game.on('try:hit', handleHit),
    game.on('try:miss', handleMiss),
    game.on('round:lost', handleRoundLost),
  ];

  function unmount() {
    clearTimeout(shakeTimeoutId);
    clearTimeout(advanceTimeoutId);
    form.removeEventListener('submit', handleSubmit);
    continueButton.removeEventListener('click', handleContinue);
    for (const off of unsubscribers) off();
    hud.remove();
  }

  return { unmount };
}
