# Float Timer

## Overview
Float Timer is a floating Pomodoro and focus timer. 

## Features
- Task name input
- Fixed task categories
- Countdown and count-up focus modes
- 25, 45, 50, and 90 minute presets
- Custom focus duration
- Custom break duration
- Start, pause, resume, reset, and finish controls
- Optional manual break prompt after a focus session
- Local focus session history

## Tech Stack
- React
- TypeScript
- Vite
- localStorage for Phase 1 persistence
- Tauri planned for Phase 2

## Development Phases
Phase 1 is the browser MVP. It includes focus sessions, optional manually started breaks, and local session storage.

Phase 2 will add the macOS desktop shell with a small floating window, always-on-top behavior where supported, and persisted window position.

## Getting Started
Install dependencies:

```sh
npm install
```

Run the dev server:

```sh
npm run dev
```

Build the app:

```sh
npm run build
```

## Timer Behavior
Countdown sessions run until the selected duration reaches zero. Count-up sessions run until manually finished. Pause and resume are timestamp-based, so the displayed time is recalculated from actual start and pause times instead of trusting interval ticks.

When a focus session ends and the configured break duration is greater than zero, the app shows `Start break?`. If break duration is zero, the app treats it as no break and skips the prompt.

## Data Storage
Completed focus sessions are stored in `localStorage` under:

```text
float-timer.sessions.v1
```

The storage logic is isolated behind a `SessionStore` interface so a future Tauri build can move to SQLite without rewriting timer or UI code.

## Project Structure
```text
src/
  app/          App entry and styling
  components/   Form, timer, controls, prompt, and history UI
  constants/    Preset durations and categories
  hooks/        Timer and localStorage hooks
  services/     Time formatting and session storage
  types/        Timer, session, and task models
```