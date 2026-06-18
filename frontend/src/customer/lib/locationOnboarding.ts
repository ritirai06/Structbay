/** User explicitly chose a delivery city (modal or full /city page). */
export const LOCATION_ONBOARDING_DONE_KEY = "sb_location_choice_made";

/** Session flag: homepage announcements finished (or none) — city modal may open. */
export const ONBOARDING_GATE_SESSION_KEY = "sb_onboarding_gate_passed";

export const ONBOARDING_GATE_EVENT = "structbay:onboarding-gate";

export function isLocationOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(LOCATION_ONBOARDING_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLocationOnboardingComplete(): void {
  try {
    localStorage.setItem(LOCATION_ONBOARDING_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Homepage announcements dismissed or skipped — unlock city picker for new users. */
export function signalOnboardingGatePassed(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ONBOARDING_GATE_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(ONBOARDING_GATE_EVENT));
}

export function hasOnboardingGatePassed(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_GATE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
