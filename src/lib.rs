use wasm_bindgen::prelude::*;
use qr_code::QrCode;
use qr_code::types::{QrError}; // Import Color enum
// We don't need the unicode renderer anymore

// Structure to return data to JS
#[wasm_bindgen]
pub struct QrCodeResult {
    // Public fields are accessible from JS
    #[wasm_bindgen(getter_with_clone)] // Allow JS to get a clone of the Vec
    pub data: Vec<u8>, // Using u8: 1 for black, 0 for white
    pub size: usize,
}

#[wasm_bindgen]
pub fn generate_qr_code_wasm(input_data: &str) -> Result<QrCodeResult, JsValue> {
    // Initialize panic hook for better debugging
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    // Generate the QR code using the qr_code crate
    let code = QrCode::new(input_data.as_bytes())
        .map_err(|e: QrError| JsValue::from_str(&format!("QR Code generation error: {:?}", e)))?;

    // Get the size (width/height) of the QR code.
    let original_size = code.width() as usize;
    // Add 4 modules of quiet zone padding on each side, as required by the spec and Chromium's C++ comments.
    let quiet_zone = 4;
    let final_size = original_size + 2 * quiet_zone;

    let mut pixel_data = vec![0u8; final_size * final_size]; // Initialize with white (0)

    // Get the module data using the public API
    let modules = code.to_vec();

    // Iterate over the original QR code modules (without padding)
    for y in 0..original_size {
        for x in 0..original_size {
            // Get the color from the modules vector
            let module_index = y * original_size + x;
            // modules[module_index] is a bool: true for dark, false for light
            let is_dark = modules[module_index];
            // Check if the module is dark
            if is_dark {
                // Calculate the position in the final padded grid
                let final_x = x + quiet_zone;
                let final_y = y + quiet_zone;
                pixel_data[final_y * final_size + final_x] = 1; // Set to black (1)
            }
        }
    }

    Ok(QrCodeResult {
        data: pixel_data,
        size: final_size, // Return the size including padding
    })
}
