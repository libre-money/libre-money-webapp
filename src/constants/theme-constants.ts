// Theme color constants
// Primary colors for light and dark modes
// These values are read from CSS custom properties defined in app.scss
// The actual source of truth is in quasar.variables.scss ($primary-light, $primary-dark)

/**
 * Get a CSS custom property value from the document root
 */
function getCssVar(variableName: string): string {
  if (typeof document === "undefined") {
    // Fallback for SSR or when document is not available
    return variableName === "primary-light" ? "#0d9488" : "#06b6d4";
  }
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

// Read theme colors from CSS custom properties
export const PRIMARY_LIGHT = getCssVar("--primary-light") || "#0d9488";
export const PRIMARY_DARK = getCssVar("--primary-dark") || "#06b6d4";
