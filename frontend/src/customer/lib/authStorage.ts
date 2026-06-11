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
}
