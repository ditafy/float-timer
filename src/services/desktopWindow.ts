import { PhysicalPosition, type PhysicalSize, LogicalSize } from '@tauri-apps/api/dpi';
import { currentMonitor, getCurrentWindow, primaryMonitor, type Window as TauriWindow } from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';

type DesktopWindowMode = 'full' | 'mini';
type StoredMiniWindowPosition = {
  x: number;
  y: number;
};

const FULL_WINDOW_SIZE = new LogicalSize(1200, 760);
const FULL_MIN_WINDOW_SIZE = new LogicalSize(900, 620);
const MINI_WINDOW_SIZE = new LogicalSize(350, 160);
const MINI_MIN_WINDOW_SIZE = new LogicalSize(350, 160);
const MINI_MAX_WINDOW_SIZE = new LogicalSize(900, 320);
const MINI_WINDOW_POSITION_KEY = 'float-timer.mini-window-position.v1';

let miniMoveUnlisten: UnlistenFn | null = null;
let activeMode: DesktopWindowMode = 'full';

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
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

async function restoreMiniWindowPosition(appWindow: TauriWindow): Promise<void> {
  const storedPosition = readStoredMiniPosition();

  if (!storedPosition) {
    return;
  }

  const monitor = (await currentMonitor()) ?? (await primaryMonitor());

  if (!monitor) {
    return;
  }

  const windowSize = await appWindow.outerSize();

  if (!isPositionVisible(storedPosition, windowSize, monitor.workArea)) {
    return;
  }

  await appWindow.setPosition(new PhysicalPosition(storedPosition.x, storedPosition.y));
}

async function startMiniMovePersistence(appWindow: TauriWindow): Promise<void> {
  if (miniMoveUnlisten) {
    return;
  }

  miniMoveUnlisten = await appWindow.onMoved(({ payload }) => {
    if (activeMode !== 'mini') {
      return;
    }

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

export async function applyDesktopWindowMode(mode: DesktopWindowMode): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const appWindow = getCurrentWindow();

  try {
    activeMode = mode;

    if (mode === 'full') {
      stopMiniMovePersistence();
    }

    await appWindow.setMinSize(mode === 'mini' ? MINI_MIN_WINDOW_SIZE : FULL_MIN_WINDOW_SIZE);
    await appWindow.setMaxSize(mode === 'mini' ? MINI_MAX_WINDOW_SIZE : null);
    await appWindow.setResizable(true);
    await appWindow.setAlwaysOnTop(mode === 'mini');
    await appWindow.setSize(mode === 'mini' ? MINI_WINDOW_SIZE : FULL_WINDOW_SIZE);

    if (mode === 'mini') {
      await restoreMiniWindowPosition(appWindow);
      await startMiniMovePersistence(appWindow);
    } else {
      await appWindow.center();
    }
  } catch (error) {
    console.warn('Unable to update Tauri window mode.', error);
  }
}
