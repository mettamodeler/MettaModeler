# MettaModeler Frontend

A modern, extensible web application for building, simulating, and analyzing Fuzzy Cognitive Maps (FCMs). This frontend provides interactive scenario modeling, comparison, and visualization, powered by a robust Python backend.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Setup & Installation](#setup--installation)
- [Available Scripts](#available-scripts)
- [Directory Structure](#directory-structure)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Type Safety & Data Contracts](#type-safety--data-contracts)
- [UI/UX & Design System](#uiux--design-system)
- [Accessibility](#accessibility)
- [Testing](#testing)
- [Contributing](#contributing)
- [Extending & Maintenance](#extending--maintenance)

---

## Project Overview
MettaModeler's frontend enables users to:
- Build and edit Fuzzy Cognitive Maps (FCMs)
- Run simulations and scenario comparisons
- Visualize results with interactive charts and tables
- Export models and results (notebook, Excel)
- Analyze network structure and centrality

## Features
- Drag-and-drop FCM editor
- Scenario management and comparison
- Rich charting and visualization
- Modular, reusable UI components
- TypeScript for type safety
- Responsive and accessible design

## Setup & Installation
1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
2. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The app will be available at `http://localhost:5173` (or as configured).

## Available Scripts
- `dev` – Start the development server
- `build` – Build the app for production
- `preview` – Preview the production build
- `lint` – Run code linting
- `format` – Format code with Prettier

## Directory Structure
```
client/
  src/
    components/      # UI, scenario, FCM, and layout components
    pages/           # Main app pages and routing
    hooks/           # Custom React hooks (API, state, utilities)
    contexts/        # React context providers (global state)
    types/           # Shared TypeScript types and interfaces
    lib/             # Utility libraries
    index.css        # Global styles
    App.tsx          # App root
    main.tsx         # Entry point
```

## API Integration
- All backend API calls are made via custom hooks (e.g., `use-simulation.ts`).
- **Contract alignment:** All requests and responses are typed to match the backend's Pydantic models. See `src/types/` for interfaces.
- API endpoints are documented in the [backend README](../python_sim/README.md).
- Error handling and loading states are surfaced to users via toasts and UI feedback.

## State Management
- **React Context** is used for global state (e.g., baseline scenario).
- **Custom hooks** encapsulate simulation logic, API calls, and FCM state.
- Local state is managed with React hooks (`useState`, `useReducer`).

## Type Safety & Data Contracts
- All major data structures (nodes, edges, scenarios, simulation results) are defined in `src/types/`.
- **Keep frontend types in sync with backend Pydantic models** to ensure robust contract alignment.
- Use TypeScript's type checking to catch contract drift early.

## UI/UX & Design System
- Modular, reusable components in `src/components/ui/` (buttons, dialogs, tables, charts, etc.).
- Consistent theming and spacing.
- Responsive layouts for desktop and mobile.
- Tooltips, popovers, and helper text for user guidance.

## Accessibility
- Semantic HTML and ARIA roles where appropriate.
- Keyboard navigation supported in all major flows.
- Color palette and contrast designed for accessibility.
- Screen reader-friendly labels and descriptions.

## Testing
- (Add details here if you have tests. If not, recommend adding unit and integration tests for critical flows.)
- Example:
  ```bash
  npm run test
  # or
  yarn test
  ```

## Contributing
- Use clear, descriptive commit messages.
- Follow the project's code style (lint and format before PRs).
- Document new components and hooks with JSDoc or TypeScript comments.
- Open issues or pull requests for discussion before major changes.
- Keep API types in sync with backend contracts.

## Extending & Maintenance
- Add new features as modular components or hooks.
- Update types in `src/types/` and backend schemas together.
- Use the design system for consistent UI/UX.
- Review accessibility for all new UI.
- Keep dependencies up to date and monitor for security issues.

---

For backend/API details, see [`../python_sim/README.md`](../python_sim/README.md). 