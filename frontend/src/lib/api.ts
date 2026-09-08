const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/** Fetch z automatycznym dołączaniem ciasteczka sesji (credentials: "include"). */
export async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${API_URL}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
}
