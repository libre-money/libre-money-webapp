import { boot } from "quasar/wrappers";
import { Dark, setCssVar } from "quasar";
import { PRIMARY_LIGHT, PRIMARY_DARK } from "src/constants/theme-constants";

export default boot(() => {
  // Check localStorage for saved dark mode preference
  const darkModePreference = localStorage.getItem("--lm-settings--dark-mode");
  
  if (darkModePreference !== null) {
    try {
      const isDarkMode = JSON.parse(darkModePreference);
      // Set Quasar's dark mode
      Dark.set(isDarkMode);
      // Set primary color based on theme
      setCssVar("primary", isDarkMode ? PRIMARY_DARK : PRIMARY_LIGHT);
      // Also set body class for custom gradient background
      if (isDarkMode) {
        document.body.classList.add("body--dark");
      } else {
        document.body.classList.remove("body--dark");
      }
    } catch (ex) {
      // Ignore parse errors, use default
      setCssVar("primary", PRIMARY_LIGHT);
    }
  } else {
    // Default to light mode
    setCssVar("primary", PRIMARY_LIGHT);
  }
});

