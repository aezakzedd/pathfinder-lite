(() => {
  const BUTTON_ID = '__pathfinder_lite_global_back_button__';
  const STYLE_ID = '__pathfinder_lite_global_back_style__';
  const NAV_STATE_KEY = 'pathfinderLiteNavigationState';
  const LAST_PATHFINDER_PAGE_KEY = 'pathfinderLiteLastPageUrl';

  // Fallback when no previous page is known.
  const DEFAULT_FALLBACK_URL = 'http://127.0.0.1:4173/#/last';

  const PATHFINDER_HOST_ALLOWLIST = new Set([
    'localhost',
    '127.0.0.1',
    '192.168.1.50'
  ]);

  const PRIVATE_IPV4_PATTERN = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;
  const PATHFINDER_PORT_ALLOWLIST = new Set(['5173', '4173']);

  // --- Host & path detection ---

  const isPathfinderHost = (hostname, port = '') => {
    const normalized = String(hostname || '').toLowerCase();
    const normalizedPort = String(port || '');

    if (PATHFINDER_HOST_ALLOWLIST.has(normalized)) return true;
    if (normalized.endsWith('.local')) return true;
    if (normalized.includes('pathfinder')) return true;
    if (PRIVATE_IPV4_PATTERN.test(normalized)) return true;
    if (PATHFINDER_PORT_ALLOWLIST.has(normalizedPort)) return true;

    return false;
  };

  const isPathfinderPage = () => {
    return isPathfinderHost(window.location.hostname, window.location.port);
  };

  const isPathfinderApiPath = (pathname, port) => {
    const normalizedPath = String(pathname || '/').toLowerCase();
    const normalizedPort = String(port || '');

    if (normalizedPath === '/api' || normalizedPath.startsWith('/api/')) return true;
    if (normalizedPath === '/health') return true;
    if (normalizedPath === '/openapi.json') return true;
    if (normalizedPath === '/docs' || normalizedPath.startsWith('/docs/')) return true;
    if (normalizedPath === '/redoc' || normalizedPath.startsWith('/redoc/')) return true;
    if (normalizedPath.endsWith('.pdf')) return true;
    // Backend API port
    if (normalizedPort === '8000') return true;

    return false;
  };

  /**
   * Pathfinder-lite uses hash routing: #/, #/itinerary, #/last, #/about, #/contact, #/creators
   * The base pathname is always "/" for the frontend.
   */
  const PATHFINDER_LITE_HASH_ROUTES = ['#/', '#/itinerary', '#/last', '#/about', '#/contact', '#/creators'];

  const isPathfinderLiteAppPage = () => {
    if (!isPathfinderHost(window.location.hostname, window.location.port)) return false;
    if (isPathfinderApiPath(window.location.pathname, window.location.port)) return false;

    const hash = String(window.location.hash || '').split('?')[0];
    // No hash or empty hash means home route
    if (!hash || hash === '#' || hash === '#/') return true;
    return PATHFINDER_LITE_HASH_ROUTES.some(route => hash === route || hash.startsWith(route + '?'));
  };

  const isPathfinderLiteUrl = (value) => {
    const parsed = parseUrl(value);
    if (!parsed) return false;
    if (!isPathfinderHost(parsed.hostname, parsed.port)) return false;
    if (isPathfinderApiPath(parsed.pathname, parsed.port)) return false;

    const hash = String(parsed.hash || '').split('?')[0];
    if (!hash || hash === '#' || hash === '#/') return true;
    return PATHFINDER_LITE_HASH_ROUTES.some(route => hash === route || hash.startsWith(route + '?'));
  };

  /**
   * Also match the /m/{id} launcher pages served by the backend (map link pages).
   * These are still "Pathfinder" pages so the back button should NOT show there,
   * but if user clicks "Open Google Maps" from there or the page fails, the button SHOULD show.
   */
  const isMapLinkLauncherPage = () => {
    if (!isPathfinderHost(window.location.hostname, window.location.port)) return false;
    const path = String(window.location.pathname || '').toLowerCase();
    return /^\/m\/[a-z0-9_-]+$/i.test(path);
  };

  const hasPathfinderStorageSignals = () => {
    try {
      const localSignals = [
        'pathfinderPdfCacheId',
        'finalItinerary',
        'pathfinder-lite-state'
      ];
      return localSignals.some((key) => String(window.localStorage.getItem(key) || '').trim());
    } catch {
      return false;
    }
  };

  const isLikelyPathfinderAppPage = () => {
    if (isPathfinderLiteAppPage()) return true;
    if (isMapLinkLauncherPage()) return true;

    if (!isPathfinderPage()) return false;
    if (hasPathfinderStorageSignals()) {
      const title = String(document.title || '').toLowerCase();
      if (title.includes('pathfinder')) return true;
    }

    return false;
  };

  const isPathfinderLoadingScreen = () => {
    const loadingTokens = ['pathfinder is loading', 'pathfinder is starting', 'pathfinder starting'];
    const bodyText = String(document.body?.innerText || '').toLowerCase();
    const pageTitle = String(document.title || '').toLowerCase();
    return loadingTokens.some(token => bodyText.includes(token) || pageTitle.includes(token));
  };

  /**
   * FIXED: Unlike the original, we DO show the back button on chrome-error:// pages.
   * This handles the case where Google Maps fails to load due to no internet.
   * Only suppress on about:blank and data: URLs (bootstrap/empty pages).
   */
  const isKioskBootstrapPage = () => {
    const protocol = String(window.location.protocol || '').toLowerCase();
    return protocol === 'about:' || protocol === 'data:';
  };

  const isChromeErrorPage = () => {
    const protocol = String(window.location.protocol || '').toLowerCase();
    return protocol === 'chrome-error:';
  };

  // --- Utilities ---

  const parseUrl = (value) => {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  };

  // --- Storage helpers (chrome.storage.local) ---

  const readStorage = async (keys) => {
    try {
      return await chrome.storage.local.get(keys);
    } catch {
      return {};
    }
  };

  const writeStorage = async (value) => {
    try {
      await chrome.storage.local.set(value);
    } catch {
      // Ignore storage errors.
    }
  };

  const readNavState = async () => {
    const stored = await readStorage([NAV_STATE_KEY]);
    const state = stored?.[NAV_STATE_KEY];
    if (state && typeof state === 'object') return state;
    return { previousUrl: '', currentUrl: '' };
  };

  const updateNavStateForCurrentPage = async () => {
    const currentUrl = window.location.href;
    const state = await readNavState();

    if (state.currentUrl === currentUrl) {
      return state;
    }

    const nextState = {
      previousUrl: state.currentUrl || state.previousUrl || '',
      currentUrl
    };

    await writeStorage({ [NAV_STATE_KEY]: nextState });
    return nextState;
  };

  const persistPathfinderHintsIfNeeded = async () => {
    if (!isLikelyPathfinderAppPage()) return;
    await writeStorage({ [LAST_PATHFINDER_PAGE_KEY]: window.location.href });
  };

  // --- Target URL resolution ---

  const resolveTargetUrl = async (previousUrl) => {
    const stored = await readStorage([LAST_PATHFINDER_PAGE_KEY]);
    const lastPathfinderPage = stored?.[LAST_PATHFINDER_PAGE_KEY] || '';

    const candidates = [
      lastPathfinderPage,
      previousUrl,
      DEFAULT_FALLBACK_URL
    ];

    for (const candidate of candidates) {
      const normalized = String(candidate || '').trim();
      if (!normalized) continue;
      if (normalized === window.location.href) continue;
      if (isPathfinderLiteUrl(normalized)) return normalized;
    }

    return DEFAULT_FALLBACK_URL;
  };

  // --- UI ---

  const injectStyle = () => {
    const existingStyle = document.getElementById(STYLE_ID);
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        html, body, *, *::before, *::after, iframe, canvas, svg {
          cursor: none !important;
        }
        [style*="cursor"] {
          cursor: none !important;
        }
        #${BUTTON_ID} {
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 2147483647;
          border: none;
          border-radius: 12px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
          color: #ffffff;
          background: rgba(15, 23, 42, 0.92);
          box-shadow: 0 8px 20px rgba(2, 6, 23, 0.45);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        #${BUTTON_ID}:hover {
          background: rgba(30, 41, 59, 0.95);
        }
        #${BUTTON_ID}:active {
          transform: scale(0.96);
        }
        #${BUTTON_ID} svg {
          flex-shrink: 0;
        }
      `;
      document.documentElement.appendChild(style);
    }

    document.documentElement.style.setProperty('cursor', 'none', 'important');
    if (document.body) {
      document.body.style.setProperty('cursor', 'none', 'important');
    }
  };

  const enforceCursorInline = (target) => {
    if (!(target instanceof Element)) return;
    try {
      target.style.setProperty('cursor', 'none', 'important');
    } catch {
      // Ignore elements that reject inline style writes.
    }
  };

  const removeButton = () => {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) existing.remove();
  };

  const navigateBack = async () => {
    const state = await readNavState();
    const previousUrl = String(state?.previousUrl || '').trim();

    if (isPathfinderLiteUrl(previousUrl)) {
      window.history.back();
      return;
    }

    const targetUrl = await resolveTargetUrl(previousUrl);
    if (targetUrl && targetUrl !== window.location.href) {
      window.location.assign(targetUrl);
      return;
    }

    window.history.back();
  };

  const createButtonElement = () => {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      Back
    `;
    button.onclick = () => { void navigateBack(); };
    return button;
  };

  const renderButton = async () => {
    await updateNavStateForCurrentPage();
    await persistPathfinderHintsIfNeeded();
    injectStyle();

    // Hide button on Pathfinder-Lite app pages and loading screens
    if (isLikelyPathfinderAppPage() || isPathfinderLoadingScreen()) {
      removeButton();
      return;
    }

    // Hide on empty bootstrap pages (about:blank, data:)
    if (isKioskBootstrapPage()) {
      removeButton();
      return;
    }

    // SHOW button on chrome-error:// pages (no internet / page failed to load)
    // SHOW button on any other external page (Google Maps, etc.)

    const existing = document.getElementById(BUTTON_ID);
    if (existing) {
      existing.onclick = () => { void navigateBack(); };
      return;
    }

    const button = createButtonElement();
    if (document.body) {
      document.body.appendChild(button);
    }
  };

  const rerenderSoon = () => {
    window.setTimeout(() => {
      injectStyle();
      renderButton();
    }, 0);
  };

  // --- Cursor enforcement (MutationObserver) ---

  const setupCursorEnforcement = () => {
    let rafId = 0;
    const queueStyleReapply = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        injectStyle();
        renderButton();
      });
    };

    const observer = new MutationObserver(() => {
      queueStyleReapply();
    });

    const observeTarget = document.documentElement || document.body;
    if (observeTarget) {
      observer.observe(observeTarget, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    const handlePointerMovement = (event) => {
      enforceCursorInline(document.documentElement);
      if (document.body) enforceCursorInline(document.body);
      enforceCursorInline(event?.target);
    };

    document.addEventListener('pointermove', handlePointerMovement, true);
    document.addEventListener('mousemove', handlePointerMovement, true);
    document.addEventListener('mouseover', handlePointerMovement, true);

    window.addEventListener('beforeunload', () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      document.removeEventListener('pointermove', handlePointerMovement, true);
      document.removeEventListener('mousemove', handlePointerMovement, true);
      document.removeEventListener('mouseover', handlePointerMovement, true);
      observer.disconnect();
    });
  };

  // --- History patching ---

  const patchHistory = () => {
    ['pushState', 'replaceState'].forEach((method) => {
      const original = window.history[method];
      if (typeof original !== 'function') return;

      window.history[method] = function patchedHistoryMethod(...args) {
        const result = original.apply(this, args);
        rerenderSoon();
        return result;
      };
    });
  };

  // --- Initialize ---

  patchHistory();
  window.addEventListener('popstate', rerenderSoon);
  window.addEventListener('hashchange', rerenderSoon);
  setupCursorEnforcement();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderButton();
    });
  } else {
    renderButton();
  }
})();
