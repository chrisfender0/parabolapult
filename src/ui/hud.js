// The in-game overlay: equation + answer input + Launch button, tries
// pips, target readout, and hit/miss feedback — entirely driven by
// GameController events. No game logic lives here; this only renders
// state and forwards player input via game.submit()/game.nextRound().

import { isDebugEnabled } from '../core/debugHooks.js';

const MAX_TRIES = 3;
const HIT_ADVANCE_DELAY = 1400; // ms the success banner stays up before the next round starts
const SHAKE_DURATION = 400; // ms, must match the CSS animation below
const BADGE_SYMBOLS = ['①', '②', '③'];
const LOCK_IN_DURATION = 550; // ms the neutral "Locked in" transition holds between hard-mode steps

// Builds the token spans (and places the given blank element where the
// equation's blank token sits) for either the main equation panel or a
// hard-mode step — both render the same { lhs, rhs } token shape from
// src/math/equations.js.
function appendEquationTokens(container, tokens, blankEl) {
  for (const token of tokens) {
    if (token.type === 'blank') {
      container.appendChild(blankEl);
    } else {
      const span = document.createElement('span');
      span.className = 'hud__token';
      span.textContent = String(token.value);
      container.appendChild(span);
    }
  }
}

/**
 * @param {HTMLElement} root
 * @param {import('../game/GameController.js').GameController} game
 * @returns {{ unmount: () => void }}
 */
export function mountHud(root, game) {
  const hud = document.createElement('div');
  hud.className = 'hud';

  const status = document.createElement('div');
  status.className = 'hud__status';
  hud.appendChild(status);

  // The target's position is something the player reads off the ruler
  // themselves — this readout only appears in debug mode (see
  // core/debugHooks.js), otherwise it would just hand over the answer.
  const targetReadout = document.createElement('div');
  targetReadout.className = 'hud__target';
  targetReadout.hidden = true;
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

  // Hard mode's timed memorization panel — a completely separate flow
  // from the equation panel above (no tries, no launch, no feedback).
  const hardPanel = document.createElement('div');
  hardPanel.className = 'hud__hard-panel';
  hardPanel.hidden = true;

  const hardBar = document.createElement('div');
  hardBar.className = 'hud__hard-bar';
  const hardBarFill = document.createElement('div');
  hardBarFill.className = 'hud__hard-bar-fill';
  hardBar.appendChild(hardBarFill);
  hardPanel.appendChild(hardBar);

  const hardForm = document.createElement('form');
  hardForm.className = 'hud__hard-form';

  const hardBadge = document.createElement('span');
  hardBadge.className = 'hud__hard-badge';
  hardForm.appendChild(hardBadge);

  const hardEquationEl = document.createElement('div');
  hardEquationEl.className = 'hud__equation';
  hardForm.appendChild(hardEquationEl);

  const hardLockButton = document.createElement('button');
  hardLockButton.type = 'submit';
  hardLockButton.className = 'hud__launch';
  hardLockButton.textContent = 'Lock In';
  hardForm.appendChild(hardLockButton);

  hardPanel.appendChild(hardForm);

  const hardLockedIn = document.createElement('div');
  hardLockedIn.className = 'hud__hard-locked-in';
  hardLockedIn.textContent = 'Locked in';
  hardLockedIn.hidden = true;
  hardPanel.appendChild(hardLockedIn);

  hud.appendChild(hardPanel);

  const roundOver = document.createElement('div');
  roundOver.className = 'hud__round-over';
  roundOver.hidden = true;
  const roundOverMessage = document.createElement('p');
  roundOverMessage.className = 'hud__round-over-title';
  roundOverMessage.textContent = 'Out of tries';
  roundOver.appendChild(roundOverMessage);
  const roundOverDetail = document.createElement('p');
  roundOverDetail.className = 'hud__round-over-detail';
  roundOver.appendChild(roundOverDetail);
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
  let lastLoss = null;
  let hardAnswerInput = null;
  let hardLockInTimeoutId = null;

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

    appendEquationTokens(equationEl, equation.lhs, answerInput);
    const eq = document.createElement('span');
    eq.className = 'hud__token';
    eq.textContent = '=';
    equationEl.appendChild(eq);
    appendEquationTokens(equationEl, equation.rhs, answerInput);

    answerInput.focus();
  }

  // Renders one hard-mode step immediately (equation, badge, colored
  // border, and a freshly-started countdown bar). Called directly for
  // the round's first step; every later step goes through the
  // "Locked in" pause in handleHardStep first.
  function renderHardStep({ badge, color, lhs, rhs, duration }) {
    hardPanel.className = `hud__hard-panel hud__hard-panel--${color}`;
    hardBadge.textContent = BADGE_SYMBOLS[badge - 1] ?? String(badge);
    hardForm.hidden = false;
    hardBar.hidden = false;
    hardLockedIn.hidden = true;

    hardEquationEl.replaceChildren();
    hardAnswerInput = document.createElement('input');
    hardAnswerInput.type = 'text';
    hardAnswerInput.inputMode = 'numeric';
    hardAnswerInput.pattern = '[0-9]*';
    hardAnswerInput.autocomplete = 'off';
    hardAnswerInput.size = 3;
    hardAnswerInput.className = 'hud__answer';
    // The countdown auto-submits whatever's typed when it hits 0, so the
    // controller needs the live value, not just what's submitted on Enter.
    hardAnswerInput.addEventListener('input', () => game.setHardPendingValue(hardAnswerInput.value));
    hardAnswerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') hardForm.requestSubmit();
    });

    appendEquationTokens(hardEquationEl, lhs, hardAnswerInput);
    const eq = document.createElement('span');
    eq.className = 'hud__token';
    eq.textContent = '=';
    hardEquationEl.appendChild(eq);
    appendEquationTokens(hardEquationEl, rhs, hardAnswerInput);

    // The bar's own dt-independent CSS transition is purely cosmetic —
    // HardSequence.update(dt) is the actual timing authority (see
    // game/HardSequence.js); this just needs to visually match its duration.
    hardBarFill.style.transition = 'none';
    hardBarFill.style.width = '100%';
    void hardBarFill.offsetWidth; // force reflow so the transition below restarts from 100%
    hardBarFill.style.transition = `width ${duration}s linear`;
    hardBarFill.style.width = '0%';

    hardAnswerInput.focus();
  }

  function showHardLockedIn(message = 'Locked in') {
    hardForm.hidden = true;
    hardLockedIn.textContent = message;
    hardLockedIn.hidden = false;
  }

  function resetHardPanel() {
    clearTimeout(hardLockInTimeoutId);
    hardForm.hidden = false;
    hardBar.hidden = false;
    hardLockedIn.hidden = true;
  }

  function handleHardStep(payload) {
    if (payload.index === 0) {
      renderHardStep(payload);
      return;
    }
    // A brief neutral pause between steps — no correctness hint either way.
    showHardLockedIn();
    clearTimeout(hardLockInTimeoutId);
    hardLockInTimeoutId = setTimeout(() => renderHardStep(payload), LOCK_IN_DURATION);
  }

  function handleHardComplete({ timeLeftTotal }) {
    // Session 10.1 picks up here to build and show the final equation;
    // for now, park in a neutral state and log what was recorded so the
    // sequence itself is verifiable end to end.
    console.log('[hard mode] sequence complete — timeLeftTotal:', timeLeftTotal);
    showHardLockedIn();
    clearTimeout(hardLockInTimeoutId);
    hardLockInTimeoutId = setTimeout(() => {
      hardBar.hidden = true;
      showHardLockedIn('All three memorized — final equation coming soon.');
    }, LOCK_IN_DURATION);
  }

  function handleHardSubmit(event) {
    event.preventDefault();
    if (!hardAnswerInput) return;
    game.submitHardStep(hardAnswerInput.value);
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

  function handleRoundBegin({ difficulty, equation, targetMarker, triesRemaining, round, totalRounds, score }) {
    clearTimeout(advanceTimeoutId);
    status.textContent = `Round ${round} / ${totalRounds} · Score: ${score}`;
    hideFeedback();
    roundOver.hidden = true;

    if (difficulty === 'hard') {
      // Hard mode's memorization phase has no tries/target/launch yet —
      // those only apply once session 10.1 adds the final equation.
      pipsRow.hidden = true;
      targetReadout.hidden = true;
      form.hidden = true;
      hardPanel.hidden = false;
      resetHardPanel();
      return;
    }

    pipsRow.hidden = false;
    form.hidden = false;
    hardPanel.hidden = true;
    if (isDebugEnabled()) {
      targetReadout.textContent = `Target: marker ${targetMarker}`;
      targetReadout.hidden = false;
    }
    setPips(triesRemaining);
    renderEquation(equation);
    setInputEnabled(true);
  }

  function handleScored({ totalScore }) {
    // Round number in the status line doesn't change until the next
    // round:begin — only the score needs to jump immediately.
    status.textContent = status.textContent.replace(/Score: \d+/, `Score: ${totalScore}`);
  }

  function handleHit({ landedAt }) {
    setInputEnabled(false);
    showFeedback(`Nailed it — landed at ${landedAt}!`, 'hit');
    advanceTimeoutId = setTimeout(() => game.nextRound(), HIT_ADVANCE_DELAY);
  }

  function handleMiss({ landedAt, targetAt, triesRemaining }) {
    setPips(triesRemaining);
    // Naming the target's position mid-round would hand over the answer
    // for the remaining retries — only reveal it once the round is
    // actually over (no tries left) or in debug mode.
    const revealTarget = triesRemaining === 0 || isDebugEnabled();
    const message = revealTarget ? `Landed at ${landedAt} — target was ${targetAt}` : `Landed at ${landedAt} — try again`;
    showFeedback(message, 'miss');
    shakeInput();
    if (answerInput) answerInput.value = '';
    setInputEnabled(triesRemaining > 0);
    if (triesRemaining > 0) answerInput?.focus();

    if (triesRemaining === 0) {
      // The "Out of tries" overlay covers the feedback line above, so
      // repeat the reveal there where it's actually legible.
      lastLoss = { landedAt, targetAt };
    }
  }

  function handleRoundLost() {
    if (lastLoss) {
      roundOverDetail.textContent = `You landed at ${lastLoss.landedAt} — the target was at ${lastLoss.targetAt}`;
    }
    setInputEnabled(false);
    roundOver.hidden = false;
  }

  function handleContinue() {
    roundOver.hidden = true;
    game.nextRound();
  }

  form.addEventListener('submit', handleSubmit);
  hardForm.addEventListener('submit', handleHardSubmit);
  continueButton.addEventListener('click', handleContinue);

  const unsubscribers = [
    game.on('round:begin', handleRoundBegin),
    game.on('round:scored', handleScored),
    game.on('try:hit', handleHit),
    game.on('try:miss', handleMiss),
    game.on('round:lost', handleRoundLost),
    game.on('hard:step', handleHardStep),
    game.on('hard:sequenceComplete', handleHardComplete),
  ];

  function unmount() {
    clearTimeout(shakeTimeoutId);
    clearTimeout(advanceTimeoutId);
    clearTimeout(hardLockInTimeoutId);
    form.removeEventListener('submit', handleSubmit);
    hardForm.removeEventListener('submit', handleHardSubmit);
    continueButton.removeEventListener('click', handleContinue);
    for (const off of unsubscribers) off();
    hud.remove();
  }

  return { unmount };
}
