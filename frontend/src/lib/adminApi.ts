import { getApiV1Base } from "./apiBase";

const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_REFRESH_KEY = "adminRefreshToken";

export function getAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

/** Persist tokens after successful admin login. */
export function setAdminSession(tokens: { accessToken: string; refreshToken?: string }) {
  localStorage.setItem(ADMIN_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(ADMIN_REFRESH_KEY, tokens.refreshToken);
  } else {
    localStorage.removeItem(ADMIN_REFRESH_KEY);
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
}

export function getAdminRefreshToken(): string {
  return localStorage.getItem(ADMIN_REFRESH_KEY) || "";
}

/** Single in-flight refresh so parallel 401s share one token rotation. */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange refresh JWT for a new access (and refresh) pair. Clears session on failure.
 */
export async function refreshAdminAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getAdminRefreshToken();
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
        message?: string;
        data?: { accessToken?: string; refreshToken?: string };
      } = {};
      if (text) {
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          clearAdminSession();
          return false;
        }
      }
      if (!res.ok || json.success === false || !json.data?.accessToken) {
        clearAdminSession();
        return false;
      }
      setAdminSession({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken ?? rt,
      });
      return true;
    } catch {
      clearAdminSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  /** express-validator style: `{ field, message }[]` on 422 etc. */
  errors?: { field?: string; message?: string }[];
  pagination?: Record<string, unknown>;
  [key: string]: unknown;
};

function formatApiValidationErrors(errors: unknown): string {
  if (!Array.isArray(errors) || errors.length === 0) return "";
  return errors
    .map((e: unknown) => {
      if (e && typeof e === "object" && "message" in e) {
        const x = e as { field?: string; message?: string };
        if (x.field && x.message) return `${x.field}: ${x.message}`;
        return x.message || "";
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Authenticated fetch for admin UI. Uses {@link getApiV1Base} + `adminToken`.
 */
export async function adminFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const base = getApiV1Base().replace(/\/$/, "");
  const rel = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${rel}`;

  const buildHeaders = () => {
    const headers = new Headers(opts.headers ?? undefined);
    if (!headers.has("Authorization")) {
      const t = getAdminToken();
      if (t) headers.set("Authorization", `Bearer ${t}`);
    }
    if (opts.body != null && !(opts.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  const canRetryAfterRefresh =
    !(opts.body instanceof FormData) && !rel.includes("/auth/refresh-token");

  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers: buildHeaders() });
    if (res.status === 401 && canRetryAfterRefresh && getAdminRefreshToken()) {
      const ok = await refreshAdminAccessToken();
      if (ok) {
        res = await fetch(url, { ...opts, headers: buildHeaders() });
      }
    }
  } catch (err) {
    const m = err instanceof Error ? err.message : "Network error";
    throw new Error(
      `${m} — Start the backend and open the app via the Vite dev server so /api is proxied (same host/port as the UI).`
    );
  }

  if (res.status === 204) {
    return { success: true };
  }

  const text = await res.text();
  let data: ApiEnvelope<T> = { success: true };
  if (text) {
    try {
      data = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      throw new Error(`Invalid response from API (HTTP ${res.status})`);
    }
  }

  if (!res.ok) {
    let msg = data.message || `HTTP ${res.status}`;
    if (res.status === 401) {
      if (/no token provided/i.test(msg)) {
        msg = "Please log in as admin to continue.";
      } else if (/session expired|refresh your token/i.test(msg)) {
        msg = "Your session has expired. Please sign in again.";
      }
    }
    const detail = formatApiValidationErrors(data.errors);
    if (detail) msg = `${msg}\n\n${detail}`;
    throw new Error(msg);
  }
  if (data.success === false) {
    const detail = formatApiValidationErrors(data.errors);
    const base = data.message || "Request failed";
    throw new Error(detail ? `${base}\n\n${detail}` : base);
  }
  return data;
}

/**
 * Authenticated GET for binary downloads (catalog PDF, etc.). Uses the same token refresh path as {@link adminFetch}.
 */
export async function adminDownloadBlob(relPath: string, downloadFileName: string): Promise<void> {
  const base = getApiV1Base().replace(/\/$/, "");
  const rel = relPath.startsWith("/") ? relPath : `/${relPath}`;
  const url = `${base}${rel}`;

  const buildHeaders = () => {
    const headers = new Headers();
    const t = getAdminToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
    return headers;
  };

  const doFetch = () => fetch(url, { headers: buildHeaders() });

  let res = await doFetch();
  if (res.status === 401 && getAdminRefreshToken()) {
    const ok = await refreshAdminAccessToken();
    if (ok) res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = `Download failed (${res.status})`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = downloadFileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Authenticated GET returning a Blob (for PDF preview / print). */
export async function adminFetchBlob(relPath: string): Promise<Blob> {
  const base = getApiV1Base().replace(/\/$/, "");
  const rel = relPath.startsWith("/") ? relPath : `/${relPath}`;
  const url = `${base}${rel}`;

  const buildHeaders = () => {
    const headers = new Headers();
    const t = getAdminToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
    return headers;
  };

  const doFetch = () => fetch(url, { headers: buildHeaders() });

  let res = await doFetch();
  if (res.status === 401 && getAdminRefreshToken()) {
    const ok = await refreshAdminAccessToken();
    if (ok) res = await doFetch();
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = `Request failed (${res.status})`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }

  return res.blob();
}

/** Upload one image (multipart field `image`) to an admin upload endpoint; returns Cloudinary `url` + `publicId`. */
export async function adminUploadImage(
  uploadPath: string,
  file: File
): Promise<{ url: string; publicId: string }> {
  if (!getAdminToken()) {
    throw new Error("Please log in as admin to upload files.");
  }

  const rel = uploadPath.startsWith("/") ? uploadPath : `/${uploadPath}`;

  const doUpload = async () => {
    const fd = new FormData();
    fd.append("image", file);
    return adminFetch<{ url: string; publicId: string }>(rel, { method: "POST", body: fd });
  };

  let env: ApiEnvelope<{ url: string; publicId: string }>;
  try {
    env = await doUpload();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/expired|log in|token/i.test(msg) && getAdminRefreshToken()) {
      const ok = await refreshAdminAccessToken();
      if (ok) env = await doUpload();
      else throw err;
    } else {
      throw err;
    }
  }

  const d = env.data as { url?: string; publicId?: string } | undefined;
  if (!d?.url) throw new Error(env.message || "Upload failed");
  return { url: d.url, publicId: d.publicId || "" };
}
