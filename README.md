# QR Code Generator (WebAssembly Version)

This is a high-performance QR code generator developed with Rust and WebAssembly technology. The project combines the efficiency of Rust with the cross-platform capabilities of WebAssembly to provide fast and efficient QR code generation for web applications.

## Features

- ⚡️ **High Performance**: Utilizing Rust and WebAssembly for high-speed QR code generation
- 🔄 **Real-time Preview**: Instantly updates QR codes as input changes
- 📋 **Copy Function**: One-click copying of input text
- 💾 **Download Support**: Ability to download generated QR code images
- 🦖 **Dinosaur Image**: Support for displaying dinosaur images within QR codes
- 📱 **Responsive Design**: Adapts to different device screen sizes

## Technology Stack

- **Rust**: Core QR code generation logic
- **WebAssembly**: Compiles Rust into a format that can run in browsers
- **JavaScript**: Front-end interaction and rendering
- **HTML5/CSS**: User interface

## Installation and Usage

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [Node.js](https://nodejs.org/) (pnpm package manager recommended)

### Build Steps

1. Clone the repository

   ```bash
   git clone https://github.com/liuliangsir/qrcode-generator-with-wasm.git
   cd qrcode-generator-with-wasm
   ```

2. Build the WebAssembly module

   ```bash
   wasm-pack build --target web
   ```

3. Install frontend dependencies

   ```bash
   pnpm install
   ```

4. Start the development server

   ```bash
   pnpm dev
   ```

5. Open the project in your browser (default: <http://localhost:5173>)

### How to Use

1. Enter any text, URL, or data in the input field
2. The QR code will be automatically generated and displayed on the canvas
3. Use the "Copy" button to copy input text to the clipboard
4. Use the "Download" button to save the QR code image locally

## Project Structure

```text
├── src/              # Source code directory
│   ├── lib.rs        # Rust WebAssembly module core code
│   ├── app.js        # Frontend JavaScript logic
│   └── app.css       # Stylesheet
├── public/           # Static resources
├── index.html        # Main HTML page
├── Cargo.toml        # Rust project configuration
└── package.json      # JavaScript project configuration
```

## How It Works

This QR code generator uses Rust's `qr_code` library to generate QR code data and exposes it to JavaScript via WebAssembly. The generation process includes:

1. Receiving text data input from users
2. Generating the corresponding QR code two-dimensional matrix in Rust
3. Adding appropriate quiet zones
4. Returning the two-dimensional matrix data to JavaScript
5. Rendering the QR code image using the Canvas API

## Development

### Modifying Rust Code

If you modify `lib.rs` or other Rust code, you need to rebuild the WebAssembly module:

```bash
pnpm build:wasm
```

### Modifying Frontend Code

Frontend code modifications will automatically reload.

## License

[MIT](LICENSE)

## Contribution

Issues and PRs are welcome! Please ensure your code adheres to the project's coding style.
