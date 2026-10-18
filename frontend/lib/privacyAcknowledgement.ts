const STORAGE_KEY = "repository_privacy_acknowledged_v1";

export function hasPrivacyAcknowledgement(): boolean {
  if (typeof window === "undefined") return false;

  return window.sessionStorage.getItem(STORAGE_KEY) === "true";
}

export function savePrivacyAcknowledgement(): void {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(STORAGE_KEY, "true");
}