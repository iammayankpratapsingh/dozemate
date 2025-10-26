export const API_BASE_URL = 'https://admin.dozemate.com';

export function apiUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}