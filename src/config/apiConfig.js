const DEFAULT_API_BASE_URL = 'http://localhost:8000';

function normalizeApiBaseUrl(value) {
  const url = String(value || '').trim();
  return url ? url.replace(/\/+$/, '') : DEFAULT_API_BASE_URL;
}

function resolveImportMetaEnv() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

export const API_BASE_URL = normalizeApiBaseUrl(resolveImportMetaEnv().VITE_API_URL);

export function apiUrl(path = '') {
  const cleanPath = String(path || '');
  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;
  return `${API_BASE_URL}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

export { DEFAULT_API_BASE_URL };
