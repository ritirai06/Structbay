import { getApiV1Base } from "../../lib/apiBase";

/** Keys used by customer marketplace auth (JWT from POST /api/v1/auth/login). */
export const CUSTOMER_TOKEN_KEY = "customer_token";
export const CUSTOMER_REFRESH_KEY = "customer_refresh_token";

export function getCustomerAccessToken(): string {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY) ?? "";
}

export function getCustomerRefreshToken(): string {
  return localStorage.getItem(CUSTOMER_REFRESH_KEY) ?? "";
}

export function setCustomerSession(tokens: { accessToken: string; refreshToken?: string | null }) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(CUSTOMER_REFRESH_KEY, tokens.refreshToken);
  } else {
    localStorage.removeItem(CUSTOMER_REFRESH_KEY);
  }
}

export function clearCustomerSession() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_REFRESH_KEY);
  window.dispatchEvent(new Event("customer-session-cleared"));
}

let refreshInFlight: Promise<boolean> | null = null;

/** Exchange refresh JWT for a new access pair. Clears session on failure. */
export async function refreshCustomerAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getCustomerRefreshToken();
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
          clearCustomerSession();
          return false;
        }
      }
      if (!res.ok || json.success === false || !json.data?.accessToken) {
        clearCustomerSession();
        return false;
      }
      setCustomerSession({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken ?? rt,
      });
      return true;
    } catch {
      clearCustomerSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
