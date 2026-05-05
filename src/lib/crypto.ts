export async function hashPasscode(salt: string, passcode: string) {
  const normalized = passcode.trim();

  if (!normalized) {
    return null;
  }

  const payload = new TextEncoder().encode(`${salt}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
