import customtkinter as ctk
from tkinter import filedialog, messagebox
import os
import shutil
import threading

# Настройки темы
ctk.set_appearance_mode("Dark")  # Режимы: "System" (стандартный), "Dark", "Light"
ctk.set_default_color_theme("blue")  # Темы: "blue" (стандартная), "green", "dark-blue"

class FileMergerApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Настройка главного окна
        self.title("File Merger & Renamer")
        self.geometry("700x600")
        self.resizable(False, False)

        # Переменные данных
        self.source_folders = []
        self.destination_folder = ctk.StringVar()
        self.file_prefix = ctk.StringVar(value="Art")
        self.is_processing = False

        # === СЕТКА ===
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1) # Список папок
        self.grid_rowconfigure(1, weight=0) # Настройки
        self.grid_rowconfigure(2, weight=0) # Прогресс и кнопки

        # === БЛОК 1: Список исходных папок ===
        self.frame_sources = ctk.CTkFrame(self)
        self.frame_sources.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="nsew")
        self.frame_sources.grid_columnconfigure(0, weight=1)
        self.frame_sources.grid_rowconfigure(1, weight=1)

        self.lbl_sources = ctk.CTkLabel(self.frame_sources, text="Исходные папки (откуда берем файлы):", font=("Roboto", 14, "bold"))
        self.lbl_sources.grid(row=0, column=0, padx=10, pady=10, sticky="w")

        # Список папок (используем Textbox как список, так как в CTk нет Listbox)
        self.textbox_folders = ctk.CTkTextbox(self.frame_sources, state="disabled", height=150)
        self.textbox_folders.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")

        self.btn_add_folder = ctk.CTkButton(self.frame_sources, text="Добавить папку", command=self.add_source_folder, fg_color="green")
        self.btn_add_folder.grid(row=2, column=0, padx=10, pady=10, sticky="ew")
        
        self.btn_clear_folders = ctk.CTkButton(self.frame_sources, text="Очистить список", command=self.clear_sources, fg_color="gray")
        self.btn_clear_folders.grid(row=3, column=0, padx=10, pady=(0, 10), sticky="ew")

        # === БЛОК 2: Настройки назначения и имени ===
        self.frame_settings = ctk.CTkFrame(self)
        self.frame_settings.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        self.frame_settings.grid_columnconfigure(1, weight=1)

        # Папка назначения
        self.lbl_dest = ctk.CTkLabel(self.frame_settings, text="Папка назначения:")
        self.lbl_dest.grid(row=0, column=0, padx=10, pady=10, sticky="w")
        
        self.entry_dest = ctk.CTkEntry(self.frame_settings, textvariable=self.destination_folder, placeholder_text="Выберите папку куда всё сложить...")
        self.entry_dest.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        
        self.btn_browse_dest = ctk.CTkButton(self.frame_settings, text="Обзор", width=80, command=self.select_destination)
        self.btn_browse_dest.grid(row=0, column=2, padx=10, pady=10)

        # Префикс имени
        self.lbl_prefix = ctk.CTkLabel(self.frame_settings, text="Имя файлов (префикс):")
        self.lbl_prefix.grid(row=1, column=0, padx=10, pady=10, sticky="w")

        self.entry_prefix = ctk.CTkEntry(self.frame_settings, textvariable=self.file_prefix)
        self.entry_prefix.grid(row=1, column=1, padx=10, pady=10, sticky="ew")
        self.lbl_example = ctk.CTkLabel(self.frame_settings, text="Пример: Art_000001.png", text_color="gray")
        self.lbl_example.grid(row=1, column=2, padx=10, pady=10)

        # === БЛОК 3: Действия и прогресс ===
        self.frame_action = ctk.CTkFrame(self, fg_color="transparent")
        self.frame_action.grid(row=2, column=0, padx=20, pady=(10, 20), sticky="ew")
        self.frame_action.grid_columnconfigure(0, weight=1)

        self.progressbar = ctk.CTkProgressBar(self.frame_action)
        self.progressbar.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        self.progressbar.set(0)

        self.lbl_status = ctk.CTkLabel(self.frame_action, text="Готов к работе", text_color="gray")
        self.lbl_status.grid(row=1, column=0, padx=10, pady=(0, 10))

        self.btn_start = ctk.CTkButton(self.frame_action, text="НАЧАТЬ ПЕРЕМЕЩЕНИЕ", height=50, font=("Roboto", 16, "bold"), command=self.start_thread)
        self.btn_start.grid(row=2, column=0, padx=10, pady=10, sticky="ew")

    def add_source_folder(self):
        folder = filedialog.askdirectory(title="Выберите папку с файлами")
        if folder:
            if folder not in self.source_folders:
                self.source_folders.append(folder)
                self.update_folder_list_ui()

    def clear_sources(self):
        self.source_folders = []
        self.update_folder_list_ui()

    def update_folder_list_ui(self):
        self.textbox_folders.configure(state="normal")
        self.textbox_folders.delete("0.0", "end")
        for folder in self.source_folders:
            self.textbox_folders.insert("end", f"📁 {folder}\n")
        self.textbox_folders.configure(state="disabled")

    def select_destination(self):
        folder = filedialog.askdirectory(title="Выберите папку назначения")
        if folder:
            self.destination_folder.set(folder)

    def lock_ui(self, lock=True):
        state = "disabled" if lock else "normal"
        self.btn_add_folder.configure(state=state)
        self.btn_clear_folders.configure(state=state)
        self.btn_browse_dest.configure(state=state)
        self.btn_start.configure(state=state)
        self.entry_prefix.configure(state=state)
        self.entry_dest.configure(state=state)

    def start_thread(self):
        if not self.source_folders:
            messagebox.showwarning("Ошибка", "Добавьте хотя бы одну исходную папку!")
            return
        if not self.destination_folder.get():
            messagebox.showwarning("Ошибка", "Выберите папку назначения!")
            return
        if not self.file_prefix.get():
            messagebox.showwarning("Ошибка", "Введите префикс для имени файлов!")
            return

        self.is_processing = True
        self.lock_ui(True)
        threading.Thread(target=self.process_files, daemon=True).start()

    def process_files(self):
        dest_path = self.destination_folder.get()
        prefix = self.file_prefix.get()
        
        self.update_status("Сканирование и сортировка файлов...")
        
        # Список для хранения всех найденных файлов по порядку
        # Структура: [(полный_путь, имя_файла), ...]
        ordered_files = []

        # Проходим по папкам в том порядке, в котором вы их добавили в список
        for folder in self.source_folders:
            try:
                # Получаем список файлов
                files = os.listdir(folder)
                # ВАЖНО: Сортируем файлы, чтобы Art_00036 шло перед Art_00037
                files.sort() 
                
                for f in files:
                    full_path = os.path.join(folder, f)
                    if os.path.isfile(full_path):
                        # Игнорируем системные файлы
                        if f.startswith('.') or f == "Thumbs.db":
                            continue
                        ordered_files.append((full_path, f))
            except Exception as e:
                print(f"Ошибка доступа к папке {folder}: {e}")

        total_files = len(ordered_files)
        if total_files == 0:
            self.after(0, lambda: messagebox.showinfo("Инфо", "Файлы не найдены."))
            self.after(0, lambda: self.lock_ui(False))
            self.after(0, lambda: self.update_status("Готов к работе"))
            self.after(0, lambda: self.progressbar.set(0))
            return

        count = 1
        
        # Перебор и перемещение
        for src_path, original_filename in ordered_files:
            if not self.is_processing: break 

            _, ext = os.path.splitext(original_filename)
            
            # Новое имя: Prefix_000001.png
            new_filename = f"{prefix}_{count:06d}{ext}"
            dest_file_path = os.path.join(dest_path, new_filename)

            try:
                shutil.move(src_path, dest_file_path)
            except Exception as e:
                print(f"Ошибка перемещения {src_path}: {e}")
            
            # Обновление UI
            progress = count / total_files
            self.after(0, lambda p=progress: self.progressbar.set(p))
            self.after(0, lambda c=count, t=total_files: self.update_status(f"Обработка: {c} из {t}"))
            
            count += 1

        self.after(0, lambda: messagebox.showinfo("Успех", f"Все файлы ({count-1} шт.) перемещены и переименованы!"))
        self.after(0, lambda: self.lock_ui(False))
        self.after(0, lambda: self.update_status("Завершено"))

    def update_status(self, text):
        self.lbl_status.configure(text=text)

if __name__ == "__main__":
    app = FileMergerApp()
    app.mainloop()