/**
 * Kiosk Virtual Keyboard Module
 * Provides a centered text input modal with virtual keyboard for kiosk touch interfaces.
 */

let isOpen = false;
let overlay = null;
let modalInput = null;
let originalInput = null;
let onSubmitCallback = null;
let isShiftActive = false;
let isNumericActive = false;
let priorValue = '';

const KEYBOARD_LAYOUTS = {
  alpha: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
    ['123', 'globe', 'space', '.', 'enter']
  ],
  numeric: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['#+=', '.', ',', '?', '!', "'", 'backspace'],
    ['abc', 'globe', 'space', ',', 'enter']
  ]
};

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'kiosk-keyboard-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Pathfinder text input');
  
  overlay.innerHTML = `
    <div class="kiosk-keyboard-scrim"></div>
    <div class="kiosk-input-modal">
      <input 
        type="text" 
        class="kiosk-modal-input" 
        placeholder="Ask Pathfinder..." 
        inputmode="none"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      <button type="button" class="kiosk-modal-send" aria-label="Send message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
    <div class="kiosk-keyboard-panel">
      <div class="kiosk-keyboard-rows"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  modalInput = overlay.querySelector('.kiosk-modal-input');
  const sendBtn = overlay.querySelector('.kiosk-modal-send');
  const keyboardRows = overlay.querySelector('.kiosk-keyboard-rows');
  
  // Setup keyboard rows
  renderKeyboardRows(keyboardRows, 'alpha');
  
  // Setup event listeners
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('kiosk-keyboard-scrim')) {
      close();
    }
  });
  
  sendBtn.addEventListener('click', () => {
    submit();
  });
  
  modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  
  // Prevent native keyboard on focus
  modalInput.addEventListener('focus', () => {
    modalInput.blur();
    setTimeout(() => modalInput.focus(), 0);
  });
}

function renderKeyboardRows(container, layout) {
  const rows = KEYBOARD_LAYOUTS[layout];
  container.innerHTML = '';
  
  rows.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'kiosk-keyboard-row';
    
    row.forEach(key => {
      const keyBtn = document.createElement('button');
      keyBtn.className = `kiosk-key ${getKeyClass(key)}`;
      keyBtn.setAttribute('data-key', key);
      keyBtn.setAttribute('type', 'button');
      
      if (key === 'shift') {
        keyBtn.setAttribute('aria-label', 'Shift');
        keyBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 14L4 9l5-5"/>
            <path d="M4 9h11a4 4 0 0 1 0 8h-1"/>
          </svg>
        `;
      } else if (key === 'backspace') {
        keyBtn.setAttribute('aria-label', 'Backspace');
        keyBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        `;
      } else if (key === 'enter') {
        keyBtn.setAttribute('aria-label', 'Enter');
        keyBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        `;
      } else if (key === 'globe') {
        keyBtn.setAttribute('aria-label', 'Language');
        keyBtn.setAttribute('disabled', 'true');
        keyBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        `;
      } else if (key === 'space') {
        keyBtn.setAttribute('aria-label', 'Space');
        keyBtn.innerHTML = '&nbsp;';
      } else if (key === '123') {
        keyBtn.textContent = '123';
      } else if (key === 'abc') {
        keyBtn.textContent = 'abc';
      } else if (key === '#+=') {
        keyBtn.textContent = '#+=';
      } else {
        keyBtn.textContent = key;
      }
      
      keyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleKeyClick(key);
      });
      
      rowDiv.appendChild(keyBtn);
    });
    
    container.appendChild(rowDiv);
  });
}

function getKeyClass(key) {
  if (['shift', 'backspace', 'enter', '123', 'abc', '#+='].includes(key)) {
    return 'kiosk-key-wide';
  }
  if (key === 'space') {
    return 'kiosk-key-space';
  }
  if (key === 'globe') {
    return 'kiosk-key-globe';
  }
  return '';
}

function handleKeyClick(key) {
  if (key === 'shift') {
    isShiftActive = !isShiftActive;
    updateShiftState();
    return;
  }
  
  if (key === 'backspace') {
    deleteCharacter();
    return;
  }
  
  if (key === 'enter') {
    submit();
    return;
  }
  
  if (key === 'space') {
    insertCharacter(' ');
    return;
  }
  
  if (key === '123') {
    isNumericActive = true;
    isShiftActive = false;
    renderKeyboardRows(overlay.querySelector('.kiosk-keyboard-rows'), 'numeric');
    return;
  }
  
  if (key === 'abc' || key === '#+=') {
    isNumericActive = false;
    isShiftActive = false;
    renderKeyboardRows(overlay.querySelector('.kiosk-keyboard-rows'), 'alpha');
    return;
  }
  
  // Regular character
  let char = key;
  if (isShiftActive) {
    char = char.toUpperCase();
    // Reset shift after typing one letter
    isShiftActive = false;
    updateShiftState();
  }
  insertCharacter(char);
}

function updateShiftState() {
  const shiftKey = overlay.querySelector('[data-key="shift"]');
  if (shiftKey) {
    if (isShiftActive) {
      shiftKey.classList.add('active');
    } else {
      shiftKey.classList.remove('active');
    }
  }
}

function insertCharacter(char) {
  const start = modalInput.selectionStart;
  const end = modalInput.selectionEnd;
  const text = modalInput.value;
  
  modalInput.value = text.slice(0, start) + char + text.slice(end);
  modalInput.selectionStart = modalInput.selectionEnd = start + char.length;
}

function deleteCharacter() {
  const start = modalInput.selectionStart;
  const end = modalInput.selectionEnd;
  const text = modalInput.value;
  
  if (start === end && start > 0) {
    modalInput.value = text.slice(0, start - 1) + text.slice(end);
    modalInput.selectionStart = modalInput.selectionEnd = start - 1;
  } else if (start !== end) {
    modalInput.value = text.slice(0, start) + text.slice(end);
    modalInput.selectionStart = modalInput.selectionEnd = start;
  }
}

function submit() {
  const message = modalInput.value.trim();
  if (message && onSubmitCallback) {
    onSubmitCallback(message);
  }
  close();
}

function open(inputElement, onSubmit) {
  if (isOpen) return;
  
  originalInput = inputElement;
  onSubmitCallback = onSubmit;
  priorValue = inputElement.value;
  
  if (!overlay) {
    createOverlay();
  }
  
  modalInput.value = inputElement.value;
  overlay.classList.add('open');
  isOpen = true;
  
  // Prevent native keyboard
  inputElement.setAttribute('inputmode', 'none');
  inputElement.setAttribute('autocomplete', 'off');
  inputElement.setAttribute('autocorrect', 'off');
  inputElement.setAttribute('spellcheck', 'false');
  
  // Focus modal input
  setTimeout(() => {
    modalInput.focus();
  }, 100);
}

function close() {
  if (!isOpen) return;
  
  overlay.classList.remove('open');
  isOpen = false;
  
  // Restore original input if not submitted
  if (originalInput && modalInput) {
    originalInput.value = modalInput.value;
  }
  
  // Restore focus to original input
  setTimeout(() => {
    if (originalInput) {
      originalInput.focus();
    }
  }, 100);
}

export function initKioskKeyboard({ inputSelector, onSubmit }) {
  const inputElement = document.querySelector(inputSelector);
  if (!inputElement) {
    console.warn(`Kiosk keyboard: input element not found: ${inputSelector}`);
    return;
  }
  
  // Open keyboard on click/tap
  inputElement.addEventListener('click', (e) => {
    e.preventDefault();
    open(inputElement, onSubmit);
  });
  
  // Also open on focus (for accessibility)
  inputElement.addEventListener('focus', (e) => {
    if (!isOpen) {
      e.preventDefault();
      open(inputElement, onSubmit);
    }
  });
  
  // Prevent native keyboard
  inputElement.setAttribute('inputmode', 'none');
  inputElement.setAttribute('autocomplete', 'off');
  inputElement.setAttribute('autocorrect', 'off');
  inputElement.setAttribute('spellcheck', 'false');
  
  // Handle Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  });
}

export { close as closeKioskKeyboard };
