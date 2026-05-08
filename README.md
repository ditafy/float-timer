# Float Timer

Float Timer is a small desktop Pomodoro timer that can sit above my other windows while I work.

It has a normal setup window for choosing the task, category, timer mode, focus length, and break length. Once the timer is ready, it can switch into a frameless Mini window that stays visible without taking up much space.

## Why I Built It

I wanted a focus timer that was simple and always visible, without keeping a browser tab open or using a bigger productivity app than I needed.

## Features

- Full setup window and separate floating Mini window
- Mini window stays always on top
- Frameless widget-style Mini mode
- Task names and category selection
- Countdown and count-up focus modes
- Custom focus duration
- Break duration settings
- Pause, resume, finish, and reset controls
- Session history saved locally
- Mini window position saved locally
- Expand from Mini mode back to the full window
- Browser mode fallback for development

## Tech Stack

- React
- TypeScript
- Vite
- Tauri
- CSS

## How To Run Locally

Install dependencies:

```sh
npm install
```

Run the desktop app in development:

```sh
npm run desktop:dev
```

Run the browser fallback:

```sh
npm run dev
```

Build the desktop app:

```sh
npm run desktop:build
```

Build the frontend only:

```sh
npm run build
```

## How To Use It

1. Enter the task you want to focus on.
2. Choose a category.
3. Pick countdown or count-up mode.
4. Set the focus and break durations.
5. Start the timer.
6. Switch to Mini mode if you want the floating timer on top while you work.
7. Finish or reset the session when needed.

Completed focus sessions are saved in local browser storage.

## LICENSE

MIT
