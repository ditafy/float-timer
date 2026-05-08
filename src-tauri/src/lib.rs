use tauri::{Manager, window::Color};

fn make_mini_window_transparent(app: &tauri::App) {
    if let Some(mini_window) = app.get_webview_window("mini") {
        let transparent = Some(Color(0, 0, 0, 0));
        let _ = mini_window.set_background_color(transparent);
        let _ = mini_window.set_shadow(false);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            make_mini_window_transparent(app);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                match window.label() {
                    "main" => {
                        window.app_handle().exit(0);
                    }
                    "mini" => {
                        api.prevent_close();
                        let _ = window.hide();

                        if let Some(main_window) = window.app_handle().get_webview_window("main") {
                            let _ = main_window.show();
                            let _ = main_window.center();
                            let _ = main_window.set_focus();
                        }
                    }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
