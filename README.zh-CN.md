# QR 码生成器 (WebAssembly 版)

这是一个使用 Rust 和 WebAssembly 技术开发的高性能 QR 码生成器。该项目将 Rust 的高效能与 WebAssembly 的跨平台特性相结合，为 Web 应用提供快速、高效的 QR 码生成功能。

## 功能特点

- ⚡️ **高性能**：利用 Rust 和 WebAssembly 实现高速 QR 码生成
- 🔄 **实时预览**：输入变化时即时更新 QR 码
- 📋 **智能复制功能**：可直接复制 QR 码图像到剪贴板（支持文本降级）
- 💾 **完美下载**：下载清晰的 240×240 像素 PNG QR 码图像
- 🦖 **Chromium 风格恐龙**：支持带透明背景的恐龙中心图像
- 📱 **响应式设计**：适配不同设备屏幕尺寸
- ✨ **高 DPI 支持**：在 Retina 和高 DPI 显示器上清晰渲染
- 🎯 **Chromium 兼容性**：像素级完美实现，匹配 Chrome 的 QR 生成器

## 质量改进

### 技术规范

- **模块样式**：圆形点（`ModuleStyle::kCircles`）匹配 Chrome
- **定位器样式**：圆角（`LocatorStyle::kRounded`）匹配 Chrome
- **中心图像**：使用 Chromium 源码精确像素数据的恐龙
- **画布尺寸**：240×240 像素（相当于 `GetQRCodeImageSize()`）
- **模块大小**：每模块 10 像素（`kModuleSizePixels`）
- **恐龙缩放**：每恐龙像素 4 像素（`kDinoTileSizePixels`）

## 技术栈

- **Rust**：核心 QR 码生成逻辑
- **WebAssembly**：将 Rust 编译为可在浏览器中运行的格式
- **JavaScript**：前端交互和渲染
- **HTML5/CSS**：用户界面

## 安装与使用

### 前置条件

- [Rust](https://www.rust-lang.org/tools/install)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [Node.js](https://nodejs.org/) (推荐使用 pnpm 包管理器)

### 构建步骤

1. 克隆仓库

   ```bash
   git clone https://github.com/liuliangsir/qrcode-generator-with-wasm.git
   cd qrcode-generator-with-wasm
   ```

2. 构建 WebAssembly 模块

   ```bash
   pnpm build:wasm
   ```

3. 安装前端依赖

   ```bash
   pnpm install
   ```

4. 启动开发服务器

   ```bash
   pnpm dev
   ```

5. 在浏览器中打开项目 (默认为 <http://localhost:5173>)

### 使用方法

1. 在输入框中输入任意文本、URL 或数据（最多 2000 个字符）
2. QR 码将自动生成并实时更新显示
3. 使用"复制"按钮将 QR 码图像直接复制到剪贴板
4. 使用"下载"按钮保存清晰的 450×450 PNG QR 码图像

## 项目结构

```text
├── src/              # 源代码目录
│   ├── lib.rs        # Rust WebAssembly 模块核心代码
│   ├── app.js        # 前端 JavaScript 逻辑
│   └── app.css       # 样式表
├── public/           # 静态资源
├── index.html        # 主 HTML 页面
├── Cargo.toml        # Rust 项目配置
└── package.json      # JavaScript 项目配置
```

## 原理介绍

该 QR 码生成器使用 Rust 的`qr_code`库生成 QR 码数据，并通过 WebAssembly 将其暴露给 JavaScript。生成过程包括：

1. 接收用户输入的文本数据
2. 在 Rust 中生成对应的 QR 码二维矩阵
3. 添加适当的安静区 (quiet zone)
4. 将二维矩阵数据传回 JavaScript
5. 使用 Canvas API 渲染 QR 码图像

## 开发

### 修改 Rust 代码

如果您修改了`lib.rs`或其他 Rust 代码，需要重新构建 WebAssembly 模块：

```bash
pnpm build:wasm
```

### 修改前端代码

前端代码修改后会自动重新加载。

## 许可证

[MIT](LICENSE)

## 贡献

欢迎提交问题和 PR！请确保您的代码符合项目的编码风格。
