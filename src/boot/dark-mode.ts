import { boot } from "quasar/wrappers";
import { Dark, setCssVar } from "quasar";
import { PRIMARY_LIGHT, PRIMARY_DARK } from "src/constants/theme-constants";

export default boot(() => {
  let isDarkMode = false;
  let hasExplicitPreference = false;

  // Check localStorage for saved dark mode preference (user's explicit choice)
  const darkModePreference = localStorage.getItem("--lm-settings--dark-mode");

  if (darkModePreference !== null) {
    try {
      // User has explicitly set a preference, use that
      isDarkMode = JSON.parse(darkModePreference);
      hasExplicitPreference = true;
    } catch (ex) {
      // Parse error - treat as no preference, will check system preference below
      hasExplicitPreference = false;
    }
  }

  // If no saved preference (or parse error), check system/browser preference
  if (!hasExplicitPreference) {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      isDarkMode = true;
    }
    // If no system preference or it's light, isDarkMode remains false (light mode)
  }

  // Set Quasar's dark mode
  Dark.set(isDarkMode);

  // Set primary color based on theme
  setCssVar("primary", isDarkMode ? PRIMARY_DARK : PRIMARY_LIGHT);
});
