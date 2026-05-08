import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { LogicalSize, PhysicalPosition, type PhysicalSize } from '@tauri-apps/api/dpi';
import { currentMonitor, getCurrentWindow, primaryMonitor, Window as TauriWindow } from '@tauri-apps/api/window';
import type { FocusSession } from '../types/session';
import type { TimerConfig, TimerSnapshot } from '../types/timer';

export type DesktopWindowMode = 'full' | 'mini';
export type DesktopWindowRole = 'browser' | 'full' | 'mini';
export type MiniWindowAction = 'start' | 'pause' | 'resume' | 'finish' | 'reset' | 'start-break' | 'skip-break';
export type MiniWindowState = {
  config: TimerConfig;
  snapshot: TimerSnapshot;
  canStart: boolean;
  pendingBreakSession: FocusSession | null;
};

type StoredMiniWindowPosition = {
  x: number;
  y: number;
};

const FULL_WINDOW_LABEL = 'main';
const MINI_WINDOW_LABEL = 'mini';
const FULL_WINDOW_SIZE = new LogicalSize(1200, 760);
const FULL_MIN_WINDOW_SIZE = new LogicalSize(900, 620);
const MINI_WINDOW_SIZE = new LogicalSize(350, 160);
const MINI_MIN_WINDOW_SIZE = new LogicalSize(350, 160);
const MINI_MAX_WINDOW_SIZE = new LogicalSize(900, 320);
const MINI_WINDOW_POSITION_KEY = 'float-timer.mini-window-position.v1';
const MINI_STATE_EVENT = 'float-timer-mini-state';
const MINI_STATE_REQUEST_EVENT = 'float-timer-mini-state-request';
const MINI_ACTION_EVENT = 'float-timer-mini-action';

let miniMoveUnlisten: UnlistenFn | null = null;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function getDesktopWindowRole(): DesktopWindowRole {
  if (!isTauriRuntime()) {
    return 'browser';
  }

  return getCurrentWindow().label === MINI_WINDOW_LABEL ? 'mini' : 'full';
}

function readStoredMiniPosition(): StoredMiniWindowPosition | null {
  try {
    const storedValue = window.localStorage.getItem(MINI_WINDOW_POSITION_KEY);

    if (!storedValue) {
      return null;
    }

    const position = JSON.parse(storedValue) as Partial<StoredMiniWindowPosition>;

    if (Number.isFinite(position.x) && Number.isFinite(position.y)) {
      return {
        x: Number(position.x),
        y: Number(position.y),
      };
    }
  } catch (error) {
    console.warn('Unable to read saved Mini window position.', error);
  }

  return null;
}

function saveMiniPosition(position: StoredMiniWindowPosition): void {
  try {
    window.localStorage.setItem(MINI_WINDOW_POSITION_KEY, JSON.stringify(position));
  } catch (error) {
    console.warn('Unable to save Mini window position.', error);
  }
}

function isPositionVisible(
  position: StoredMiniWindowPosition,
  windowSize: PhysicalSize,
  workArea: { position: PhysicalPosition; size: PhysicalSize },
): boolean {
  const safeMargin = 24;
  const minVisibleWidth = Math.min(120, windowSize.width);
  const minVisibleHeight = Math.min(80, windowSize.height);
  const left = workArea.position.x;
  const top = workArea.position.y;
  const right = left + workArea.size.width;
  const bottom = top + workArea.size.height;
  const windowRight = position.x + windowSize.width;
  const windowBottom = position.y + windowSize.height;
  const visibleWidth = Math.min(windowRight, right) - Math.max(position.x, left);
  const visibleHeight = Math.min(windowBottom, bottom) - Math.max(position.y, top);

  return (
    visibleWidth >= minVisibleWidth &&
    visibleHeight >= minVisibleHeight &&
    position.x < right - safeMargin &&
    position.y < bottom - safeMargin &&
    windowRight > left + safeMargin &&
    windowBottom > top + safeMargin
  );
}

async function restoreMiniWindowPosition(miniWindow: TauriWindow): Promise<void> {
  const storedPosition = readStoredMiniPosition();

  if (!storedPosition) {
    return;
  }

  const monitor = (await currentMonitor()) ?? (await primaryMonitor());

  if (!monitor) {
    return;
  }

  const windowSize = await miniWindow.outerSize();

  if (!isPositionVisible(storedPosition, windowSize, monitor.workArea)) {
    return;
  }

  await miniWindow.setPosition(new PhysicalPosition(storedPosition.x, storedPosition.y));
}

async function startMiniMovePersistence(miniWindow: TauriWindow): Promise<void> {
  if (miniMoveUnlisten) {
    return;
  }

  miniMoveUnlisten = await miniWindow.onMoved(({ payload }) => {
    saveMiniPosition({
      x: payload.x,
      y: payload.y,
    });
  });
}

function stopMiniMovePersistence(): void {
  miniMoveUnlisten?.();
  miniMoveUnlisten = null;
}

async function getRequiredWindow(label: string): Promise<TauriWindow> {
  const appWindow = await TauriWindow.getByLabel(label);

  if (!appWindow) {
    throw new Error(`Unable to find Tauri window "${label}".`);
  }

  return appWindow;
}

async function configureMiniWindow(miniWindow: TauriWindow): Promise<void> {
  await miniWindow.setMinSize(MINI_MIN_WINDOW_SIZE);
  await miniWindow.setMaxSize(MINI_MAX_WINDOW_SIZE);
  await miniWindow.setResizable(true);
  await miniWindow.setAlwaysOnTop(true);
  await miniWindow.setSize(MINI_WINDOW_SIZE);
  await restoreMiniWindowPosition(miniWindow);
  await startMiniMovePersistence(miniWindow);
}

async function configureFullWindow(fullWindow: TauriWindow): Promise<void> {
  stopMiniMovePersistence();
  await fullWindow.setMinSize(FULL_MIN_WINDOW_SIZE);
  await fullWindow.setMaxSize(null);
  await fullWindow.setResizable(true);
  await fullWindow.setAlwaysOnTop(false);
  await fullWindow.setSize(FULL_WINDOW_SIZE);
  await fullWindow.center();
}

export async function applyDesktopWindowMode(mode: DesktopWindowMode): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const fullWindow = await getRequiredWindow(FULL_WINDOW_LABEL);
    const miniWindow = await getRequiredWindow(MINI_WINDOW_LABEL);

    if (mode === 'mini') {
      await configureMiniWindow(miniWindow);
      await miniWindow.show();
      await miniWindow.setFocus();
      await fullWindow.hide();
      return;
    }

    await configureFullWindow(fullWindow);
    await fullWindow.show();
    await fullWindow.setFocus();
    await miniWindow.hide();
  } catch (error) {
    console.warn('Unable to update Tauri window mode.', error);
  }
}

export async function publishMiniWindowState(state: MiniWindowState): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    await emitTo(MINI_WINDOW_LABEL, MINI_STATE_EVENT, state);
  } catch (error) {
    console.warn('Unable to publish Mini window state.', error);
  }
}

export async function requestMiniWindowState(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    await emitTo(FULL_WINDOW_LABEL, MINI_STATE_REQUEST_EVENT);
  } catch (error) {
    console.warn('Unable to request Mini window state.', error);
  }
}

export async function sendMiniWindowAction(action: MiniWindowAction): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    await emitTo(FULL_WINDOW_LABEL, MINI_ACTION_EVENT, action);
  } catch (error) {
    console.warn('Unable to send Mini window action.', error);
  }
}

export async function listenToMiniWindowState(handler: (state: MiniWindowState) => void): Promise<UnlistenFn | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return listen<MiniWindowState>(MINI_STATE_EVENT, ({ payload }) => handler(payload));
}

export async function listenToMiniWindowActions(handler: (action: MiniWindowAction) => void): Promise<UnlistenFn | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return listen<MiniWindowAction>(MINI_ACTION_EVENT, ({ payload }) => handler(payload));
}

export async function listenToMiniWindowStateRequests(handler: () => void): Promise<UnlistenFn | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  return listen(MINI_STATE_REQUEST_EVENT, handler);
}
