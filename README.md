![Banner](https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/BannerComfy.png)
<div align="center">
   
**Language:** 🇺🇸 English | [🇷🇺 Русский](README.ru.md)

</div>

---
**Comfy File Sorter** is a powerful, fast, and beautiful local gallery manager for your generations (Stable Diffusion / ComfyUI). It is designed for convenient viewing, sorting, and managing thousands of images and videos.

| Gallery Interface | View Mode |
| :---: | :---: |
| ![Interface Screenshot](https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/Screen_1.png) | ![Viewer Screenshot](https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/Screen_2.png) |

## ✨ Features

*   **⚡ Lightning-Fast Gallery:** Display thousands of files without lag. Supports both images and videos.
*   **🔍 Smart Search:** Instantly search not only by filenames but also by **prompts** (positive/negative), models, and seeds!
*   **📄 Metadata Reading:** Full support for ComfyUI Workflows and standard PNG Info.
*   **❤️ Favorites:** Mark your best generations and filter them with a single click.
*   **🎭 Immersive Mode:** Full-screen image viewing with slideshow capability.
*   **📂 File Operations:**
    *   Quick copy to the "Selected" folder.
    *   Delete (to Recycle Bin or permanently).
    *   Open file location in Explorer.
*   **📦 File Merger:** A built-in utility to collect files from multiple folders into one with smart sequential renaming.
*   **🎨 Theming & Localization:** Light/Dark theme. Supports English and Russian languages.

## 🛠️ Installation and Usage

The application is completely portable.

### Method 1: Pre-built Release (Windows)
1. Simply download the release and run `run.bat`.

### Method 2: Install from Source
Requires Python 3.10+.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Stamir36/ComfyFileSorter.git
    cd ComfyFileSorter
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the server:**
    ```bash
    python app.py
    ```

The browser will open automatically at `http://127.0.0.1:7865`.

## ⚙️ Configuration

Upon the first launch, the following folders will be created:
*   `output` — you can place your images here (or specify your ComfyUI output path in the settings).
*   `copies` — files are copied here when clicking the "Copy" button.

You can change the folder paths directly in the program interface ("Settings" button).

## ⌨️ Hotkeys

| Key | Action |
| :--- | :--- |
| `←` / `→` | Previous / Next image |
| `F` | Toggle Immersive Mode |
| `Delete` | Delete current file |
| `Esc` | Close viewer |

## 🤝 Credits

*   Built with [Flask](https://flask.palletsprojects.com/) and [Tailwind CSS](https://tailwindcss.com/).
*   Icons by [Heroicons](https://heroicons.com/).

---
**Author:** [Stamir](https://github.com/Stamir36)
**Version:** 1.0.0
**License:** MIT License

**Link to my Civitai profile:** [Civitai](https://civitai.com/user/Stamir)
