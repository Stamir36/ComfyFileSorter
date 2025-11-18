import json
import os
import re
import shutil
import threading
import webbrowser
import io
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Tuple, Any
import time

from flask import Flask, jsonify, request, send_from_directory, abort, send_file
from PIL import Image, ImageOps

# Попытка импорта cv2 для видео
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

APP_ROOT = Path(__file__).resolve().parent
CONFIG_PATH = APP_ROOT / "config.json"
CACHE_PATH = APP_ROOT / "meta_cache.json"
FAVORITES_PATH = APP_ROOT / "favorites.json"

# --- Config & Cache & Favorites ---
METADATA_CACHE = {}
FAVORITES_CACHE = set()

def load_data():
    global METADATA_CACHE, FAVORITES_CACHE
    # Cache
    if CACHE_PATH.exists():
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                METADATA_CACHE = json.load(f)
        except: METADATA_CACHE = {}
    
    # Favorites
    if FAVORITES_PATH.exists():
        try:
            with open(FAVORITES_PATH, "r", encoding="utf-8") as f:
                favs = json.load(f)
                FAVORITES_CACHE = set(favs)
        except: FAVORITES_CACHE = set()

def save_cache():
    try:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(METADATA_CACHE, f, ensure_ascii=False)
    except: pass

def save_favorites():
    try:
        with open(FAVORITES_PATH, "w", encoding="utf-8") as f:
            json.dump(list(FAVORITES_CACHE), f, ensure_ascii=False)
    except: pass

def load_config() -> Dict:
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except: cfg = {}
    else: cfg = {}

    output_dir = cfg.get("output_dir") or str((APP_ROOT / "output").resolve())
    copies_dir = cfg.get("copies_dir") or str((APP_ROOT / "copies").resolve())
    host = cfg.get("host") or "127.0.0.1"
    port = int(cfg.get("port") or 7865)

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    Path(copies_dir).mkdir(parents=True, exist_ok=True)

    new_cfg = {
        "output_dir": str(Path(output_dir).resolve()),
        "copies_dir": str(Path(copies_dir).resolve()),
        "host": host,
        "port": port,
    }
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(new_cfg, f, ensure_ascii=False, indent=2)
    return new_cfg

CONFIG = load_config()
BASE_DIR = Path(CONFIG["output_dir"]).resolve()
COPIES_DIR = Path(CONFIG["copies_dir"]).resolve()

load_data()

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".webm", ".mkv"}

def sanitize_relpath(relpath: str) -> Path:
    try:
        normalized = Path(relpath)
        if ".." in normalized.parts: raise ValueError
        full = (BASE_DIR / normalized).resolve()
        full.relative_to(BASE_DIR)
        return full
    except:
        abort(400, description="Invalid path")

# --- Metadata Parsing Logic ---
def find_node_by_id(nodes: List[Dict], nid: int) -> Dict:
    for n in nodes:
        if n.get("id") == nid: return n
    return None

def find_link_origin(links: List[List], link_id: int) -> Tuple[int, int]:
    for l in links:
        if l[0] == link_id: return l[1], l[2]
    return None, None

def get_input_link_id(node: Dict, input_name: str) -> int:
    inputs = node.get("inputs", [])
    for inp in inputs:
        if inp.get("name") == input_name: return inp.get("link")
    return None

def parse_workflow_graph(workflow: Dict) -> Tuple[str, str, Dict]:
    pos_text, neg_text, params = "", "", {}
    nodes = workflow.get("nodes", [])
    links = workflow.get("links", [])
    
    samplers = [n for n in nodes if "KSampler" in n.get("type", "")]
    target_sampler = None
    
    if samplers:
        samplers.sort(key=lambda x: x.get("order", 0), reverse=True)
        target_sampler = samplers[0]

    def trace_node_value(start_nid, target_class_type, from_slot=0):
        node = find_node_by_id(nodes, start_nid)
        if not node: return None
        node_type = node.get("type", "")
        
        if target_class_type in node_type:
            widgets = node.get("widgets_values", [])
            if not widgets: return None
            if target_class_type in ["CheckpointLoaderSimple", "UnetLoader", "UnetLoaderGGUF"]:
                return str(widgets[0]).replace(".safetensors", "").replace(".ckpt", "").replace(".gguf", "")
            if target_class_type == "CLIPTextEncode":
                val = widgets[0]
                return str(val) if val else ""
            return str(widgets[0])

        passthrough_nodes = ["Reroute", "LoraLoader", "WanImageToVideo", "FluxGuidance"]
        if any(pt in node_type for pt in passthrough_nodes):
            next_link_id = None
            if "WanImageToVideo" in node_type:
                input_name = "positive" if from_slot == 0 else "negative"
                if input_name: next_link_id = get_input_link_id(node, input_name)
            elif "LoraLoader" in node_type:
                if target_class_type in ["CheckpointLoaderSimple", "UnetLoaderGGUF", "UnetLoader"]:
                     next_link_id = get_input_link_id(node, "model")
            elif "Reroute" in node_type:
                inputs = node.get("inputs", [])
                if inputs: next_link_id = inputs[0].get("link")

            if next_link_id:
                prev_nid, prev_slot = find_link_origin(links, next_link_id)
                if prev_nid is not None:
                    return trace_node_value(prev_nid, target_class_type, prev_slot)
        return None
    
    if target_sampler:
        vals = target_sampler.get("widgets_values", [])
        stype = target_sampler.get("type", "")
        try:
            if "KSamplerAdvanced" in stype:
                if len(vals) > 5:
                    params["Seed"] = str(vals[1]); params["Steps"] = str(vals[3]); params["CFG scale"] = str(vals[4]); params["Sampler"] = str(vals[5])
                    if len(vals) > 6: params["Scheduler"] = str(vals[6])
            else:
                if len(vals) >= 5:
                    params["Seed"] = str(vals[0]); params["Steps"] = str(vals[2]); params["CFG scale"] = str(vals[3]); params["Sampler"] = str(vals[4])
                    if len(vals) > 5: params["Scheduler"] = str(vals[5])
        except: pass
        
        pos_link = get_input_link_id(target_sampler, "positive")
        if pos_link: 
            p_nid, p_slot = find_link_origin(links, pos_link)
            pos_text = trace_node_value(p_nid, "CLIPTextEncode", p_slot) or ""

        neg_link = get_input_link_id(target_sampler, "negative")
        if neg_link: 
            n_nid, n_slot = find_link_origin(links, neg_link)
            neg_text = trace_node_value(n_nid, "CLIPTextEncode", n_slot) or ""
            
        model_link = get_input_link_id(target_sampler, "model")
        if model_link:
            m_nid, m_slot = find_link_origin(links, model_link)
            model_name = trace_node_value(m_nid, "CheckpointLoaderSimple", m_slot)
            if not model_name: model_name = trace_node_value(m_nid, "UnetLoaderGGUF", m_slot)
            if not model_name: model_name = trace_node_value(m_nid, "UnetLoader", m_slot)
            if model_name: params["Model"] = model_name
                 
    return pos_text, neg_text, params

def extract_metadata(image_path: Path) -> Dict:
    pos, neg, params = "", "", {}
    if image_path.suffix.lower() not in SUPPORTED_IMAGE_EXTS: return pos, neg, params
    try:
        with Image.open(image_path) as im:
            info = im.info or {}
            if "workflow" in info:
                try:
                    wf = json.loads(info["workflow"])
                    pos, neg, params = parse_workflow_graph(wf)
                except: pass
            elif "parameters" in info:
                text = info["parameters"]
                if "Negative prompt:" in text:
                    parts = text.split("Negative prompt:", 1)
                    pos = parts[0].strip()
                    rest = parts[1]
                    if "\nSteps:" in rest:
                        neg_part, p_part = rest.split("\nSteps:", 1)
                        neg = neg_part.strip()
                        pairs = re.findall(r'([\w\s]+):\s*([^,]+)', "Steps:" + p_part)
                        for k, v in pairs: params[k.strip()] = v.strip()
                    else: neg = rest.strip()
                else: pos = text.strip()
    except: pass
    return pos, neg, params

def get_cached_metadata(path: Path, mtime: float) -> Dict:
    rel = path.relative_to(BASE_DIR).as_posix()
    if rel in METADATA_CACHE:
        if METADATA_CACHE[rel].get("mtime") == mtime: return METADATA_CACHE[rel]
    
    pos, neg, params = extract_metadata(path)
    if path.suffix.lower() in SUPPORTED_VIDEO_EXTS:
         preview_path = path.with_suffix(".png")
         if preview_path.exists(): pos, neg, params = extract_metadata(preview_path)

    data = {"mtime": mtime, "positive": pos, "negative": neg, "model": params.get("Model", ""), "seed": params.get("Seed", "")}
    METADATA_CACHE[rel] = data
    return data

def get_image_data(image_path: Path) -> Dict:
    try:
        stat = image_path.stat()
        is_video = image_path.suffix.lower() in SUPPORTED_VIDEO_EXTS
        pos, neg, params = "", "", {}
        
        if is_video:
             preview_path = image_path.with_suffix(".png")
             if preview_path.exists(): pos, neg, params = extract_metadata(preview_path)
        else: pos, neg, params = extract_metadata(image_path)

        width, height = 0, 0
        if not is_video:
            try:
                with Image.open(image_path) as im: width, height = im.size
            except: pass
        
        duration = 0
        if is_video and CV2_AVAILABLE:
            try:
                cap = cv2.VideoCapture(str(image_path))
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                if fps > 0: duration = frames / fps
                cap.release()
            except: pass

        if width and height: params["Size"] = f"{width}x{height}"
        
        rel_path = image_path.relative_to(BASE_DIR).as_posix()
        return {
            "name": image_path.name, "displayName": image_path.stem, "relPath": rel_path,
            "url": f"/media/{rel_path}", "thumb": f"/api/thumb?relpath={rel_path}",
            "type": "video" if is_video else "image", "size": stat.st_size, "mtime": int(stat.st_mtime),
            "width": width, "height": height, "duration": duration,
            "positive": pos, "negative": neg, "parameters": params,
            "isFavorite": rel_path in FAVORITES_CACHE
        }
    except: return {}

# --- Routes ---
app = Flask(__name__, static_folder=str(APP_ROOT / "static"), static_url_path="/static")

@app.route("/")
def index(): return send_from_directory(app.static_folder, "index.html")
@app.route('/favicon.png')
def favicon(): return send_from_directory(app.root_path, 'favicon.png', mimetype='image/png')

@app.route("/api/config", methods=["GET", "POST"])
def api_config():
    global CONFIG, BASE_DIR, COPIES_DIR
    if request.method == "POST":
        data = request.get_json(force=True, silent=True) or {}
        if data.get("output_dir"):
            p = Path(data["output_dir"]).resolve()
            if p.exists(): CONFIG["output_dir"] = str(p); BASE_DIR = p
        if data.get("copies_dir"):
            p = Path(data["copies_dir"]).resolve()
            if p.exists(): CONFIG["copies_dir"] = str(p); COPIES_DIR = p
        with open(CONFIG_PATH, "w", encoding="utf-8") as f: json.dump(CONFIG, f, ensure_ascii=False, indent=2)
    return jsonify({**CONFIG, "is_default_output": str(BASE_DIR) == str((APP_ROOT / "output").resolve())})

@app.route("/api/list")
def api_list():
    subpath = request.args.get("subpath", "").strip("/")
    search_query = request.args.get("q", "").lower()
    try: d = sanitize_relpath(subpath) if subpath else BASE_DIR
    except: return jsonify({"error": "Invalid"}), 400
    if not d.exists(): return jsonify({"error": "Not found"}), 404
    
    folders, images = [], []
    try: items = sorted(d.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
    except: items = []
    cache_updated = False

    for e in items:
        if e.name.startswith('.'): continue
        try:
            rel = e.relative_to(BASE_DIR).as_posix()
            if e.is_dir():
                if not search_query:
                    try: count = sum(1 for f in os.scandir(e) if f.is_file() and f.name[0] != '.')
                    except: count = "?"
                    folders.append({"name": e.name, "relPath": rel, "count": count})
            elif e.suffix.lower() in SUPPORTED_IMAGE_EXTS or e.suffix.lower() in SUPPORTED_VIDEO_EXTS:
                st = e.stat()
                is_match = True
                if search_query:
                    if search_query in e.name.lower(): is_match = True
                    else:
                        meta = get_cached_metadata(e, st.st_mtime)
                        cache_updated = True
                        search_content = (meta.get("positive", "") + " " + meta.get("negative", "") + " " + meta.get("model", "") + " " + meta.get("seed", "")).lower()
                        if search_query not in search_content: is_match = False
                
                if is_match:
                    is_video = e.suffix.lower() in SUPPORTED_VIDEO_EXTS
                    images.append({
                        "name": e.name, "relPath": rel, "thumb": f"/api/thumb?relpath={rel}",
                        "url": f"/media/{rel}", "type": "video" if is_video else "image",
                        "size": st.st_size, "mtime": int(st.st_mtime), "isFavorite": rel in FAVORITES_CACHE
                    })
        except: continue
            
    if cache_updated: threading.Thread(target=save_cache).start()
    crumbs = [{"name": "root", "relPath": ""}]
    if d != BASE_DIR:
        acc = []
        for p in d.relative_to(BASE_DIR).parts:
            acc.append(p); crumbs.append({"name": p, "relPath": "/".join(acc)})
    return jsonify({"cwd": subpath, "folders": folders, "images": images, "breadcrumb": crumbs})

@app.route("/api/image")
def api_image(): return jsonify(get_image_data(sanitize_relpath(request.args.get("relpath"))))

@lru_cache(maxsize=200)
def get_thumb_bytes(path_str):
    path = Path(path_str); ext = path.suffix.lower()
    try:
        img = None
        if ext in SUPPORTED_VIDEO_EXTS and CV2_AVAILABLE:
            try:
                cap = cv2.VideoCapture(path_str)
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) * 0.1))
                ret, frame = cap.read()
                cap.release()
                if ret: img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            except: pass
        elif ext in SUPPORTED_IMAGE_EXTS: img = Image.open(path_str)
        if img:
            if img.mode in ("RGBA", "P"): img = img.convert("RGB")
            img = ImageOps.fit(img, (350, 350), method=Image.Resampling.LANCZOS)
            bio = io.BytesIO(); img.save(bio, "JPEG", quality=70); return bio.getvalue()
    except: return None
    return None

@app.route("/api/thumb")
def api_thumb():
    data = get_thumb_bytes(str(sanitize_relpath(request.args.get("relpath"))))
    return send_file(io.BytesIO(data), mimetype="image/jpeg") if data else abort(404)

@app.route("/media/<path:relpath>")
def media(relpath):
    f = sanitize_relpath(relpath)
    return send_from_directory(f.parent, f.name)

@app.route("/api/delete", methods=["POST"])
def api_delete():
    p = sanitize_relpath(request.json.get("relpath"))
    try:
        import send2trash
        send2trash.send2trash(str(p))
    except: p.unlink(missing_ok=True)
    return jsonify({"ok": True})

@app.route("/api/copy", methods=["POST"])
def api_copy():
    src = sanitize_relpath(request.json.get("relpath"))
    dst = COPIES_DIR / src.name
    idx = 1
    while dst.exists():
        dst = COPIES_DIR / f"{src.stem}_{idx}{src.suffix}"
        idx += 1
    shutil.copy2(src, dst)
    return jsonify({"ok": True})

@app.route("/api/merge", methods=["POST"])
def api_merge():
    data = request.json or {}
    srcs = data.get("sources", []); dst_dir = Path(data.get("destination", "")); prefix = data.get("prefix")
    if not srcs or not dst_dir.exists() or not prefix: return jsonify({"error": "Invalid args"}), 400
    
    files = []
    for s in srcs:
        sp = Path(s)
        if sp.exists(): files.extend([f for f in sp.iterdir() if f.is_file() and f.name[0] != '.'])
    files.sort(key=lambda x: x.name.lower())
    if not files: return jsonify({"count": 0, "message": "No files"})

    cnt, err = 0, 0
    next_idx = 1
    for f in files:
        targ = dst_dir / f"{prefix}_{next_idx:06d}{f.suffix}"
        while targ.exists(): next_idx += 1; targ = dst_dir / f"{prefix}_{next_idx:06d}{f.suffix}"
        try:
            if data.get("move"): shutil.move(str(f), str(targ))
            else: shutil.copy2(str(f), str(targ))
            cnt += 1; next_idx += 1
        except: err += 1
    return jsonify({"count": cnt, "errors": err})

@app.route("/api/open_in_explorer", methods=["POST"])
def open_exp():
    p = str(sanitize_relpath(request.json.get("relpath")))
    if os.name == "nt":
        # Исправлено для старых версий Python
        p_win = p.replace("/", "\\")
        subprocess.Popen(f'explorer /select,"{p_win}"')
    else: webbrowser.open(Path(p).parent.as_uri())
    return jsonify({"ok": True})

@app.route("/api/select_folder", methods=["POST"])
def selfold():
    import tkinter as tk; from tkinter import filedialog
    r = tk.Tk(); r.withdraw(); r.attributes('-topmost', True)
    p = filedialog.askdirectory(); r.destroy()
    return jsonify({"folder_path": p})

@app.route("/api/download")
def down():
    f = sanitize_relpath(request.args.get("relpath"))
    return send_from_directory(f.parent, f.name, as_attachment=True)

@app.route("/api/favorites", methods=["GET", "POST"])
def api_favorites():
    global FAVORITES_CACHE
    if request.method == "POST":
        rel = request.json.get("relpath")
        if rel in FAVORITES_CACHE: FAVORITES_CACHE.remove(rel)
        else: FAVORITES_CACHE.add(rel)
        threading.Thread(target=save_favorites).start()
        return jsonify({"isFavorite": rel in FAVORITES_CACHE})
    return jsonify(list(FAVORITES_CACHE))

@app.route("/api/cache/clear", methods=["POST"])
def api_clear_cache():
    global METADATA_CACHE
    METADATA_CACHE = {}
    save_cache()
    return jsonify({"ok": True})

if __name__ == "__main__":
    url = f"http://{CONFIG['host']}:{CONFIG['port']}"
    if os.environ.get("OPEN_BROWSER", "1") == "1": threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    app.run(host=CONFIG['host'], port=CONFIG['port'], threaded=True)