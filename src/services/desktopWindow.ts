import { LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';

type DesktopWindowMode = 'full' | 'mini';

const FULL_WINDOW_SIZE = new LogicalSize(1200, 760);
const FULL_MIN_WINDOW_SIZE = new LogicalSize(900, 620);
const MINI_WINDOW_SIZE = new LogicalSize(350, 160);
const MINI_MIN_WINDOW_SIZE = new LogicalSize(350, 160);
const MINI_MAX_WINDOW_SIZE = new LogicalSize(900, 320);

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export async function applyDesktopWindowMode(mode: DesktopWindowMode): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const appWindow = getCurrentWindow();

  try {
    await appWindow.setMinSize(mode === 'mini' ? MINI_MIN_WINDOW_SIZE : FULL_MIN_WINDOW_SIZE);
    await appWindow.setMaxSize(mode === 'mini' ? MINI_MAX_WINDOW_SIZE : null);
    await appWindow.setResizable(true);
    await appWindow.setAlwaysOnTop(mode === 'mini');
    await appWindow.setSize(mode === 'mini' ? MINI_WINDOW_SIZE : FULL_WINDOW_SIZE);

    if (mode === 'full') {
      await appWindow.center();
    }
  } catch (error) {
    console.warn('Unable to update Tauri window mode.', error);
  }
}
