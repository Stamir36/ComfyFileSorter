<div align="center">
  <img src="https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/BannerComfy.png" alt="Banner">

  <p>
    <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" alt="Python Version">
    <img src="https://img.shields.io/github/license/Stamir36/ComfyFileSorter?color=green" alt="License">
    <img src="https://img.shields.io/github/v/release/Stamir36/ComfyFileSorter?color=orange" alt="Release">
    <img src="https://img.shields.io/github/repo-size/Stamir36/ComfyFileSorter" alt="Repo Size">
  </p>

  <h3>
    <strong>Language:</strong> 🇺🇸 English | <a href="README.ru.md">🇷🇺 Русский</a>
  </h3>
</div>

---

**Comfy File Sorter** is a powerful, fast, and beautiful local gallery manager for your generations (Stable Diffusion / ComfyUI). It is designed for convenient viewing, sorting, and managing thousands of images and videos.

| Gallery Interface | View Mode |
| :---: | :---: |
| ![Interface Screenshot](https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/Screen_1.png) | ![Viewer Screenshot](https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/Screen_2.png) |

## ✨ Features

* **⚡ Lightning-Fast Gallery:** Display thousands of files without lag. Supports both images and videos.
* **🔍 Smart Search:** Instantly search not only by filenames but also by **prompts** (positive/negative), models, and seeds!
* **📄 Metadata Reading:** Full support for ComfyUI Workflows and standard PNG Info.
* **❤️ Favorites:** Mark your best generations and filter them with a single click.
* **🎭 Immersive Mode:** Full-screen image viewing with slideshow capability.
* **📂 File Operations:**
    * Quick copy to the "Selected" folder.
    * Delete (to Recycle Bin or permanently).
    * Open file location in Explorer.
* **📦 File Merger:** A built-in utility to collect files from multiple folders into one with smart sequential renaming.
* **🎨 Theming & Localization:** Light/Dark theme. Supports English and Russian languages.

---

## 📸 Screenshots

<div align="center">

### ⭐ Working with Favorites
*Convenient filtering of your best shots*

<img src="https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/Image%201.png" width="95%" alt="Favorites Interface">

<br><br>

### 🖼️ Detailed Viewing
*Full-screen mode with metadata*

<img src="https://raw.githubusercontent.com/Stamir36/ComfyFileSorter/refs/heads/main/.venv/github/Image%202.png" width="95%" alt="Viewer Interface">

</div>

---

## 🛠️ Installation and Usage

The application is completely portable.

### Method 1: Pre-built Release (Windows)
1. Simply download the latest release.
2. Run the `run.bat` file.

### Method 2: Install from Source
Requires **Python 3.10+**.

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

Upon the first launch, the program will create the necessary folder structure. You can change the folder paths directly in the program interface ("Settings" button).

```text
📂 ComfyFileSorter/
├── 📄 run.bat          # Launch file
├── 📂 output/          # Place images here (or specify your ComfyUI output path)
└── 📂 copies/          # Files are saved here when clicking the "Copy" button
```
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