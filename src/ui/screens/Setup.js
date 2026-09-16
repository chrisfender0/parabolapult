import { getLastName, setLastName, getLastMode, setLastMode } from '../../storage/leaderboard.js';
import { mountIdleScene } from '../idleScene.js';

const MODES = [
  { id: 'classic', label: 'Classic' },
  { id: 'parabolic', label: 'Parabolic' },
];

const DIFFICULTY_IDS = ['easy', 'medium', 'hard'];
const LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// Card descriptions change with the selected mode; the ids/labels don't.
const DESCRIPTIONS = {
  classic: {
    easy: 'Direct arithmetic — 7 + 5 = ▢.',
    medium: 'Solve for x — x + 3 = 15.',
    hard: 'Memorize three timed equations, then combine them.',
  },
  parabolic: {
    easy: 'Factored form: y = x · ( ▢ )',
    medium: 'Standard form: y = −x² + ▢',
    hard: 'Vertex form: y = −( ▢ )² + 36',
  },
};

let unmountIdle = null;

export function mount(root, ctx) {
  unmountIdle = mountIdleScene(ctx);

  let mode = getLastMode();
  let difficulty = null;

  const screen = document.createElement('div');
  screen.className = 'screen screen--setup';

  const title = document.createElement('h1');
  title.className = 'screen__title';
  title.textContent = 'Get ready';
  screen.appendChild(title);

  const nameLabel = document.createElement('label');
  nameLabel.className = 'setup__name-label';
  nameLabel.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'setup__name-input';
  nameInput.maxLength = 24;
  nameInput.autocomplete = 'off';
  nameInput.value = getLastName();
  nameLabel.appendChild(nameInput);
  screen.appendChild(nameLabel);

  const modeToggle = document.createElement('div');
  modeToggle.className = 'setup__mode-toggle';
  modeToggle.setAttribute('role', 'group');
  modeToggle.setAttribute('aria-label', 'Mode');

  const modeButtons = MODES.map((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'setup__mode-button';
    button.textContent = option.label;
    button.setAttribute('aria-pressed', String(option.id === mode));
    button.classList.toggle('setup__mode-button--selected', option.id === mode);
    button.addEventListener('click', () => {
      mode = option.id;
      setLastMode(mode);
      for (const el of modeButtons) {
        el.classList.toggle('setup__mode-button--selected', el === button);
        el.setAttribute('aria-pressed', String(el === button));
      }
      updateDescriptions();
    });
    modeToggle.appendChild(button);
    return button;
  });
  screen.appendChild(modeToggle);

  const cards = document.createElement('div');
  cards.className = 'setup__difficulties';

  const descriptionEls = new Map();
  const cardEls = DIFFICULTY_IDS.map((id) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'difficulty-card';

    const label = document.createElement('span');
    label.className = 'difficulty-card__label';
    label.textContent = LABELS[id];
    card.appendChild(label);

    const desc = document.createElement('span');
    desc.className = 'difficulty-card__description';
    descriptionEls.set(id, desc);
    card.appendChild(desc);

    card.addEventListener('click', () => {
      difficulty = id;
      for (const el of cardEls) el.classList.remove('difficulty-card--selected');
      card.classList.add('difficulty-card--selected');
      updatePlayEnabled();
    });

    cards.appendChild(card);
    return card;
  });
  screen.appendChild(cards);

  function updateDescriptions() {
    for (const id of DIFFICULTY_IDS) {
      descriptionEls.get(id).textContent = DESCRIPTIONS[mode][id];
    }
  }
  updateDescriptions();

  const actions = document.createElement('div');
  actions.className = 'setup__actions';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'button button--ghost';
  backButton.textContent = 'Back';
  backButton.addEventListener('click', () => ctx.showScreen('landing'));
  actions.appendChild(backButton);

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'screen__cta';
  playButton.textContent = 'Play';
  playButton.disabled = true;
  playButton.addEventListener('click', () => {
    const playerName = nameInput.value.trim();
    if (!playerName || !difficulty) return;
    setLastName(playerName);
    ctx.showScreen('game', { playerName, mode, difficulty });
  });
  actions.appendChild(playButton);

  screen.appendChild(actions);
  root.appendChild(screen);

  function updatePlayEnabled() {
    playButton.disabled = !(nameInput.value.trim() && difficulty);
  }

  nameInput.addEventListener('input', updatePlayEnabled);
}

export function unmount() {
  unmountIdle?.();
  unmountIdle = null;
}
