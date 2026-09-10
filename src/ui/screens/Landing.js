import { getEntries, clearAll, hasStoredData } from '../../storage/leaderboard.js';
import { mountIdleScene } from '../idleScene.js';

let unmountIdle = null;

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderLeaderboard(container) {
  const entries = getEntries().slice(0, 10);

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'leaderboard__empty';
    empty.textContent = 'No scores yet — be the first to launch.';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'leaderboard__table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Name</th><th>Score</th><th>Difficulty</th><th>Date</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const entry of entries) {
    const row = document.createElement('tr');

    const name = document.createElement('td');
    name.textContent = entry.name;
    row.appendChild(name);

    const score = document.createElement('td');
    score.textContent = String(entry.score);
    row.appendChild(score);

    const difficulty = document.createElement('td');
    difficulty.textContent = entry.difficulty;
    row.appendChild(difficulty);

    const date = document.createElement('td');
    date.textContent = formatDate(entry.date);
    row.appendChild(date);

    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  container.appendChild(table);
}

// Small, muted, bottom of the page — inline "are you sure" rather than a
// window.confirm dialog, hidden entirely when there's nothing to reset.
function renderResetControl(container, onReset) {
  if (!hasStoredData()) return;

  const wrap = document.createElement('div');
  wrap.className = 'reset-data';

  function renderIdle() {
    wrap.replaceChildren();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reset-data__button';
    button.textContent = 'Reset Data';
    button.addEventListener('click', renderConfirm);
    wrap.appendChild(button);
  }

  function renderConfirm() {
    wrap.replaceChildren();

    const label = document.createElement('span');
    label.className = 'reset-data__label';
    label.textContent = 'Are you sure?';
    wrap.appendChild(label);

    const yesButton = document.createElement('button');
    yesButton.type = 'button';
    yesButton.className = 'reset-data__button reset-data__button--danger';
    yesButton.textContent = 'Yes';
    yesButton.addEventListener('click', () => {
      clearAll();
      onReset();
    });
    wrap.appendChild(yesButton);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'reset-data__button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', renderIdle);
    wrap.appendChild(cancelButton);
  }

  renderIdle();
  container.appendChild(wrap);
}

// Rebuilds just the screen's content (leaderboard, Play, Reset Data) —
// callable again after a reset without touching the idle-scene subscription,
// which only needs to be set up once per mount/unmount cycle.
function renderBody(root, ctx) {
  root.replaceChildren();

  const screen = document.createElement('div');
  screen.className = 'screen screen--landing';

  const title = document.createElement('h1');
  title.className = 'screen__title';
  title.textContent = 'Parabolapult';
  screen.appendChild(title);

  const tagline = document.createElement('p');
  tagline.className = 'screen__tagline';
  tagline.textContent = 'Solve the equation, launch the right distance, land in the target.';
  screen.appendChild(tagline);

  const board = document.createElement('div');
  board.className = 'leaderboard';
  renderLeaderboard(board);
  screen.appendChild(board);

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'screen__cta';
  playButton.textContent = 'Play';
  playButton.addEventListener('click', () => ctx.showScreen('setup'));
  screen.appendChild(playButton);

  renderResetControl(screen, () => renderBody(root, ctx));

  root.appendChild(screen);
}

export function mount(root, ctx) {
  unmountIdle = mountIdleScene(ctx);
  renderBody(root, ctx);
}

export function unmount() {
  unmountIdle?.();
  unmountIdle = null;
}
