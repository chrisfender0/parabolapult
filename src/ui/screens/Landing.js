import { getEntries } from '../../storage/leaderboard.js';
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

export function mount(root, ctx) {
  unmountIdle = mountIdleScene(ctx);

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

  root.appendChild(screen);
}

export function unmount() {
  unmountIdle?.();
  unmountIdle = null;
}
