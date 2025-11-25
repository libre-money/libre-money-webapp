# Workspace Rules

## Stack Overview

- This project uses Vue 3 with the Composition API and TypeScript.
- Quasar powers the UI, so reach for Quasar components and utility classes before writing custom markup or CSS.
- When unsure about a `q-*` component prop or behavior, consult the Quasar docs first.

## Styling Guidelines

- Follow the existing ESLint and Prettier rules; don’t fight the linters.
- Avoid `!important` in CSS. Use Quasar classes, props, and utility helpers whenever possible.
- Scope custom CSS to the component (`<style scoped>` or similar) whenever practical.
- Prefer Quasar spacing/typography helpers over handwritten rules.

## Implementation Tips

- Stick with Composition API patterns (refs, computed, watchers) consistent with the codebase.
- Keep components strongly typed: define explicit interfaces/types for props, emits, and refs.
- Match existing UX patterns and validation flows for dialogs and form components.
- Prioritize readability and maintainability with clear naming, limited side effects, and well-structured setup logic.

## Design Refactoring

- The project currently is undergoing design changes to accommodate Material 3 Design Guidelines. Material 3 suggested css is preferred.
