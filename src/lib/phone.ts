/** Keep digits only, plus a leading "+". "+91 98290-12345" → "+919829012345" */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  return (trimmed.startsWith("+") ? "+" : "") + digits;
}

/** Last 10 digits, used to match returning customers. */
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  const n = digitsOnly(phone).length;
  return n >= 10 && n <= 15;
}

/** Lowercased words of a name, for prefix search on any word. */
export function nameWords(name: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (name ?? "")
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean),
    ),
  );
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
