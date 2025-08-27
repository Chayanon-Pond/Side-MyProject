import axios from 'axios';

export const resolveApiUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL ?? '').trim();
  if (/^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (import.meta.env.DEV && (origin.includes('localhost:5173') || origin.includes('127.0.0.1:5173'))) {
    return 'http://localhost:3001';
  }
  return origin || 'http://localhost:3001';
};

export const API_BASE = resolveApiUrl();

export const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : `${API_BASE}/api`,
});

export const buildAssetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};
