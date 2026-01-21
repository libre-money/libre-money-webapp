# Design Guidelines

## Layout & Responsiveness

### Fluid Design Approach
We primarily use fluid design rather than relying on heavy breakpoint usage. Components should scale smoothly on any viewport sizes without hard breakpoints.

### Viewport Requirements
- **Minimum supported mobile viewport:** 375px
- Viewports smaller than 375px will be scaled automatically and should not be considered when designing/developing the UI.

### Breakpoints
If breakpoints are absolutely necessary:
- **Mobile breakpoint:** max-width 599.99px (aligned with Quasar's `$breakpoint-xs-max`)

## Component Framework

### Quasar Components
We maintain the core functionality of Quasar components as provided by the framework. (https://quasar.dev/components)

## Design System

### Material Design 3
Material 3 styles are applied selectively based on design needs. (https://m3.material.io/)
