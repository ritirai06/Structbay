/**
 * Base URL for `/api/v1` JSON APIs.
 *
 * - **Development:** always same-origin `/api/v1` so Vite's `server.proxy` forwards
 *   to the backend (works on any dev port, e.g. 3000 / 3001 — avoids CORS).
 * - **Production:** use `VITE_API_URL` when the API is on another origin; otherwise
 *   same-origin `/api/v1` (e.g. reverse proxy serves both).
 */
export function getApiV1Base(): string {
  if (import.meta.env.DEV) {
    return "/api/v1";
  }
  const explicit = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "/api/v1";
}
