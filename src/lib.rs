use wasm_bindgen::prelude::*;
use qr_code::{QrCode, EcLevel};
use qr_code::types::{QrError, Version, Color};

// Enums matching Chromium's implementation exactly
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ModuleStyle {
    Squares = 0,
    Circles = 1,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum LocatorStyle {
    Square = 0,
    Rounded = 1,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum CenterImage {
    NoCenterImage = 0,
    Dino = 1,
    // Passkey and ProductLogo would be here for non-iOS builds
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum QuietZone {
    Included = 0,
    WillBeAddedByClient = 1,
}

// Structure to return data to JS - exactly matching Chromium's GeneratedCode
#[wasm_bindgen]
pub struct QrCodeResult {
    #[wasm_bindgen(getter_with_clone)]
    pub data: Vec<u8>, // Pixel data: least significant bit set if module should be "black"
    pub size: usize,   // Width and height of the generated data, in modules
    pub original_size: usize, // Size without quiet zone for compatibility
}

#[wasm_bindgen]
pub fn generate_qr_code_wasm(input_data: &str) -> Result<QrCodeResult, JsValue> {
    generate_qr_code_with_options(
        input_data,
        ModuleStyle::Circles,
        LocatorStyle::Rounded,
        CenterImage::Dino,
        QuietZone::WillBeAddedByClient, // Match Chromium Android implementation
    )
}

#[wasm_bindgen]
pub fn generate_qr_code_with_options(
    input_data: &str,
    _module_style: ModuleStyle,      // Module style is handled in frontend rendering
    _locator_style: LocatorStyle,    // Locator style is handled in frontend rendering
    _center_image: CenterImage,      // Center image is handled in frontend rendering
    quiet_zone: QuietZone,
) -> Result<QrCodeResult, JsValue> {
    // Initialize panic hook for better debugging
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    // The QR version (i.e. size) must be >= 5 because otherwise the dino
    // painted over the middle covers too much of the code to be decodable.
    // This matches Chromium's kMinimumQRVersion = 5

    // Generate QR code - try with minimum version 5 first
    let code = match QrCode::with_version(input_data.as_bytes(), Version::Normal(5), EcLevel::M) {
        Ok(code) => code,
        Err(_) => {
            // If version 5 doesn't work, let the library choose the version
            QrCode::new(input_data.as_bytes())
                .map_err(|e: QrError| {
                    match e {
                        QrError::DataTooLong => JsValue::from_str("Input string was too long"),
                        _ => JsValue::from_str(&format!("QR Code generation error: {:?}", e)),
                    }
                })?
        }
    };

    let qr_size = code.width() as usize;

    // Calculate final size based on quiet zone setting (matching Chromium)
    let margin_modules = match quiet_zone {
        QuietZone::Included => 4, // 4 modules quiet zone
        QuietZone::WillBeAddedByClient => 0,
    };
    let final_size = qr_size + 2 * margin_modules;

    // Initialize pixel data - following Chromium's approach
    let mut pixel_data = vec![0u8; final_size * final_size];

    // Get the module data - iterate over QR code modules
    for y in 0..qr_size {
        for x in 0..qr_size {
            let module_color = code[(x, y)]; // Use QrCode's indexing API
            let is_dark = module_color == Color::Dark;

            if is_dark {
                let final_x = x + margin_modules;
                let final_y = y + margin_modules;
                pixel_data[final_y * final_size + final_x] = 1; // Set to black (1)
            }
        }
    }

    // For each byte in data, keep only the least significant bit (exactly like Chromium)
    // The Chromium comment: "The least significant bit of each byte is set if that tile/module should be 'black'."
    for byte in pixel_data.iter_mut() {
        *byte &= 1;
    }

    Ok(QrCodeResult {
        data: pixel_data,
        size: final_size,      // Size with quiet zone
        original_size: qr_size, // Original QR code size without quiet zone
    })
}
