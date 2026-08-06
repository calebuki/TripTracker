export const maxDisplayNameLength = 48;

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(value: string) {
  const displayName = normalizeDisplayName(value);

  if (!displayName) {
    return "Enter a display name.";
  }

  if (displayName.length > maxDisplayNameLength) {
    return `Display names can be up to ${maxDisplayNameLength} characters.`;
  }

  return null;
}
