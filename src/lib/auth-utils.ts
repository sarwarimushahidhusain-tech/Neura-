export interface PasswordValidationResult {
  isValid: boolean;
  hasLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  score: number; // 0 to 3
}

/**
 * Validates email format according to standard RFC 5322 pattern.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(trimmed);
}

/**
 * Validates password strength for client usability feedback.
 */
export function evaluatePasswordStrength(password: string): PasswordValidationResult {
  const hasLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const score = [hasLength, hasLetter, hasNumber].filter(Boolean).length;

  return {
    isValid: hasLength && hasLetter && hasNumber,
    hasLength,
    hasLetter,
    hasNumber,
    score,
  };
}

/**
 * Sanitizes redirect URLs to prevent open-redirect phishing vulnerabilities.
 * Safe for execution in both Server Components/Route Handlers and Browser environments.
 */
export function sanitizeRedirectUrl(target: string | null | undefined, fallback: string = "/projects"): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();

  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":") &&
    !trimmed.includes("\r") &&
    !trimmed.includes("\n")
  ) {
    return trimmed;
  }

  return fallback;
}
