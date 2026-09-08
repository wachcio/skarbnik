/**
 * Zawsze względny URL (ten sam origin co strona) — w produkcji NGINX Proxy
 * Manager kieruje ścieżkę /api do kontenera backendu, więc frontend i API
 * są jedną domeną: zero CORS, zero osobnego adresu do pilnowania w .env.
 * Lokalnie (`npm run dev` bez Dockera) tę samą ścieżkę przekierowuje na
 * backend serwer deweloperski Vite — patrz vite.config.ts.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
}
