const tokenPrefix = "crumbs-commenter-token";

function createRandomToken() {
  const browserCrypto = globalThis.crypto;

  if (browserCrypto && typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  if (!browserCrypto) {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  const bytes = browserCrypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getAnonymousCommenterToken(tripId: string) {
  if (typeof window === "undefined") {
    return createRandomToken();
  }

  const key = `${tokenPrefix}:${tripId}`;
  const saved = window.localStorage.getItem(key);

  if (saved) {
    return saved;
  }

  const token = createRandomToken();
  window.localStorage.setItem(key, token);
  return token;
}
