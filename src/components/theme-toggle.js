// Theme toggle component
import { getState, setState } from '../state.js';

export function renderThemeToggle() {
  const container = document.createElement('div');
  container.className = 'theme-toggle';
  
  const currentTheme = getState('theme') || 'light';
  
  container.innerHTML = `
    <button class="theme-toggle-button" aria-label="Toggle theme">
      <span class="theme-icon theme-icon-light">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </span>
      <span class="theme-icon theme-icon-dark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </span>
    </button>
  `;
  
  const button = container.querySelector('.theme-toggle-button');
  button.addEventListener('click', () => {
    const newTheme = getState('theme') === 'light' ? 'dark' : 'light';
    setState('theme', newTheme);
    applyTheme(newTheme);
  });
  
  // Apply initial theme
  applyTheme(currentTheme);
  
  return container;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.querySelector('.theme-toggle-button');
  if (toggle) {
    toggle.classList.toggle('theme-dark', theme === 'dark');
  }
}
