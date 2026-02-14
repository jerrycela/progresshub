/**
 * HTML sanitization utility for XSS prevention.
 *
 * Strips HTML tags and escapes dangerous HTML entities from user input.
 * Uses a lightweight regex-based approach without external dependencies.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const HTML_ENTITY_REGEX = /[&<>"']/g;

/**
 * Strip all HTML tags from a string, then escape remaining HTML entities.
 *
 * @param input - The raw string to sanitize
 * @returns The sanitized string with HTML tags removed and entities escaped
 */
export function sanitizeHtml(input: string): string {
  // First: strip HTML tags (including self-closing and multi-line tags)
  const stripped = input.replace(/<[^>]*>/g, "");

  // Second: escape any remaining HTML-special characters
  const escaped = stripped.replace(
    HTML_ENTITY_REGEX,
    (char) => HTML_ENTITY_MAP[char] ?? char,
  );

  return escaped;
}
