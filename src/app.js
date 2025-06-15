// Import the wasm-bindgen generated glue code
import init, {
  QuietZone,
  CenterImage,
  ModuleStyle,
  LocatorStyle,
  generate_qr_code_with_options,
} from './qrcode_generator_with_wasm.js';

const urlInput = document.getElementById('urlInput');
const qrCanvas = document.getElementById('qrCanvas');
const centerErrorLabel = document.getElementById('centerErrorLabel');
const bottomErrorLabel = document.getElementById('bottomErrorLabel');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');

const ctx = qrCanvas.getContext('2d');
const moduleColor = '#000000'; // Black
const backgroundColor = '#FFFFFF'; // White

// Constants matching Chromium implementation
const MODULE_SIZE_PIXELS = 10;
const DINO_TILE_SIZE_PIXELS = 4;
const LOCATOR_SIZE_MODULES = 7;
const QUIET_ZONE_SIZE_PIXELS = MODULE_SIZE_PIXELS * 4;

// --- Polyfill for roundRect if not available ---
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x,
    y,
    width,
    height,
    radius
  ) {
    if (typeof radius === 'number') {
      radius = [radius, radius, radius, radius];
    } else if (radius.length === 1) {
      radius = [radius[0], radius[0], radius[0], radius[0]];
    } else if (radius.length === 2) {
      radius = [radius[0], radius[1], radius[0], radius[1]];
    }

    this.beginPath();
    this.moveTo(x + radius[0], y);
    this.arcTo(x + width, y, x + width, y + height, radius[1]);
    this.arcTo(x + width, y + height, x, y + height, radius[2]);
    this.arcTo(x, y + height, x, y, radius[3]);
    this.arcTo(x, y, x + width, y, radius[0]);
    this.closePath();
    return this;
  };
}

// --- Dino Data (EXACT copy from Chromium dino_image.h) ---
const kDinoWidth = 20;
const kDinoHeight = 22;
const kDinoHeadHeight = 8;
const kDinoBodyHeight = 14; // kDinoHeight - kDinoHeadHeight
const kDinoWidthBytes = 3; // (kDinoWidth + 7) / 8

// Pixel data for the dino's head, facing right - EXACT from Chromium
const kDinoHeadRight = [
  0b00000000, 0b00011111, 0b11100000, 0b00000000, 0b00111111, 0b11110000,
  0b00000000, 0b00110111, 0b11110000, 0b00000000, 0b00111111, 0b11110000,
  0b00000000, 0b00111111, 0b11110000, 0b00000000, 0b00111111, 0b11110000,
  0b00000000, 0b00111110, 0b00000000, 0b00000000, 0b00111111, 0b11000000,
];

// Pixel data for the dino's body - EXACT from Chromium
const kDinoBody = [
  0b10000000, 0b01111100, 0b00000000, 0b10000001, 0b11111100, 0b00000000,
  0b11000011, 0b11111111, 0b00000000, 0b11100111, 0b11111101, 0b00000000,
  0b11111111, 0b11111100, 0b00000000, 0b11111111, 0b11111100, 0b00000000,
  0b01111111, 0b11111000, 0b00000000, 0b00111111, 0b11111000, 0b00000000,
  0b00011111, 0b11110000, 0b00000000, 0b00001111, 0b11100000, 0b00000000,
  0b00000111, 0b01100000, 0b00000000, 0b00000110, 0b00100000, 0b00000000,
  0b00000100, 0b00100000, 0b00000000, 0b00000110, 0b00110000, 0b00000000,
];
// --- End Dino Data ---

let currentQrData = null;
let currentQrSize = 0;
let currentOriginalSize = 0; // Track original size without quiet zone

// --- Error Handling ---
const errorMessages = {
  // Based on C++ version - max input length is 2000 characters
  INPUT_TOO_LONG:
    'Input is too long. Please shorten the text to 2000 characters or less.',
  UNKNOWN_ERROR: 'Could not generate QR code. Please try again.',
};

function displayError(errorType) {
  hideErrors(false); // Disable buttons
  qrCanvas.style.display = 'block'; // Keep canvas space

  if (errorType === 'INPUT_TOO_LONG') {
    centerErrorLabel.classList.add('hidden');
    bottomErrorLabel.textContent = errorMessages.INPUT_TOO_LONG;
    bottomErrorLabel.classList.remove('hidden');
    // Display placeholder (blank canvas)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
  } else {
    // Assuming UNKNOWN_ERROR or others
    bottomErrorLabel.classList.add('hidden');
    qrCanvas.style.display = 'none'; // Hide canvas
    centerErrorLabel.textContent = errorMessages.UNKNOWN_ERROR;
    centerErrorLabel.classList.remove('hidden'); // Show center error
  }
}

function hideErrors(enableButtons) {
  centerErrorLabel.classList.add('hidden');
  bottomErrorLabel.classList.add('hidden');
  qrCanvas.style.display = 'block'; // Ensure canvas is visible
  copyButton.disabled = !enableButtons;
  downloadButton.disabled = !enableButtons;
}

// --- QR Code Rendering (Chromium-exact implementation) ---
function renderQRCodeChromiumStyle(pixelData, size, originalSize) {
  if (!pixelData || size === 0) {
    // Display placeholder if no data
    ctx.save(); // Save state before clearing
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
    ctx.restore(); // Restore state
    hideErrors(false);
    currentQrData = null;
    currentQrSize = 0;
    currentOriginalSize = 0;
    return;
  }

  currentQrData = pixelData;
  currentQrSize = size;
  currentOriginalSize = originalSize;

  // Use high DPI canvas for crisp rendering (fix blur issue)
  const kQRImageSizePx = 240;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const canvasSize = kQRImageSizePx * devicePixelRatio;

  // Set canvas size to high DPI for crisp rendering
  qrCanvas.width = canvasSize;
  qrCanvas.height = canvasSize;
  qrCanvas.style.width = '240px'; // CSS size remains 240px for display
  qrCanvas.style.height = '240px';

  // Scale the canvas context for high DPI
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  // Clear canvas with white background (matching Chromium's eraseARGB(0xFF, 0xFF, 0xFF, 0xFF))
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, kQRImageSizePx, kQRImageSizePx);

  // Calculate scaling factor to fit QR code exactly in 240x240 canvas
  // The QR code should fill the entire canvas area with appropriate scaling
  const totalPixelsNeeded = kQRImageSizePx;
  const modulePixelSize = Math.floor(totalPixelsNeeded / originalSize);
  const margin = Math.floor(
    (totalPixelsNeeded - originalSize * modulePixelSize) / 2
  );

  // Enable anti-aliasing for smoother rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Setup paint styles exactly like Chromium
  const paintBlack = { color: moduleColor }; // SK_ColorBLACK
  const paintWhite = { color: backgroundColor }; // SK_ColorWHITE

  // First pass: Draw data modules (exactly like Chromium's bitmap_generator.cc)
  // Note: pixelData might include quiet zone, handle it properly
  const hasQuietZone = size > originalSize;
  const quietZoneModules = hasQuietZone ? (size - originalSize) / 2 : 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dataIndex = y * size + x;
      if (pixelData[dataIndex] & 0x1) {
        // Check if module is dark (least significant bit)
        // Convert from data coordinates to original QR coordinates
        let originalX, originalY;
        if (hasQuietZone) {
          originalX = x - quietZoneModules;
          originalY = y - quietZoneModules;

          // Skip if outside original QR area
          if (
            originalX < 0 ||
            originalY < 0 ||
            originalX >= originalSize ||
            originalY >= originalSize
          ) {
            continue;
          }
        } else {
          originalX = x;
          originalY = y;
        }

        const isLocator = isLocatorModule(originalX, originalY, originalSize);
        if (isLocator) {
          continue; // Skip locators, draw them separately
        }

        // Draw data module with circles style (ModuleStyle::kCircles from Chromium)
        const centerX = margin + (originalX + 0.5) * modulePixelSize;
        const centerY = margin + (originalY + 0.5) * modulePixelSize;
        const radius = modulePixelSize / 2 - 1; // Exactly matching Chromium

        ctx.fillStyle = paintBlack.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  // Second pass: Draw locators with rounded style (LocatorStyle::kRounded)
  drawLocators(
    ctx,
    { width: originalSize, height: originalSize },
    paintBlack,
    paintWhite,
    margin,
    modulePixelSize
  );

  // Third pass: Draw center image (CenterImage::kDino)
  const canvasBounds = {
    x: 0,
    y: 0,
    width: kQRImageSizePx,
    height: kQRImageSizePx,
  };
  drawCenterImage(ctx, canvasBounds, paintWhite, modulePixelSize);

  hideErrors(true); // Enable buttons on success
}

// Check if a module position is part of a locator pattern (matching Chromium logic exactly)
function isLocatorModule(x, y, originalSize) {
  // Check the three locator positions (7x7 each)
  // Chromium logic: locators are at corners, each is LOCATOR_SIZE_MODULES x LOCATOR_SIZE_MODULES

  // Top-left locator
  if (x < LOCATOR_SIZE_MODULES && y < LOCATOR_SIZE_MODULES) {
    return true;
  }

  // Top-right locator
  if (x >= originalSize - LOCATOR_SIZE_MODULES && y < LOCATOR_SIZE_MODULES) {
    return true;
  }

  // Bottom-left locator
  if (x < LOCATOR_SIZE_MODULES && y >= originalSize - LOCATOR_SIZE_MODULES) {
    return true;
  }

  // No locator on bottom-right (as per Chromium comment)
  return false;
}

// Draw QR locators at three corners (EXACT Chromium DrawLocators implementation)
function drawLocators(
  ctx,
  dataSize,
  paintForeground,
  paintBackground,
  margin,
  modulePixelSize
) {
  // Use exact Chromium radius calculation: LocatorStyle::kRounded = 10px
  // Scale the radius proportionally with module size for consistent appearance
  const chromiumModuleSize = 10; // Chromium's kModuleSizePixels
  const scaleFactor = modulePixelSize / chromiumModuleSize;
  const radius = 10 * scaleFactor; // Exact Chromium radius scaled proportionally

  // Draw a locator with upper left corner at {leftXModules, topYModules}
  function drawOneLocator(leftXModules, topYModules) {
    // Outermost square, 7x7 modules (exactly matching Chromium)
    let leftXPixels = leftXModules * modulePixelSize;
    let topYPixels = topYModules * modulePixelSize;
    let dimPixels = modulePixelSize * LOCATOR_SIZE_MODULES;

    drawRoundRect(
      ctx,
      margin + leftXPixels,
      margin + topYPixels,
      dimPixels,
      dimPixels,
      radius,
      paintForeground.color
    );

    // Middle square, one module smaller in all dimensions (5x5 - exactly matching Chromium)
    leftXPixels += modulePixelSize;
    topYPixels += modulePixelSize;
    dimPixels -= 2 * modulePixelSize;

    drawRoundRect(
      ctx,
      margin + leftXPixels,
      margin + topYPixels,
      dimPixels,
      dimPixels,
      radius,
      paintBackground.color
    );

    // Inner square, one additional module smaller in all dimensions (3x3 - exactly matching Chromium)
    leftXPixels += modulePixelSize;
    topYPixels += modulePixelSize;
    dimPixels -= 2 * modulePixelSize;

    drawRoundRect(
      ctx,
      margin + leftXPixels,
      margin + topYPixels,
      dimPixels,
      dimPixels,
      radius,
      paintForeground.color
    );
  }

  // Draw the three locators (exactly matching Chromium positions)
  drawOneLocator(0, 0); // Top-left
  drawOneLocator(dataSize.width - LOCATOR_SIZE_MODULES, 0); // Top-right
  drawOneLocator(0, dataSize.height - LOCATOR_SIZE_MODULES); // Bottom-left
  // No locator on bottom-right (as per Chromium)
}

// Helper function to draw rounded rectangles exactly matching Chromium
function drawRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle;

  // Use exact Chromium rounding behavior
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

// Draw center image (dino implementation matching Chromium exactly)
function drawCenterImage(ctx, canvasBounds, paintBackground, modulePixelSize) {
  // Calculate dino size exactly like Chromium's DrawDino function
  // In Chromium: DrawDino(&canvas, bitmap_bounds, kDinoTileSizePixels, 2, paint_black, paint_white);
  // But we need to scale these values based on our actual module size vs Chromium's 10px
  const chromiumModuleSize = 10; // Chromium's kModuleSizePixels
  const scaleFactor = modulePixelSize / chromiumModuleSize;
  const pixelsPerDinoTile = Math.round(DINO_TILE_SIZE_PIXELS * scaleFactor);
  const dinoWidthPx = pixelsPerDinoTile * kDinoWidth;
  const dinoHeightPx = pixelsPerDinoTile * kDinoHeight;
  const dinoBorderPx = Math.round(2 * scaleFactor); // Scale the border too

  paintCenterImage(
    ctx,
    canvasBounds,
    dinoWidthPx,
    dinoHeightPx,
    dinoBorderPx,
    paintBackground, // Pass white background color
    modulePixelSize
  );
}

// Paint center image exactly like Chromium's PaintCenterImage function
function paintCenterImage(
  ctx,
  canvasBounds,
  widthPx,
  heightPx,
  borderPx,
  paintBackground,
  modulePixelSize = MODULE_SIZE_PIXELS
) {
  // Validation exactly like Chromium (asserts converted to early returns)
  if (
    canvasBounds.width / 2 < widthPx + borderPx ||
    canvasBounds.height / 2 < heightPx + borderPx
  ) {
    console.warn('Center image too large for canvas bounds');
    return;
  }

  // Assemble the target rect for the dino image data (exactly matching Chromium)
  let destX = (canvasBounds.width - widthPx) / 2;
  let destY = (canvasBounds.height - heightPx) / 2;

  // Clear out a little room for a border, snapped to some number of modules
  // Exactly matching Chromium's PaintCenterImage background calculation
  const backgroundLeft =
    Math.floor((destX - borderPx) / modulePixelSize) * modulePixelSize;
  const backgroundTop =
    Math.floor((destY - borderPx) / modulePixelSize) * modulePixelSize;
  const backgroundRight =
    Math.floor(
      (destX + widthPx + borderPx + modulePixelSize - 1) / modulePixelSize
    ) * modulePixelSize;
  const backgroundBottom =
    Math.floor(
      (destY + heightPx + borderPx + modulePixelSize - 1) / modulePixelSize
    ) * modulePixelSize;

  // Draw white background exactly like Chromium
  ctx.fillStyle = paintBackground.color; // Use white background from paint parameter
  ctx.fillRect(
    backgroundLeft,
    backgroundTop,
    backgroundRight - backgroundLeft,
    backgroundBottom - backgroundTop
  );

  // Center the image within the cleared space, and draw it
  // Exactly matching Chromium's centering logic with SkScalarRoundToScalar
  const deltaX = Math.round(
    (backgroundLeft + backgroundRight) / 2 - (destX + widthPx / 2)
  );
  const deltaY = Math.round(
    (backgroundTop + backgroundBottom) / 2 - (destY + heightPx / 2)
  );
  destX += deltaX;
  destY += deltaY;

  // Draw dino - only the black pixels, transparent background
  drawDinoPixelByPixel(ctx, destX, destY, widthPx, heightPx);
}

// Draw dino pixel by pixel to avoid any white background
function drawDinoPixelByPixel(ctx, destX, destY, destWidth, destHeight) {
  const scaleX = destWidth / kDinoWidth;
  const scaleY = destHeight / kDinoHeight;

  ctx.fillStyle = moduleColor; // Black color for dino pixels

  // Helper function to draw pixel data
  function drawPixelData(srcArray, srcNumRows, startRow) {
    const bytesPerRow = kDinoWidthBytes;

    for (let row = 0; row < srcNumRows; row++) {
      let whichByte = row * bytesPerRow;
      let mask = 0b10000000;

      for (let col = 0; col < kDinoWidth; col++) {
        if (srcArray[whichByte] & mask) {
          // Calculate destination pixel position
          const pixelX = destX + col * scaleX;
          const pixelY = destY + (startRow + row) * scaleY;

          // Draw scaled pixel - only black pixels, no background
          ctx.fillRect(
            Math.floor(pixelX),
            Math.floor(pixelY),
            Math.ceil(scaleX),
            Math.ceil(scaleY)
          );
        }
        mask >>= 1;
        if (mask === 0) {
          mask = 0b10000000;
          whichByte++;
        }
      }
    }
  }

  // Draw dino head and body pixel by pixel
  drawPixelData(kDinoHeadRight, kDinoHeadHeight, 0);
  drawPixelData(kDinoBody, kDinoBodyHeight, kDinoHeadHeight);
}

// --- Actions ---
async function generateQRCode() {
  const inputText = urlInput.value.trim();
  if (!inputText) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
    hideErrors(false);
    return;
  }

  // Check input length limit (same as Chromium C++ version)
  const kMaxInputLength = 2000;
  if (inputText.length > kMaxInputLength) {
    displayError('INPUT_TOO_LONG');
    currentQrData = null;
    currentQrSize = 0;
    return;
  }

  try {
    // Use the Chromium-style options exactly matching the Android implementation
    const result = generate_qr_code_with_options(
      inputText,
      ModuleStyle.Circles, // Data modules as circles (kCircles)
      LocatorStyle.Rounded, // Rounded locators (kRounded)
      CenterImage.Dino, // Dino center image (kDino)
      QuietZone.WillBeAddedByClient // Match Android bridge layer behavior
    );

    if (!result || !result.data) {
      displayError('UNKNOWN_ERROR');
      currentQrData = null;
      currentQrSize = 0;
      return;
    }

    // Use the Chromium-exact rendering approach
    renderQRCodeChromiumStyle(result.data, result.size, result.original_size);
  } catch (error) {
    console.error('Wasm QR generation failed:', error);

    if (error && error.toString().includes('too long')) {
      displayError('INPUT_TOO_LONG');
    } else {
      displayError('UNKNOWN_ERROR');
    }

    currentQrData = null;
    currentQrSize = 0;
  }
}

function copyInputText() {
  if (!urlInput.value) return;

  // Copy QR code image to clipboard instead of just text
  if (currentQrData && currentQrSize > 0) {
    // Create a canvas for clipboard with Chromium-exact size
    const clipboardCanvas = document.createElement('canvas');
    const clipboardCtx = clipboardCanvas.getContext('2d');

    // Use same size as download - exact Chromium sizing
    const margin = QUIET_ZONE_SIZE_PIXELS; // 40 pixels (4 modules * 10 pixels)
    const chromiumSize = currentOriginalSize * MODULE_SIZE_PIXELS + margin * 2;
    clipboardCanvas.width = chromiumSize;
    clipboardCanvas.height = chromiumSize;

    clipboardCtx.imageSmoothingEnabled = false;
    clipboardCtx.imageSmoothingQuality = 'high';

    // Re-render QR code at exact size
    renderQRCodeAtSize(
      clipboardCtx,
      chromiumSize,
      currentQrData,
      currentQrSize
    );

    // Convert to blob and copy
    clipboardCanvas.toBlob((blob) => {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard
        .write([item])
        .then(() => {
          // Show feedback
          const originalText = copyButton.textContent;
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = originalText;
          }, 1500);
        })
        .catch((err) => {
          console.error('Failed to copy image: ', err);
          // Fallback to copying text
          fallbackCopyText();
        });
    }, 'image/png');
  } else {
    fallbackCopyText();
  }
}

function fallbackCopyText() {
  navigator.clipboard
    .writeText(urlInput.value)
    .then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    })
    .catch((err) => {
      console.error('Failed to copy text: ', err);
    });
}

function getQRCodeFilenameForURL(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.hostname && !/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) {
      // Check if hostname exists and is not an IP
      // Basic sanitization: replace non-alphanumeric with underscore
      const safeHostname = url.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
      return `qrcode_${safeHostname}.png`;
    }
  } catch (e) {
    // Ignore if not a valid URL
  }
  return 'qrcode_chrome.png'; // Default filename
}

function downloadQRCode() {
  if (!currentQrData || currentQrSize === 0) return;

  const filename = getQRCodeFilenameForURL(urlInput.value);

  // Create a temporary canvas with Chromium-exact sizing
  const downloadCanvas = document.createElement('canvas');
  const downloadCtx = downloadCanvas.getContext('2d');

  // Calculate exact size matching Chromium's RenderBitmap function
  // In Chromium: bitmap size = data_size.width() * kModuleSizePixels + margin * 2
  // where margin = kQuietZoneSizePixels = kModuleSizePixels * 4 = 40px
  const margin = QUIET_ZONE_SIZE_PIXELS; // 40 pixels (4 modules * 10 pixels)
  const chromiumSize = currentOriginalSize * MODULE_SIZE_PIXELS + margin * 2;

  // Set download canvas to exact Chromium size
  downloadCanvas.width = chromiumSize;
  downloadCanvas.height = chromiumSize;

  // Clear canvas with white background
  downloadCtx.fillStyle = backgroundColor;
  downloadCtx.fillRect(0, 0, chromiumSize, chromiumSize);

  // Enable high quality scaling
  downloadCtx.imageSmoothingEnabled = false; // Disable smoothing for exact pixel reproduction
  downloadCtx.imageSmoothingQuality = 'high';

  // Re-render QR code at exact download size using same rendering logic
  renderQRCodeAtSize(downloadCtx, chromiumSize, currentQrData, currentQrSize);

  // Create download link
  const link = document.createElement('a');
  link.download = filename;
  link.href = downloadCanvas.toDataURL('image/png');
  link.click();
}

// Render QR code at specific size (for download) - exactly matching Chromium
function renderQRCodeAtSize(ctx, targetSize, pixelData, size) {
  // Clear canvas with white background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Calculate margin and module size exactly like Chromium's RenderBitmap
  const margin = QUIET_ZONE_SIZE_PIXELS; // 40 pixels fixed margin
  const modulePixelSize = MODULE_SIZE_PIXELS; // 10 pixels per module

  // Setup paint styles exactly like Chromium
  const paintBlack = { color: moduleColor };
  const paintWhite = { color: backgroundColor };

  // Get original size without quiet zone (this is what Chromium calls data_size)
  const originalSize = currentOriginalSize;

  // Check if we have quiet zone in our data
  const hasQuietZone = size > originalSize;
  const quietZoneModules = hasQuietZone ? (size - originalSize) / 2 : 0;

  // First pass: Draw data modules (matching Chromium's loop exactly)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dataIndex = y * size + x;
      if (pixelData[dataIndex] & 0x1) {
        let originalX, originalY;
        if (hasQuietZone) {
          originalX = x - quietZoneModules;
          originalY = y - quietZoneModules;
          if (
            originalX < 0 ||
            originalY < 0 ||
            originalX >= originalSize ||
            originalY >= originalSize
          ) {
            continue;
          }
        } else {
          originalX = x;
          originalY = y;
        }

        // Skip locator modules - they will be drawn separately
        const isLocator = isLocatorModule(originalX, originalY, originalSize);
        if (isLocator) continue;

        // Draw circle module exactly like Chromium
        const centerX = margin + (originalX + 0.5) * modulePixelSize;
        const centerY = margin + (originalY + 0.5) * modulePixelSize;
        const radius = modulePixelSize / 2 - 1;

        ctx.fillStyle = paintBlack.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  // Draw locators exactly like Chromium
  drawLocators(
    ctx,
    { width: originalSize, height: originalSize },
    paintBlack,
    paintWhite,
    margin,
    modulePixelSize
  );

  // Draw center image exactly like Chromium
  const canvasBounds = { x: 0, y: 0, width: targetSize, height: targetSize };
  drawCenterImage(ctx, canvasBounds, paintWhite, modulePixelSize);
}

// --- Initialization ---
async function run() {
  // Initialize the Wasm module
  await init();
  console.log('Wasm module initialized.');

  // Add event listeners
  urlInput.addEventListener('input', generateQRCode);
  copyButton.addEventListener('click', copyInputText);
  downloadButton.addEventListener('click', downloadQRCode);

  // Set default URL for testing (matches qrcode.png)
  urlInput.value = 'https://avg.163.com';

  // Initial generation
  generateQRCode();
}

run();
