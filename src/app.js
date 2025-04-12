// Import the wasm-bindgen generated glue code
import init, { generate_qr_code_wasm } from './qrcode_generator_with_wasm.js';

const urlInput = document.getElementById('urlInput');
const qrCanvas = document.getElementById('qrCanvas');
const centerErrorLabel = document.getElementById('centerErrorLabel');
const bottomErrorLabel = document.getElementById('bottomErrorLabel');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');

const ctx = qrCanvas.getContext('2d');
const moduleColor = '#000000'; // Black
const backgroundColor = '#FFFFFF'; // White

// --- Dino Data (from components/qr_code_generator/dino_image.h) ---
const kDinoWidth = 20;
const kDinoHeight = 22;
const kDinoHeadHeight = 8;
const kDinoBodyHeight = 14; // kDinoHeight - kDinoHeadHeight
const kDinoWidthBytes = 3; // (kDinoWidth + 7) / 8

// Pixel data for the dino's head, facing right.
const kDinoHeadRight = [
  0b00000000, 0b00011111, 0b11100000, 0b00000000, 0b00111111, 0b11110000,
  0b00000000, 0b00110111, 0b11110000, 0b00000000, 0b00111111, 0b11110000,
  0b00000000, 0b00111111, 0b11110000, 0b00000000, 0b00111111, 0b11110000,
  0b00000000, 0b00111110, 0b00000000, 0b00000000, 0b00111111, 0b11000000,
];

// Pixel data for the dino's body.
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

// --- Error Handling ---
const errorMessages = {
  // Define potential error types from Rust/Wasm if they return specific codes/messages
  // For now, using generic messages based on C++ version
  INPUT_TOO_LONG: 'Input is too long. Please shorten the text.', // Max length needs clarification from Rust code
  UNKNOWN_ERROR: 'Could not generate QR code. Please try again.',
};

function displayError(errorType) {
  hideErrors(false); // Disable buttons
  qrCanvas.style.display = 'block'; // Keep canvas space

  if (errorType === 'INPUT_TOO_LONG') {
    centerErrorLabel.style.display = 'none';
    bottomErrorLabel.textContent = errorMessages.INPUT_TOO_LONG;
    bottomErrorLabel.style.display = 'block';
    // Display placeholder (blank canvas)
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
  } else {
    // Assuming UNKNOWN_ERROR or others
    bottomErrorLabel.style.display = 'none';
    qrCanvas.style.display = 'none'; // Hide canvas
    centerErrorLabel.textContent = errorMessages.UNKNOWN_ERROR;
    centerErrorLabel.style.display = 'flex'; // Show center error
  }
}

function hideErrors(enableButtons) {
  centerErrorLabel.style.display = 'none';
  bottomErrorLabel.style.display = 'none';
  qrCanvas.style.display = 'block'; // Ensure canvas is visible
  copyButton.disabled = !enableButtons;
  downloadButton.disabled = !enableButtons;
}

// --- Dino Drawing Function ---
function drawDinoOnCanvas(ctx, targetX, targetY, targetWidth, targetHeight) {
  const scaleX = targetWidth / kDinoWidth;
  const scaleY = targetHeight / kDinoHeight;
  ctx.fillStyle = moduleColor; // Black for dino pixels

  const drawPixelData = (pixelData, numRows, startRowOffset) => {
    for (let row = 0; row < numRows; row++) {
      let byteIndex = row * kDinoWidthBytes;
      let mask = 0b10000000;
      for (let col = 0; col < kDinoWidth; col++) {
        if ((pixelData[byteIndex] & mask) !== 0) {
          const px = targetX + col * scaleX;
          const py = targetY + (row + startRowOffset) * scaleY;
          // Draw a rectangle for the scaled pixel
          // Use Math.ceil for size to avoid gaps if scaling down significantly
          ctx.fillRect(
            Math.floor(px),
            Math.floor(py),
            Math.ceil(scaleX),
            Math.ceil(scaleY)
          );
        }
        mask >>= 1;
        if (mask === 0) {
          mask = 0b10000000;
          byteIndex++;
        }
      }
    }
  };

  // Draw head
  drawPixelData(kDinoHeadRight, kDinoHeadHeight, 0);
  // Draw body
  drawPixelData(kDinoBody, kDinoBodyHeight, kDinoHeadHeight);
}

// --- QR Code Rendering ---
function renderQRCode(pixelData, size) {
  if (!pixelData || size === 0) {
    // Display placeholder if no data
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
    hideErrors(false);
    currentQrData = null;
    currentQrSize = 0;
    return;
  }

  currentQrData = pixelData;
  currentQrSize = size;

  const canvasSize = qrCanvas.width; // Assuming square canvas
  const moduleSize = canvasSize / size;

  // Clear canvas
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // --- Draw Data Modules ---
  ctx.fillStyle = moduleColor;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      if (pixelData[index] === 1) {
        // 1 is dark
        // Draw square module
        ctx.fillRect(
          Math.floor(x * moduleSize),
          Math.floor(y * moduleSize),
          Math.ceil(moduleSize),
          Math.ceil(moduleSize)
        );
      }
    }
  }

  // --- Draw Dino ---
  // Calculate dino size (adjust as needed, e.g., 20-25% of canvas size)
  // Maintain aspect ratio
  const dinoTargetHeight = canvasSize * 0.22;
  const dinoTargetWidth = dinoTargetHeight * (kDinoWidth / kDinoHeight);
  const dinoX = (canvasSize - dinoTargetWidth) / 2;
  const dinoY = (canvasSize - dinoTargetHeight) / 2;

  // Clear the area behind the dino slightly larger than the dino itself
  // This improves scannability by providing a quiet zone around the dino
  const clearSizeRatio = 1.1;
  const clearWidth = dinoTargetWidth * clearSizeRatio;
  const clearHeight = dinoTargetHeight * clearSizeRatio;
  const clearX = (canvasSize - clearWidth) / 2;
  const clearY = (canvasSize - clearHeight) / 2;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(clearX, clearY, clearWidth, clearHeight);

  // Draw the dino using the pixel data
  drawDinoOnCanvas(ctx, dinoX, dinoY, dinoTargetWidth, dinoTargetHeight);

  hideErrors(true); // Enable buttons on success
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

  try {
    const result = generate_qr_code_wasm(inputText);
    if (!result || !result.data) {
      displayError('UNKNOWN_ERROR');
      currentQrData = null;
      currentQrSize = 0;
      return;
    }

    renderQRCode(result.data, result.size);
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
  navigator.clipboard
    .writeText(urlInput.value)
    .then(() => {
      // Optional: Show feedback to the user
      console.log('Text copied to clipboard');
      // Maybe change button text temporarily
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    })
    .catch((err) => {
      console.error('Failed to copy text: ', err);
      // Optional: Show error feedback
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

  // Create an anchor element
  const link = document.createElement('a');
  link.download = filename;

  // Get the data URL from the canvas
  link.href = qrCanvas.toDataURL('image/png');

  // Trigger the download
  link.click();
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

  // Initial generation (if input has value on load, though unlikely here)
  generateQRCode();
}

run();
