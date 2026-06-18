import { getApiV1Base } from "../../lib/apiBase";

export const VENDOR_TOKEN_KEY = "vendor_token";
export const VENDOR_REFRESH_KEY = "vendor_refresh_token";

export function getVendorAccessToken(): string {
  return localStorage.getItem(VENDOR_TOKEN_KEY) ?? "";
}

export function getVendorRefreshToken(): string {
  return localStorage.getItem(VENDOR_REFRESH_KEY) ?? "";
}

export function setVendorSession(tokens: { accessToken: string; refreshToken?: string | null }) {
  localStorage.setItem(VENDOR_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(VENDOR_REFRESH_KEY, tokens.refreshToken);
  } else {
    localStorage.removeItem(VENDOR_REFRESH_KEY);
  }
}

export function clearVendorSession() {
  localStorage.removeItem(VENDOR_TOKEN_KEY);
  localStorage.removeItem(VENDOR_REFRESH_KEY);
  window.dispatchEvent(new Event("vendor-session-cleared"));
}

let refreshInFlight: Promise<boolean> | null = null;

/** Exchange refresh JWT for a new access pair. Clears session on failure. */
export async function refreshVendorAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getVendorRefreshToken();
  if (!rt) return false;

  refreshInFlight = (async () => {
    try {
      const base = getApiV1Base().replace(/\/$/, "");
      const res = await fetch(`${base}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const text = await res.text();
      let json: {
        success?: boolean;
        data?: { accessToken?: string; refreshToken?: string };
      } = {};
      if (text) {
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          clearVendorSession();
          return false;
        }
      }
      if (!res.ok || json.success === false || !json.data?.accessToken) {
        clearVendorSession();
        return false;
      }
      setVendorSession({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken ?? rt,
      });
      return true;
    } catch {
      clearVendorSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
