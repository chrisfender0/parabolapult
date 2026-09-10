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

  // Hard mode's final phase, part 1: recall. Three blank inputs, badged
  // and colored to the equation each came from, operators shown fixed —
  // the player has to type the numbers back from memory. Nothing here
  // is checked for correctness; whatever they type becomes *their*
  // equation for the solve step next.
  const hardRecallForm = document.createElement('form');
  hardRecallForm.className = 'hud__hard-final-form';
  hardRecallForm.hidden = true;

  const hardRecallBar = document.createElement('div');
  hardRecallBar.className = 'hud__hard-bar';
  const hardRecallBarFill = document.createElement('div');
  hardRecallBarFill.className = 'hud__hard-bar-fill hud__hard-bar-fill--final';
  hardRecallBar.appendChild(hardRecallBarFill);
  hardRecallForm.appendChild(hardRecallBar);

  const hardRecallRow = document.createElement('div');
  hardRecallRow.className = 'hud__hard-final-row';
  hardRecallForm.appendChild(hardRecallRow);

  hud.appendChild(hardRecallForm);

  // Part 2: solve. The equation now shows what they just typed (right
  // or wrong) with the operators, and they have to work out and type
  // the result themselves — that's the actual launch, still timed.
  const hardSolveForm = document.createElement('form');
  hardSolveForm.className = 'hud__hard-final-form';
  hardSolveForm.hidden = true;

  const hardSolveBar = document.createElement('div');
  hardSolveBar.className = 'hud__hard-bar';
  const hardSolveBarFill = document.createElement('div');
  hardSolveBarFill.className = 'hud__hard-bar-fill hud__hard-bar-fill--final';
  hardSolveBar.appendChild(hardSolveBarFill);
  hardSolveForm.appendChild(hardSolveBar);

  const hardSolveRow = document.createElement('div');
  hardSolveRow.className = 'hud__hard-final-row';
  hardSolveForm.appendChild(hardSolveRow);

  hud.appendChild(hardSolveForm);

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
  let lastLossDetail = ''; // text shown on the "Out of tries" overlay — set by whichever path actually lost the round
  let hardAnswerInput = null;
  let hardLockInTimeoutId = null;
  let hardRecallInputs = [];
  let hardSolveAnswerInput = null;
  let hardJustFailed = false; // true right after a mini-equation failure, until the retry's step 0 renders

  // Whichever panel is currently "launchable" — the normal equation
  // panel, or hard mode's final equation — hit/miss/tries/feedback all
  // operate generically over these rather than a single hardcoded input.
  let activeInputs = [];
  let activeLaunchButton = launchButton;

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

    activeInputs = [answerInput];
    activeLaunchButton = launchButton;

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

  function showHardLockedIn(message = 'Locked in', variant = 'neutral') {
    hardForm.hidden = true;
    hardLockedIn.textContent = message;
    hardLockedIn.className = `hud__hard-locked-in hud__hard-locked-in--${variant}`;
    hardLockedIn.hidden = false;
  }

  function resetHardPanel() {
    clearTimeout(hardLockInTimeoutId);
    hardForm.hidden = false;
    hardBar.hidden = false;
    hardLockedIn.hidden = true;
  }

  function handleHardStep(payload) {
    if (payload.index === 0 && !hardJustFailed) {
      renderHardStep(payload);
      return;
    }
    // Either the normal step-to-step pause, or (if hardJustFailed) this
    // is the retry's first equation — the "Not quite" message from
    // handleHardMiniMiss is already showing, so just hold it a beat
    // longer rather than stepping on it with the neutral one.
    if (!hardJustFailed) showHardLockedIn();
    hardJustFailed = false;
    clearTimeout(hardLockInTimeoutId);
    hardLockInTimeoutId = setTimeout(() => renderHardStep(payload), LOCK_IN_DURATION);
  }

  function handleHardMiniMiss({ triesRemaining, badge }) {
    setPips(triesRemaining);
    hardJustFailed = true;
    clearTimeout(hardLockInTimeoutId);
    showHardLockedIn('Not quite — try again', 'miss');

    if (triesRemaining === 0) {
      const symbol = BADGE_SYMBOLS[badge - 1] ?? badge;
      lastLossDetail = `Equation ${symbol} tripped you up`;
    }
  }

  // Restarts a countdown bar — called on first render of a phase, and
  // again on a retry, so the clock always starts fresh at 100%.
  function restartBar(fillEl, duration) {
    fillEl.style.transition = 'none';
    fillEl.style.width = '100%';
    void fillEl.offsetWidth; // force reflow so the transition below restarts from 100%
    fillEl.style.transition = `width ${duration}s linear`;
    fillEl.style.width = '0%';
  }

  // Final phase, part 1: three blank inputs — badge/color only, no
  // numbers shown. The player has to type back what they remember;
  // nothing here is checked, whatever they submit becomes their own
  // equation for the solve step.
  function renderHardRecall({ ops, steps, duration }) {
    hardRecallRow.replaceChildren();
    hardRecallInputs = [];

    steps.forEach((step, i) => {
      const badge = document.createElement('span');
      badge.className = `hud__hard-badge hud__hard-badge--${step.color}`;
      badge.textContent = BADGE_SYMBOLS[step.badge - 1] ?? String(step.badge);
      hardRecallRow.appendChild(badge);

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
      input.autocomplete = 'off';
      input.size = 2;
      input.className = `hud__answer hud__hard-final-input hud__hard-final-input--${step.color}`;
      input.addEventListener('input', () => game.setHardRecallPendingValue(i, input.value));
      hardRecallRow.appendChild(input);
      hardRecallInputs.push(input);

      if (i < steps.length - 1) {
        const opSpan = document.createElement('span');
        opSpan.className = 'hud__token';
        opSpan.textContent = ops[i];
        hardRecallRow.appendChild(opSpan);
      }
    });

    hardRecallInputs.forEach((input, i) => {
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (i < hardRecallInputs.length - 1) hardRecallInputs[i + 1].focus();
        else hardRecallForm.requestSubmit();
      });
    });

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'hud__launch';
    submitButton.textContent = 'Remember';
    hardRecallRow.appendChild(submitButton);

    restartBar(hardRecallBarFill, duration);

    hardSolveForm.hidden = true;
    hardRecallForm.hidden = false;
    hardRecallInputs[0].focus();
  }

  function handleHardRecallSubmit(event) {
    event.preventDefault();
    if (hardRecallInputs.some((el) => el.disabled)) return;

    const values = hardRecallInputs.map((el) => el.value.trim());
    if (values.some((value) => value === '')) return;

    game.submitHardRecall(values);
  }

  // Final phase, part 2: the equation with their recalled numbers
  // plugged in (right or wrong) — they have to actually work it out and
  // type the result. This is the real, launchable step.
  function renderHardSolve({ values, ops, steps, duration }) {
    hardSolveRow.replaceChildren();

    steps.forEach((step, i) => {
      const badge = document.createElement('span');
      badge.className = `hud__hard-badge hud__hard-badge--${step.color}`;
      badge.textContent = BADGE_SYMBOLS[step.badge - 1] ?? String(step.badge);
      hardSolveRow.appendChild(badge);

      const value = document.createElement('span');
      value.className = `hud__token hud__hard-final-value hud__hard-final-value--${step.color}`;
      value.textContent = String(values[i]);
      hardSolveRow.appendChild(value);

      if (i < steps.length - 1) {
        const opSpan = document.createElement('span');
        opSpan.className = 'hud__token';
        opSpan.textContent = ops[i];
        hardSolveRow.appendChild(opSpan);
      }
    });

    const eq = document.createElement('span');
    eq.className = 'hud__token';
    eq.textContent = '=';
    hardSolveRow.appendChild(eq);

    hardSolveAnswerInput = document.createElement('input');
    hardSolveAnswerInput.type = 'text';
    hardSolveAnswerInput.inputMode = 'numeric';
    hardSolveAnswerInput.pattern = '[0-9]*';
    hardSolveAnswerInput.autocomplete = 'off';
    hardSolveAnswerInput.size = 3;
    hardSolveAnswerInput.className = 'hud__answer';
    hardSolveAnswerInput.addEventListener('input', () => game.setHardSolvePendingValue(hardSolveAnswerInput.value));
    hardSolveAnswerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') hardSolveForm.requestSubmit();
    });
    hardSolveRow.appendChild(hardSolveAnswerInput);

    const launchBtn = document.createElement('button');
    launchBtn.type = 'submit';
    launchBtn.className = 'hud__launch';
    launchBtn.textContent = 'Launch';
    hardSolveRow.appendChild(launchBtn);

    activeInputs = [hardSolveAnswerInput];
    activeLaunchButton = launchBtn;

    restartBar(hardSolveBarFill, duration);

    hardRecallForm.hidden = true;
    hardSolveForm.hidden = false;
    hardSolveAnswerInput.focus();
  }

  function handleHardSolveSubmit(event) {
    event.preventDefault();
    if (!hardSolveAnswerInput || hardSolveAnswerInput.disabled) return;

    const value = hardSolveAnswerInput.value.trim();
    if (value === '') return;

    hideFeedback();
    setInputEnabled(false);
    game.submitHardFinal(value);
  }

  function handleHardSequenceComplete(payload) {
    // The full recorded sequence — never shown on screen, but this is
    // exactly the "console shows the recorded answers" verification the
    // plan asks for. hard:recall (fired right after this by
    // GameController) is what actually renders anything.
    console.log('[hard mode] sequence complete —', payload);
  }

  function handleHardRecall(payload) {
    if (isDebugEnabled()) {
      targetReadout.textContent = `Target: marker ${payload.targetMarker}`;
      targetReadout.hidden = false;
    }

    // The mini-equations panel is only ever visible the first time
    // through — a retry (after a solve miss) starts from here directly,
    // so there's nothing to pause on besides the miss feedback already
    // showing (see handleMiss).
    const isFirstEntry = !hardPanel.hidden;
    if (isFirstEntry) showHardLockedIn();
    clearTimeout(hardLockInTimeoutId);
    hardLockInTimeoutId = setTimeout(() => {
      hardPanel.hidden = true;
      pipsRow.hidden = false;
      renderHardRecall(payload);
    }, LOCK_IN_DURATION);
  }

  function handleHardSolve(payload) {
    renderHardSolve(payload);
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

  // Generic over whichever panel is currently launchable — the normal
  // single equation, or hard mode's three-input final equation.
  function setInputEnabled(enabled) {
    for (const input of activeInputs) input.disabled = !enabled;
    activeLaunchButton.disabled = !enabled;
  }

  function clearActiveInputs() {
    for (const input of activeInputs) input.value = '';
  }

  function focusFirstActiveInput() {
    activeInputs[0]?.focus();
  }

  function shakeActiveInputs() {
    clearTimeout(shakeTimeoutId);
    for (const input of activeInputs) {
      input.classList.remove('hud__answer--shake');
    }
    // Force reflow so re-adding the class restarts the animation on repeat misses.
    if (activeInputs[0]) void activeInputs[0].offsetWidth;
    for (const input of activeInputs) {
      input.classList.add('hud__answer--shake');
    }
    shakeTimeoutId = setTimeout(() => {
      for (const input of activeInputs) input.classList.remove('hud__answer--shake');
    }, SHAKE_DURATION);
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
    lastLossDetail = '';

    if (difficulty === 'hard') {
      // Hard mode's memorization phase has no tries/target/launch yet —
      // those only apply once the final phase starts, after
      // hard:sequenceComplete.
      pipsRow.hidden = true;
      targetReadout.hidden = true;
      form.hidden = true;
      hardRecallForm.hidden = true;
      hardSolveForm.hidden = true;
      hardPanel.hidden = false;
      hardJustFailed = false;
      resetHardPanel();
      setPips(triesRemaining); // pre-set so it's already correct once pipsRow reappears
      return;
    }

    pipsRow.hidden = false;
    form.hidden = false;
    hardPanel.hidden = true;
    hardRecallForm.hidden = true;
    hardSolveForm.hidden = true;
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
    shakeActiveInputs();
    clearActiveInputs();
    setInputEnabled(triesRemaining > 0);
    if (triesRemaining > 0) focusFirstActiveInput();
    // A hard-mode retry replays the whole recall+solve final phase —
    // GameController emits hard:recall right after this, which renders
    // fresh inputs and its own timer (see handleHardRecall).

    if (triesRemaining === 0) {
      // The "Out of tries" overlay covers the feedback line above, so
      // repeat the reveal there where it's actually legible.
      lastLossDetail = `You landed at ${landedAt} — the target was at ${targetAt}`;
    }
  }

  function handleRoundLost() {
    roundOverDetail.textContent = lastLossDetail;
    setInputEnabled(false);
    roundOver.hidden = false;
  }

  function handleContinue() {
    roundOver.hidden = true;
    game.nextRound();
  }

  form.addEventListener('submit', handleSubmit);
  hardForm.addEventListener('submit', handleHardSubmit);
  hardRecallForm.addEventListener('submit', handleHardRecallSubmit);
  hardSolveForm.addEventListener('submit', handleHardSolveSubmit);
  continueButton.addEventListener('click', handleContinue);

  const unsubscribers = [
    game.on('round:begin', handleRoundBegin),
    game.on('round:scored', handleScored),
    game.on('try:hit', handleHit),
    game.on('try:miss', handleMiss),
    game.on('round:lost', handleRoundLost),
    game.on('hard:step', handleHardStep),
    game.on('hard:miniMiss', handleHardMiniMiss),
    game.on('hard:sequenceComplete', handleHardSequenceComplete),
    game.on('hard:recall', handleHardRecall),
    game.on('hard:solve', handleHardSolve),
  ];

  function unmount() {
    clearTimeout(shakeTimeoutId);
    clearTimeout(advanceTimeoutId);
    clearTimeout(hardLockInTimeoutId);
    form.removeEventListener('submit', handleSubmit);
    hardForm.removeEventListener('submit', handleHardSubmit);
    hardRecallForm.removeEventListener('submit', handleHardRecallSubmit);
    hardSolveForm.removeEventListener('submit', handleHardSolveSubmit);
    continueButton.removeEventListener('click', handleContinue);
    for (const off of unsubscribers) off();
    hud.remove();
  }

  return { unmount };
}
