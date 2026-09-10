import { addEntry, getRank } from '../../storage/leaderboard.js';
import { mountIdleScene } from '../idleScene.js';

const COUNT_UP_DURATION = 900; // ms
const BADGE_SYMBOLS = ['①', '②', '③'];

let unmountIdle = null;
let countUpFrame = null;

function animateCountUp(el, target) {
  cancelAnimationFrame(countUpFrame);
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / COUNT_UP_DURATION, 1);
    const eased = 1 - (1 - t) ** 3; // ease-out cubic
    el.textContent = String(Math.round(target * eased));
    if (t < 1) countUpFrame = requestAnimationFrame(tick);
  }

  countUpFrame = requestAnimationFrame(tick);
}

// Hard rounds don't have a single equation string. A round that reached
// the final phase shows it in full — each recalled number next to the
// true one (in that equation's color) if they didn't match, the
// operators, and the typed vs. correct combined result. A round that
// never got past the three timed equations (a wrong/timed-out answer
// failed the last attempt outright) instead shows which one broke it
// and what the whole last attempt looked like. Either way, this is the
// reveal the player was denied during play.
function renderHardBreakdownCell(hard) {
  const wrap = document.createElement('span');
  wrap.className = 'result__hard-cell';

  if (hard.failedStep) {
    const failedBadge = BADGE_SYMBOLS[hard.failedStep.badge - 1] ?? hard.failedStep.badge;
    const label = document.createElement('span');
    label.className = `result__hard-chip result__hard-chip--${hard.failedStep.color}`;
    label.textContent = `${failedBadge} failed`;
    wrap.appendChild(label);

    if (hard.steps) {
      const detail = document.createElement('span');
      detail.className = 'result__hard-detail';
      detail.textContent = hard.steps
        .map((step) => `${step.prompt} → ${step.typed ?? '—'} (${step.correct})`)
        .join('  ·  ');
      wrap.appendChild(detail);
    }
    return wrap;
  }

  hard.steps.forEach((step, i) => {
    const typedValue = hard.recallValues?.[i];
    const trueValue = hard.trueValues?.[i];

    const chip = document.createElement('span');
    chip.className = `result__hard-chip result__hard-chip--${step.color}`;
    chip.textContent = typedValue === trueValue ? String(typedValue) : `${typedValue ?? '—'} (${trueValue})`;
    wrap.appendChild(chip);

    if (i < hard.steps.length - 1) {
      const opSpan = document.createElement('span');
      opSpan.className = 'result__hard-op';
      opSpan.textContent = hard.ops[i];
      wrap.appendChild(opSpan);
    }
  });

  const eqSpan = document.createElement('span');
  eqSpan.className = 'result__hard-op';
  eqSpan.textContent = '=';
  wrap.appendChild(eqSpan);

  const resultSpan = document.createElement('span');
  resultSpan.className = 'result__hard-chip';
  resultSpan.textContent = hard.typed === hard.correct ? String(hard.typed) : `${hard.typed ?? '—'} (${hard.correct})`;
  wrap.appendChild(resultSpan);

  return wrap;
}

function renderBreakdown(container, rounds) {
  const table = document.createElement('table');
  table.className = 'result__table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Round</th><th>Equation</th><th>Your answer</th><th>Target</th><th>Tries</th><th>Points</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const round of rounds) {
    const row = document.createElement('tr');
    row.className = round.outcome === 'hit' ? 'result__row--hit' : 'result__row--miss';

    const roundCell = document.createElement('td');
    roundCell.textContent = String(round.round);
    row.appendChild(roundCell);

    const equationCell = document.createElement('td');
    if (round.hard) {
      equationCell.appendChild(renderHardBreakdownCell(round.hard));
    } else {
      equationCell.textContent = round.equation;
    }
    row.appendChild(equationCell);

    const remaining = [round.yourAnswer, round.target, round.triesUsed, round.points];
    for (const value of remaining) {
      const cell = document.createElement('td');
      cell.textContent = value === null ? '—' : String(value);
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  container.appendChild(table);
}

/**
 * @param {HTMLElement} root
 * @param {{ session: import('../../game/GameSession.js').GameSession }} ctx
 */
export function mount(root, ctx) {
  unmountIdle = mountIdleScene(ctx);

  const { session } = ctx;

  // Written exactly once, synchronously on mount — this screen is only
  // ever reached via GameController's game:over, one completed game per visit.
  const entry = {
    name: session.playerName,
    score: session.score,
    difficulty: session.difficulty,
    date: new Date().toISOString(),
    rounds: session.rounds.length,
  };
  const updatedLeaderboard = addEntry(entry);
  const rank = getRank(updatedLeaderboard, entry);

  const screen = document.createElement('div');
  screen.className = 'screen screen--result';

  const title = document.createElement('h1');
  title.className = 'screen__title';
  title.textContent = 'Results';
  screen.appendChild(title);

  const scoreEl = document.createElement('div');
  scoreEl.className = 'result__score';
  scoreEl.textContent = '0';
  screen.appendChild(scoreEl);
  animateCountUp(scoreEl, session.score);

  if (rank !== null && rank <= 10) {
    const callout = document.createElement('p');
    callout.className = 'result__rank';
    callout.textContent = `New leaderboard placement — #${rank}!`;
    screen.appendChild(callout);
  }

  renderBreakdown(screen, session.rounds);

  const actions = document.createElement('div');
  actions.className = 'setup__actions';

  const againButton = document.createElement('button');
  againButton.type = 'button';
  againButton.className = 'screen__cta';
  againButton.textContent = 'Play Again';
  againButton.addEventListener('click', () => ctx.showScreen('setup'));
  actions.appendChild(againButton);

  const landingButton = document.createElement('button');
  landingButton.type = 'button';
  landingButton.className = 'button button--ghost';
  landingButton.textContent = 'Back to Landing';
  landingButton.addEventListener('click', () => ctx.showScreen('landing'));
  actions.appendChild(landingButton);

  screen.appendChild(actions);
  root.appendChild(screen);
}

export function unmount() {
  cancelAnimationFrame(countUpFrame);
  unmountIdle?.();
  unmountIdle = null;
}
