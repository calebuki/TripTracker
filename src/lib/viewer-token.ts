const tokenPrefix = "crumbs-viewer-id:v1";
const inMemoryTokens = new Map<string, string>();

function createRandomToken() {
  const browserCrypto = globalThis.crypto;

  if (browserCrypto && typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  const bytes = browserCrypto
    ? browserCrypto.getRandomValues(new Uint8Array(16))
    : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function getAnonymousViewerId(tripId: string) {
  const key = `${tokenPrefix}:${tripId}`;

  if (typeof window === "undefined") {
    return createRandomToken();
  }

  try {
    const saved = window.localStorage.getItem(key);

    if (saved) {
      return saved;
    }

    const token = createRandomToken();
    window.localStorage.setItem(key, token);
    return token;
  } catch {
    const saved = inMemoryTokens.get(key);

    if (saved) {
      return saved;
    }

    const token = createRandomToken();
    inMemoryTokens.set(key, token);
    return token;
  }
}
