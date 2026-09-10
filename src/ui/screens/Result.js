import { addEntry, getRank } from '../../storage/leaderboard.js';
import { mountIdleScene } from '../idleScene.js';

const COUNT_UP_DURATION = 900; // ms

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

    const cells = [round.round, round.equation, round.yourAnswer, round.target, round.triesUsed, round.points];
    for (const value of cells) {
      const cell = document.createElement('td');
      cell.textContent = String(value);
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
