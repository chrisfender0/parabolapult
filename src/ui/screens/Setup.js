import { getLastName, setLastName } from '../../storage/leaderboard.js';
import { mountIdleScene } from '../idleScene.js';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', description: 'Direct arithmetic — 7 + 5 = ▢.' },
  { id: 'medium', label: 'Medium', description: 'Solve for x — x + 3 = 15.' },
  { id: 'hard', label: 'Hard', description: 'Memorize three timed equations, then combine them.' },
];

let unmountIdle = null;

export function mount(root, ctx) {
  unmountIdle = mountIdleScene(ctx);

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

  const cards = document.createElement('div');
  cards.className = 'setup__difficulties';

  const cardEls = DIFFICULTIES.map((option) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'difficulty-card';
    if (option.disabled) card.classList.add('difficulty-card--disabled');
    card.disabled = Boolean(option.disabled);

    const label = document.createElement('span');
    label.className = 'difficulty-card__label';
    label.textContent = option.label;
    card.appendChild(label);

    const desc = document.createElement('span');
    desc.className = 'difficulty-card__description';
    desc.textContent = option.disabledNote ? `${option.description} (${option.disabledNote})` : option.description;
    card.appendChild(desc);

    card.addEventListener('click', () => {
      difficulty = option.id;
      for (const el of cardEls) el.classList.remove('difficulty-card--selected');
      card.classList.add('difficulty-card--selected');
      updatePlayEnabled();
    });

    cards.appendChild(card);
    return card;
  });
  screen.appendChild(cards);

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
    ctx.showScreen('game', { playerName, difficulty });
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
