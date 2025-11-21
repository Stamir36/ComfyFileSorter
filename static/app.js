(() => {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => r.querySelectorAll(s);
    const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

    const state = {
        config: null,
        cwd: "",
        listing: { folders: [], images: [] },
        filteredImages: [],
        currentIndex: -1,
        sortBy: localStorage.getItem('cfs-sortBy') || 'mtime',
        sortDir: localStorage.getItem('cfs-sortDir') || 'desc',
        filterType: 'all',
        currentMeta: null,
        zoomLevel: 1, imageX: 0, imageY: 0, isDragging: false, startX: 0, startY: 0,
        deleteCallback: null,
        mergerSources: [],
        isImmersive: false,
        slideshowInterval: null,
        searchTimeout: null,
        currentLang: localStorage.getItem('cfs-lang') || 'ru',
        favorites: new Set(),
        fitMode: localStorage.getItem('cfs-fit') || 'cover',
        contextMenuTargetIdx: -1,
        showFilmstrip: localStorage.getItem('cfs-filmstrip') !== 'false',
        // Filmstrip drag state
        isFilmstripDragging: false,
        filmstripStartX: 0,
        filmstripScrollLeft: 0
    };

    const el = {
        mainLayout: $("#mainLayout"), gallery: $("#gallery"), search: $("#searchInput"), searchWrapper: $("#searchWrapper"),
        stats: $("#galleryStats"), pathTitle: $("#currentPathTitle"), breadcrumbs: $("#breadcrumbs"),
        thumbSize: $("#thumbSize"), sortBy: $("#sortBy"), sortDirBtn: $("#sortDirBtn"),
        segmentBtns: $$(".segment-btn"),
        fitToggleBtn: $("#fitToggleBtn"), fitIconCover: $("#fitIconCover"), fitIconContain: $("#fitIconContain"),
        favFilterBtn: $("#favFilterBtn"),
        settingsBtn: $("#settingsBtn"), mergerBtn: $("#mergerBtn"), themeToggle: $("#themeToggle"), logoBtn: $("#logoBtn"),
        fullscreenBtn: $("#fullscreenBtn"), helpBtn: $("#helpBtn"),
        settingsModal: $("#settingsModal"), closeSettings: $("#closeSettings"),
        cancelSettings: $("#cancelSettings"), saveSettings: $("#saveSettings"),
        outputDirInput: $("#outputDirInput"), copiesDirInput: $("#copiesDirInput"),
        selectOutputDir: $("#selectOutputDir"), selectCopiesDir: $("#selectCopiesDir"),
        themeSelect: $("#themeSelect"), langSelect: $("#langSelect"), modalThumbSize: $("#modalThumbSize"),
        modalThumbValue: $("#modalThumbValue"), modalSortBy: $("#modalSortBy"), modalSortDir: $("#modalSortDir"),
        clearCacheBtn: $("#clearCacheBtn"), cacheConfirmModal: $("#cacheConfirmModal"), confirmCacheBtn: $("#confirmCacheBtn"), cancelCacheBtn: $("#cancelCacheBtn"),
        mergerModal: $("#mergerModal"), closeMerger: $("#closeMerger"),
        addSourceBtn: $("#addSourceBtn"), clearSourcesBtn: $("#clearSourcesBtn"),
        mergerSourcesList: $("#mergerSourcesList"), mergerDestInput: $("#mergerDestInput"),
        mergerSelectDest: $("#mergerSelectDest"), mergerPrefixInput: $("#mergerPrefixInput"),
        startMergeBtn: $("#startMergeBtn"), mergerStatusArea: $("#mergerStatusArea"),
        mergerStatusText: $("#mergerStatusText"), moveFilesCheck: $("#moveFilesCheck"),
        imageModal: $("#imageModal"), modalImage: $("#modalImage"), modalTitle: $("#modalTitle"),
        closeModal: $("#closeModal"), prevBtn: $("#prevBtn"), nextBtn: $("#nextBtn"),
        copyBtn: $("#copyBtn"), copyGenBtn: $("#copyGenBtn"), downloadBtn: $("#downloadBtn"), openExplorerBtn: $("#openExplorerBtn"),
        deleteBtn: $("#deleteBtn"), favoriteBtn: $("#favoriteBtn"),
        imageCounter: $("#imageCounter"),
        filmstrip: $("#filmstrip"),
        bottomControlsWrapper: $("#bottomControlsWrapper"),
        mainControlsBar: $("#mainControlsBar"),
        toggleFilmstripBtn: $("#toggleFilmstripBtn"),
        iconFilmstripOn: $("#iconFilmstripOn"),
        iconFilmstripOff: $("#iconFilmstripOff"),
        promptContainer: $("#promptContainer"), paramsContainer: $("#paramsContainer"),
        valPositive: $("#valPositive"), valNegative: $("#valNegative"),
        valModel: $("#valModel"), valSampler: $("#valSampler"), valSteps: $("#valSteps"),
        valCfg: $("#valCfg"), valSeed: $("#valSeed"), valSize: $("#valSize"), valDate: $("#valDate"),
        copyPos: $("#copyPos"), copyNeg: $("#copyNeg"), copySeed: $("#copySeed"),
        zoomIn: $("#zoomIn"), zoomOut: $("#zoomOut"), zoomReset: $("#zoomReset"),
        zoomControls: $("#zoomControls"), zoomLevelDisplay: $("#zoomLevel"),
        modalSidebar: $("#modalSidebar"), toggleImmersiveBtn: $("#toggleImmersiveBtn"),
        immersiveControls: $("#immersiveControls"), immCopy: $("#immCopy"), immDel: $("#immDel"), immExit: $("#immExit"),
        immSlide: $("#immSlide"), immSlideIconPlay: $("#immSlideIconPlay"), immSlideIconPause: $("#immSlideIconPause"),
        videoContainer: $("#videoContainer"), modalVideo: $("#modalVideo"),
        vidPlayBtn: $("#vidPlayBtn"), iconPlay: $("#iconPlay"), iconPause: $("#iconPause"),
        vidTime: $("#vidTime"), vidProgress: $("#vidProgress"), vidMuteBtn: $("#vidMuteBtn"),
        iconVolOn: $("#iconVolOn"), iconVolOff: $("#iconVolOff"), vidVolume: $("#vidVolume"),
        deleteConfirmModal: $("#deleteConfirmModal"), delFileName: $("#delFileName"),
        cancelDeleteBtn: $("#cancelDeleteBtn"), confirmDeleteBtn: $("#confirmDeleteBtn"),
        helpModal: $("#helpModal"), closeHelp: $("#closeHelp"),
        contextMenu: $("#contextMenu"), ctxImmersive: $("#ctxImmersive"), ctxCopy: $("#ctxCopy"), ctxFolder: $("#ctxFolder"), ctxDelete: $("#ctxDelete"), ctxFav: $("#ctxFav"),
        fabRandom: $("#fabRandom"), fabTop: $("#fabTop"),
        footer: $("footer"), fabContainer: $("#fabContainer"),
        toastContainer: $("#toastContainer")
    };

    function t(key) { return locales[state.currentLang][key] || key; }

    function updateTranslations() {
        $$('[data-i18n]').forEach(elem => { elem.textContent = t(elem.dataset.i18n); });
        $$('[data-i18n-placeholder]').forEach(elem => { elem.placeholder = t(elem.dataset.i18nPlaceholder); });
        el.langSelect.value = state.currentLang;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = type === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-foreground text-background';
        toast.className = `${colors} px-4 py-2 rounded-lg shadow-lg text-sm font-medium toast-enter select-none z-50`;
        toast.textContent = message;
        el.toastContainer.appendChild(toast);
        requestAnimationFrame(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-enter-active'); });
        setTimeout(() => { toast.classList.remove('toast-enter-active'); toast.classList.add('toast-exit-active'); toast.addEventListener('transitionend', () => toast.remove()); }, 2000);
    }

    async function api(path, opts) {
        const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    async function init() {
        updateTranslations();
        updateFitIcon();
        updateBottomLayout();
        injectExtraUI(); // New Feature: Inject "Copy Image" button
        await loadConfig();
        await loadFavorites();
        await loadList('');
        setupEventListeners();
        setupFilmstripControls(); // Fix: Enable dragging and scrolling
        applyTheme(localStorage.getItem('cfs-theme') || 'system');
        setupFooterObserver();
    }

    function injectExtraUI() {
        // Inject "Copy Image Data" button into context menu
        const ctxCopy = document.getElementById('ctxCopy');
        if (ctxCopy && !document.getElementById('ctxCopyImg')) {
            const btn = document.createElement('button');
            btn.id = 'ctxCopyImg';
            btn.className = 'flex items-center gap-3 px-3 py-2.5 text-sm text-white rounded-lg hover:bg-white/10 transition-colors text-left group';
            btn.innerHTML = `
                <svg class="h-4 w-4 opacity-70 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span>${state.currentLang === 'ru' ? 'Коп. картинку' : 'Copy Image'}</span>
            `;
            btn.onclick = () => {
                if (state.contextMenuTargetIdx > -1) copyImageToClipboard(state.filteredImages[state.contextMenuTargetIdx]);
                hideContextMenu();
            };
            ctxCopy.parentNode.insertBefore(btn, ctxCopy.nextSibling);
        }
    }

    async function copyImageToClipboard(item) {
        try {
            const response = await fetch(item.url);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            showToast(state.currentLang === 'ru' ? 'Картинка скопирована!' : 'Image copied!', 'info');
        } catch (err) {
            console.error(err);
            showToast(state.currentLang === 'ru' ? 'Ошибка копирования' : 'Copy failed', 'error');
        }
    }

    async function loadFavorites() {
        try {
            const favs = await api('/api/favorites');
            state.favorites = new Set(favs);
        } catch(e) { console.error(e); }
    }

    async function loadConfig() {
        try {
            state.config = await api('/api/config');
            el.outputDirInput.value = state.config.output_dir || '';
            el.copiesDirInput.value = state.config.copies_dir || '';
            const savedSize = localStorage.getItem('cfs-thumb') || '200';
            el.thumbSize.value = savedSize;
            el.sortBy.value = state.sortBy;
            updateGridColumns(savedSize);
        } catch (e) { console.error(e); }
    }

    async function loadList(subpath = "", query = "") {
        el.gallery.innerHTML = `<div class="col-span-full h-64 flex items-center justify-center"><div class="flex flex-col items-center gap-4"><span class="loader h-10 w-10 border-4 border-primary/30 border-t-primary"></span><p class="text-muted-foreground animate-pulse">${t('scanning')}</p></div></div>`;
        el.stats.innerHTML = `<span class="loader"></span> ${t('loading')}`;
        try {
            const qParam = query ? `&q=${encodeURIComponent(query)}` : "";
            const data = await api(`/api/list?subpath=${encodeURIComponent(subpath)}${qParam}`);
            state.cwd = data.cwd || "";
            state.listing = { folders: data.folders || [], images: data.images || [] };
            updateBreadcrumbs(data.breadcrumb);
            el.pathTitle.textContent = data.cwd ? data.cwd.split('/').pop() : (query ? `Search: "${query}"` : t('galleryTitle'));
            renderGallery();
        } catch (e) { console.error(e); el.stats.textContent = t('loadError'); }
    }

    function formatPromptText(text) {
        if(!text) return "";
        let formatted = text.replace(/<([^>]+)>/g, '<span class="syntax-lora">&lt;$1&gt;</span>');
        formatted = formatted.replace(/(\([^)]+\))/g, '<span class="syntax-weight">$1</span>');
        formatted = formatted.replace(/\bBREAK\b/g, '<span class="syntax-break">BREAK</span>');
        return formatted;
    }

    function renderGallery() {
        const fType = state.filterType;
        el.gallery.innerHTML = '';
        
        const folders = state.listing.folders;
        const tplFolder = $("#tpl-folder-card");
        
        if (fType !== 'favorites') {
            folders.forEach(f => {
                const node = tplFolder.content.cloneNode(true);
                node.querySelector('h3').textContent = f.name;
                const countText = f.count !== undefined && f.count !== "?" ? f.count : '?';
                node.querySelector('.count').textContent = countText;
                node.querySelector('.group').onclick = () => loadList(f.relPath);
                el.gallery.appendChild(node);
            });
        }

        let images = state.listing.images.filter(img => {
            if (fType === 'favorites' && !state.favorites.has(img.relPath)) return false;
            if (fType === 'image' && img.type !== 'image') return false;
            if (fType === 'video' && img.type !== 'video') return false;
            return true;
        });

        const key = state.sortBy;
        const dir = state.sortDir === 'asc' ? 1 : -1;
        images.sort((a, b) => {
            let va = a[key], vb = b[key];
            if (key === 'name') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
        });
        
        state.filteredImages = images;
        el.stats.textContent = `${folders.length} ${t('folders')} • ${images.length} ${t('files')}`;

        if (folders.length === 0 && images.length === 0) {
            el.gallery.innerHTML = '';
            el.gallery.appendChild($("#tpl-empty-state").content.cloneNode(true));
            return;
        }

        const tplImg = $("#tpl-image-card");
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.thumb;
                    img.onload = () => { img.classList.remove('opacity-0'); };
                    io.unobserve(img);
                }
            });
        });

        images.forEach((img, idx) => {
            const node = tplImg.content.cloneNode(true);
            const imgEl = node.querySelector('img');
            const group = node.querySelector('.group');
            const videoContainer = node.querySelector('.hover-video-container');
            
            imgEl.src = EMPTY_PIXEL; 
            imgEl.dataset.thumb = img.thumb;
            if (state.fitMode === 'contain') {
                imgEl.classList.remove('object-cover');
                imgEl.classList.add('object-contain');
                group.classList.remove('aspect-square');
                group.classList.add('h-64');
            }

            if (img.type === 'video') {
                node.querySelector('.video-indicator').classList.remove('hidden');
                group.onmouseenter = () => {
                    if(videoContainer.querySelector('video')) return;
                    const vid = document.createElement('video');
                    vid.src = img.url;
                    vid.muted = true;
                    vid.autoplay = true;
                    vid.loop = true;
                    vid.className = "w-full h-full object-cover absolute inset-0 fade-in";
                    if(state.fitMode === 'contain') vid.classList.add('object-contain');
                    else vid.classList.add('object-cover');
                    videoContainer.appendChild(vid);
                };
                group.onmouseleave = () => videoContainer.innerHTML = '';
            }
            
            const isFav = state.favorites.has(img.relPath);
            if (isFav) node.querySelector('.favorite-indicator').classList.remove('hidden');

            node.querySelector('.name-label').textContent = img.name;
            
            group.onclick = () => openModal(idx);
            group.oncontextmenu = (e) => {
                e.preventDefault();
                showContextMenu(e, idx);
            };

            io.observe(imgEl);
            el.gallery.appendChild(node);
        });
    }

    function updateGridColumns(size) { el.gallery.style.gridTemplateColumns = `repeat(auto-fill, minmax(${parseInt(size)}px, 1fr))`; }

    function updateBreadcrumbs(crumbs) {
        el.breadcrumbs.innerHTML = '';
        if (!crumbs) return;
        crumbs.forEach((c, i) => {
            const li = document.createElement('li');
            li.className = "inline-flex items-center";
            if (i > 0) {
                const separator = document.createElement('div');
                separator.className = "text-muted-foreground/50 mx-1";
                separator.innerHTML = `<svg class="rtl:rotate-180 w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 6 10"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/></svg>`;
                li.appendChild(separator);
            }
            const content = i === 0 ? `<svg class="w-4 h-4" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"><path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/></svg>` : c.name;
            const a = document.createElement('a');
            a.href = "#";
            a.className = `ms-1 text-sm font-medium flex items-center ${i === crumbs.length - 1 ? 'text-foreground' : 'text-muted-foreground hover:text-primary transition-colors'}`;
            a.innerHTML = content;
            if (i !== crumbs.length - 1) a.onclick = (e) => { e.preventDefault(); loadList(c.relPath); };
            li.appendChild(a);
            el.breadcrumbs.appendChild(li);
        });
    }

    function applyTheme(theme) {
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('cfs-theme', theme);
        el.themeSelect.value = theme;
    }

    function showContextMenu(e, idx) {
        state.contextMenuTargetIdx = idx;
        const x = e.clientX;
        const y = e.clientY;
        
        el.contextMenu.style.left = `${x}px`;
        el.contextMenu.style.top = `${y}px`;
        el.contextMenu.classList.remove('hidden');
        
        const rect = el.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) el.contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        if (rect.bottom > window.innerHeight) el.contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    function hideContextMenu() {
        el.contextMenu.classList.add('hidden');
        state.contextMenuTargetIdx = -1;
    }
    
    document.addEventListener('click', (e) => {
        if (!el.contextMenu.classList.contains('hidden')) hideContextMenu();
    });

    el.ctxImmersive.onclick = () => { 
        if(state.contextMenuTargetIdx > -1) {
             openModal(state.contextMenuTargetIdx).then(() => toggleImmersive(true));
        }
    };
    el.ctxFav.onclick = () => {
        if(state.contextMenuTargetIdx > -1) toggleFavoriteByIdx(state.contextMenuTargetIdx);
    };
    el.ctxCopy.onclick = async () => {
        if(state.contextMenuTargetIdx === -1) return;
        try {
            await api('/api/copy', { method: 'POST', body: JSON.stringify({ relpath: state.filteredImages[state.contextMenuTargetIdx].relPath }) });
            showToast(t('copied'), 'info');
        } catch (e) { showToast(t('copyError'), 'error'); }
    };
    el.ctxFolder.onclick = () => {
         if(state.contextMenuTargetIdx > -1)
            api('/api/open_in_explorer', { method: 'POST', body: JSON.stringify({ relpath: state.filteredImages[state.contextMenuTargetIdx].relPath }) });
    };
    el.ctxDelete.onclick = () => {
        if(state.contextMenuTargetIdx === -1) return;
        const item = state.filteredImages[state.contextMenuTargetIdx];
        confirmDelete(item.name, async () => {
             try {
                await api('/api/delete', { method: 'POST', body: JSON.stringify({ relpath: item.relPath }) });
                state.filteredImages.splice(state.contextMenuTargetIdx, 1);
                state.listing.images = state.listing.images.filter(i => i.relPath !== item.relPath);
                renderGallery();
                showToast(t('delBtn'), 'info');
            } catch (e) { showToast(t('deleteError'), 'error'); }
        });
    };

    async function openModal(idx) {
        if (idx < 0 || idx >= state.filteredImages.length) return;
        state.currentIndex = idx;
        
        updateImageCounter();
        
        if (state.showFilmstrip) {
            buildFilmstrip();
        }

        if (state.isImmersive) {
            el.imageModal.classList.add('immersive-active');
        }

        el.imageModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        await updateModalContent(state.filteredImages[idx]);
    }
    
    // --- NEW: Enhanced Filmstrip Feature ---
    function buildFilmstrip() {
        if (!state.showFilmstrip) return;
        
        el.filmstrip.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        state.filteredImages.forEach((item, i) => {
            const img = document.createElement('img');
            img.src = item.thumb;
            img.loading = "lazy";
            img.className = `filmstrip-thumb w-12 h-12 md:w-16 md:h-16 object-cover rounded-md cursor-pointer border-2 border-transparent flex-shrink-0 select-none`;
            img.dataset.index = i;
            img.draggable = false;
            
            img.onclick = (e) => {
                if (state.isFilmstripDragging) return;
                e.stopPropagation();
                state.currentIndex = i;
                updateImageCounter();
                updateFilmstripActive();
                updateModalContent(state.filteredImages[i]);
            };
            fragment.appendChild(img);
        });
        
        el.filmstrip.appendChild(fragment);
        updateFilmstripActive();
    }

    function updateFilmstripActive() {
        if (!state.showFilmstrip) return;
        
        const thumbs = el.filmstrip.querySelectorAll('.filmstrip-thumb');
        thumbs.forEach(t => t.classList.remove('active'));
        
        const activeThumb = thumbs[state.currentIndex];
        if (activeThumb) {
            activeThumb.classList.add('active');
            // Improved centering logic
            const container = el.filmstrip;
            const scrollPos = activeThumb.offsetLeft - (container.clientWidth / 2) + (activeThumb.clientWidth / 2);
            container.scrollTo({ left: scrollPos, behavior: 'smooth' });
        }
    }

    function setupFilmstripControls() {
        // Mouse Wheel horizontal scroll
        el.filmstrip.addEventListener('wheel', (e) => {
            e.preventDefault();
            el.filmstrip.scrollLeft += e.deltaY;
        }, { passive: false });

        // Drag-to-Scroll functionality
        el.filmstrip.addEventListener('mousedown', (e) => {
            state.isFilmstripDragging = false;
            state.filmstripStartX = e.pageX - el.filmstrip.offsetLeft;
            state.filmstripScrollLeft = el.filmstrip.scrollLeft;
            
            const onMove = (e) => {
                state.isFilmstripDragging = true;
                e.preventDefault();
                const x = e.pageX - el.filmstrip.offsetLeft;
                const walk = (x - state.filmstripStartX) * 1.5; // Drag speed
                el.filmstrip.scrollLeft = state.filmstripScrollLeft - walk;
            };
            
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                setTimeout(() => { state.isFilmstripDragging = false; }, 50);
            };
            
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    }

    function toggleFilmstripVisibility() {
        state.showFilmstrip = !state.showFilmstrip;
        localStorage.setItem('cfs-filmstrip', state.showFilmstrip);
        updateBottomLayout();
        if(state.showFilmstrip && el.filmstrip.innerHTML === '') {
            buildFilmstrip();
        }
    }

    function updateBottomLayout() {
        if (state.showFilmstrip) {
            el.filmstrip.classList.remove('hidden');
            el.iconFilmstripOn.classList.remove('hidden');
            el.iconFilmstripOff.classList.add('hidden');
            
            if (state.isImmersive) {
                el.bottomControlsWrapper.classList.remove('justify-center');
                el.bottomControlsWrapper.classList.add('justify-between');
                el.mainControlsBar.classList.remove('mx-auto');
            } else {
                el.bottomControlsWrapper.classList.remove('justify-between');
                el.bottomControlsWrapper.classList.add('justify-center');
                 if (window.innerWidth <= 768) {
                    el.bottomControlsWrapper.classList.add('flex-col', 'items-center');
                 }
            }
        } else {
            el.filmstrip.classList.add('hidden');
            el.iconFilmstripOn.classList.add('hidden');
            el.iconFilmstripOff.classList.remove('hidden');
            
            el.bottomControlsWrapper.classList.remove('justify-between', 'flex-col');
            el.bottomControlsWrapper.classList.add('justify-center');
            el.mainControlsBar.classList.add('mx-auto');
        }
    }

    function updateImageCounter() {
        el.imageCounter.textContent = `${state.currentIndex + 1} / ${state.filteredImages.length}`;
    }
    
    async function updateModalContent(item) {
        resetZoom();
        if (state.showFilmstrip) updateFilmstripActive();
        
        el.modalVideo.pause();
        el.modalImage.src = ""; 
        el.modalVideo.src = "";
        el.modalImage.style.display = "none";
        el.videoContainer.style.display = "none";
        
        el.modalTitle.textContent = item.name;
        el.valPositive.textContent = t('loading');
        el.valNegative.textContent = t('loading');
        state.currentMeta = null;
        updateFavoriteBtn(item.relPath);

        try {
            const meta = await api(`/api/image?relpath=${encodeURIComponent(item.relPath)}`);
            state.currentMeta = meta;
            
            if (meta.type === 'video') {
                // FIX: Hide filmstrip for videos
                el.filmstrip.classList.add('hidden'); 
                
                el.videoContainer.style.display = "flex";
                el.zoomControls.classList.add('hidden');
                el.modalVideo.src = meta.url;
                el.modalVideo.currentTime = 0;
                el.modalVideo.volume = parseFloat(el.vidVolume.value);
                el.modalVideo.play().then(() => updatePlayIcon(true)).catch(() => updatePlayIcon(false));
                
                el.promptContainer.classList.add('hidden');
                $$('#paramsContainer .meta-field').forEach(div => {
                   const label = div.querySelector('p').textContent;
                   if(!label.includes('Size') && !label.includes('Created')) div.classList.add('hidden');
                });

            } else {
                // FIX: Restore filmstrip if enabled
                if (state.showFilmstrip) el.filmstrip.classList.remove('hidden');

                el.modalImage.style.display = "block";
                if(!el.zoomControls.classList.contains('hidden') || !state.isImmersive) {
                     el.zoomControls.classList.remove('hidden'); 
                }
                
                el.promptContainer.classList.remove('hidden');
                $$('#paramsContainer .meta-field').forEach(div => div.classList.remove('hidden'));

                el.modalImage.classList.add('opacity-0');
                el.modalImage.src = meta.url;
                el.modalImage.onload = () => {
                    el.modalImage.classList.remove('opacity-0');
                };
            }

            el.modalTitle.textContent = meta.displayName || meta.name;
            el.valPositive.innerHTML = formatPromptText(meta.positive || t('noData'));
            el.valNegative.innerHTML = formatPromptText(meta.negative || t('noData'));
            
            const p = meta.parameters || {};
            el.valModel.textContent = p.Model || "?";
            el.valSampler.textContent = p.Sampler || "?";
            if (p.Scheduler) el.valSampler.textContent += " (" + p.Scheduler + ")";
            el.valSteps.textContent = p.Steps || "?";
            el.valCfg.textContent = p['CFG scale'] || "?";
            el.valSeed.textContent = p.Seed || "?";
            
            let sizeStr = p.Size || `${meta.width}x${meta.height}`;
            if (meta.duration > 0) sizeStr += ` (${meta.duration.toFixed(1)}s)`;
            el.valSize.textContent = sizeStr;
            el.valDate.textContent = new Date(meta.mtime * 1000).toLocaleString();
        } catch (e) { console.error(e); }
    }

    function updateFavoriteBtn(relPath) {
        const isFav = state.favorites.has(relPath);
        el.favoriteBtn.innerHTML = isFav 
            ? `<svg class="h-6 w-6 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
            : `<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;
    }

    async function toggleFavorite() {
        if (state.currentIndex === -1) return;
        toggleFavoriteByIdx(state.currentIndex);
    }
    
    async function toggleFavoriteByIdx(idx) {
        const item = state.filteredImages[idx];
        const relPath = item.relPath;
        try {
            const res = await api('/api/favorites', { method: 'POST', body: JSON.stringify({ relpath: relPath }) });
            if (res.isFavorite) state.favorites.add(relPath);
            else state.favorites.delete(relPath);
            
            if(state.currentIndex === idx) updateFavoriteBtn(relPath);
            renderGallery(); 
        } catch (e) { console.error(e); }
    }

    function closeModal() {
        el.imageModal.classList.add('hidden');
        el.modalVideo.pause();
        el.modalVideo.src = "";
        document.body.style.overflow = '';
        stopSlideshow();
    }

    function updateMergerSources() {
        el.mergerSourcesList.innerHTML = '';
        if (state.mergerSources.length === 0) {
            el.mergerSourcesList.innerHTML = `<div class="text-sm text-muted-foreground italic empty-msg">${t('emptySources')}</div>`;
            return;
        }
        state.mergerSources.forEach((src, i) => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-background p-2 rounded border border-border text-sm";
            div.innerHTML = `<span class="truncate flex-1 mr-2 font-mono">${src}</span>`;
            const btn = document.createElement('button');
            btn.className = "text-muted-foreground hover:text-destructive";
            btn.innerHTML = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            btn.onclick = () => { state.mergerSources.splice(i, 1); updateMergerSources(); };
            div.appendChild(btn);
            el.mergerSourcesList.appendChild(div);
        });
    }

    async function startMerge() {
        if (state.mergerSources.length === 0 || !el.mergerDestInput.value || !el.mergerPrefixInput.value) {
            showToast(t('fillFields'), 'error');
            return;
        }
        el.startMergeBtn.disabled = true;
        el.startMergeBtn.classList.add('opacity-50');
        el.mergerStatusArea.classList.remove('hidden');
        el.mergerStatusText.textContent = t('processing');
        
        try {
            const res = await api('/api/merge', {
                method: 'POST',
                body: JSON.stringify({
                    sources: state.mergerSources,
                    destination: el.mergerDestInput.value,
                    prefix: el.mergerPrefixInput.value,
                    move: el.moveFilesCheck.checked
                })
            });
            el.mergerStatusText.textContent = t('mergeDone').replace('{count}', res.count).replace('{errors}', res.errors || 0);
            setTimeout(() => {
                 el.mergerStatusArea.classList.add('hidden');
                 el.startMergeBtn.disabled = false;
                 el.startMergeBtn.classList.remove('opacity-50');
                 loadList('');
            }, 3000);
        } catch(e) {
            el.mergerStatusText.textContent = t('mergeError').replace('{msg}', e.message);
            el.startMergeBtn.disabled = false;
            el.startMergeBtn.classList.remove('opacity-50');
        }
    }

    function toggleImmersive(forceState) {
        const newState = forceState !== undefined ? forceState : !state.isImmersive;
        state.isImmersive = newState;
        if (newState) {
            el.imageModal.classList.add('immersive-active');
        } else {
            el.imageModal.classList.remove('immersive-active');
            stopSlideshow(); 
        }
        updateBottomLayout();
    }

    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    function updatePlayIcon(isPlaying) {
        if (isPlaying) { el.iconPlay.classList.add('hidden'); el.iconPause.classList.remove('hidden'); } 
        else { el.iconPlay.classList.remove('hidden'); el.iconPause.classList.add('hidden'); }
    }
    function formatTime(s) {
        const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0'+sec : sec}`;
    }
    el.vidPlayBtn.onclick = () => { if(el.modalVideo.paused) el.modalVideo.play(); else el.modalVideo.pause(); };
    el.modalVideo.onplay = () => updatePlayIcon(true);
    el.modalVideo.onpause = () => updatePlayIcon(false);
    el.modalVideo.ontimeupdate = () => {
        if(el.modalVideo.duration) {
            const pct = (el.modalVideo.currentTime / el.modalVideo.duration) * 100;
            el.vidProgress.value = pct;
            el.vidTime.textContent = formatTime(el.modalVideo.currentTime);
        }
    };
    el.vidProgress.oninput = () => { const time = (el.vidProgress.value / 100) * el.modalVideo.duration; el.modalVideo.currentTime = time; };
    el.vidMuteBtn.onclick = () => { el.modalVideo.muted = !el.modalVideo.muted; updateVolIcon(); };
    el.vidVolume.oninput = () => { el.modalVideo.volume = el.vidVolume.value; el.modalVideo.muted = false; updateVolIcon(); };
    function updateVolIcon() {
        if(el.modalVideo.muted || el.modalVideo.volume === 0) { el.iconVolOn.classList.add('hidden'); el.iconVolOff.classList.remove('hidden'); }
        else { el.iconVolOn.classList.remove('hidden'); el.iconVolOff.classList.add('hidden'); }
    }

    function confirmDelete(filename, onConfirm) {
        el.delFileName.textContent = filename;
        state.deleteCallback = onConfirm;
        el.deleteConfirmModal.classList.remove('hidden');
        stopSlideshow();
    }
    el.cancelDeleteBtn.onclick = () => el.deleteConfirmModal.classList.add('hidden');
    el.confirmDeleteBtn.onclick = () => {
        if(state.deleteCallback) state.deleteCallback();
        el.deleteConfirmModal.classList.add('hidden');
    };

    function nextImage(smooth = false) { 
        const nextIdx = state.currentIndex + 1;
        if (nextIdx >= state.filteredImages.length) {
            if (state.slideshowInterval) stopSlideshow(); 
            return;
        }
        state.currentIndex = nextIdx;
        updateImageCounter();
        if (smooth) {
             el.modalImage.classList.add('opacity-0');
             setTimeout(() => {
                 updateModalContent(state.filteredImages[state.currentIndex]);
             }, 300);
        } else {
            el.modalImage.style.opacity = '1'; 
            el.modalImage.classList.remove('opacity-0');
            updateModalContent(state.filteredImages[state.currentIndex]);
        }
    }
    function prevImage() { 
        openModal(state.currentIndex - 1); 
    }

    function updateTransform() {
        el.modalImage.style.transform = `translate(${state.imageX}px, ${state.imageY}px) scale(${state.zoomLevel})`;
        el.zoomLevelDisplay.textContent = Math.round(state.zoomLevel * 100) + "%";
        el.modalImage.style.cursor = state.zoomLevel > 1 ? 'grab' : 'default';
    }
    function resetZoom() { state.zoomLevel = 1; state.imageX = 0; state.imageY = 0; updateTransform(); }
    function handleZoom(delta) {
        if(el.modalImage.style.display === 'none') return;
        const newZoom = state.zoomLevel + delta;
        if (newZoom >= 0.1 && newZoom <= 5) { state.zoomLevel = newZoom; updateTransform(); }
    }

    async function deleteCurrent() {
        const item = state.filteredImages[state.currentIndex];
        confirmDelete(item.name, async () => {
            try {
                await api('/api/delete', { method: 'POST', body: JSON.stringify({ relpath: item.relPath }) });
                state.filteredImages.splice(state.currentIndex, 1);
                state.listing.images = state.listing.images.filter(i => i.relPath !== item.relPath);
                if (state.filteredImages.length > 0) {
                    if (state.currentIndex >= state.filteredImages.length) state.currentIndex--;
                    updateImageCounter();
                    updateModalContent(state.filteredImages[state.currentIndex]);
                    renderGallery(); 
                } else { closeModal(); loadList(state.cwd); }
                showToast(t('delBtn'), 'info');
            } catch (e) { showToast(t('deleteError'), 'error'); }
        });
    }

    async function copyToClipboard(text, btn) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            const original = btn.innerHTML;
            btn.innerHTML = `<svg class="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
            setTimeout(() => btn.innerHTML = original, 1500);
        } catch (e) { console.error(e); }
    }

    async function copyFile() {
        const item = state.filteredImages[state.currentIndex];
        try {
            await api('/api/copy', { method: 'POST', body: JSON.stringify({ relpath: item.relPath }) });
            showToast(t('copied'), 'info');
        } catch (e) { showToast(t('copyError'), 'error'); }
    }

    async function copyGenData() {
        if (!state.currentMeta) return;
        const m = state.currentMeta;
        const p = m.parameters || {};
        let text = m.positive || "";
        if (m.negative) text += `\nNegative prompt: ${m.negative}`;
        text += `\nSteps: ${p.Steps || "?"}, Sampler: ${p.Sampler || "?"}, CFG scale: ${p['CFG scale'] || "?"}, Seed: ${p.Seed || "?"}, Size: ${p.Size || "?"}, Model: ${p.Model || "?"}`;
        copyToClipboard(text, el.copyGenBtn);
    }

    function pickRandomImage() {
        if(state.filteredImages.length === 0) return;
        const randIdx = Math.floor(Math.random() * state.filteredImages.length);
        openModal(randIdx);
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    el.immSlide.onclick = toggleSlideshow;

    function toggleSlideshow() {
        if (state.slideshowInterval) {
            stopSlideshow();
        } else {
            startSlideshow();
        }
    }
    function startSlideshow() {
        if (state.filteredImages.length === 0) return;
        el.immSlideIconPlay.classList.add('hidden');
        el.immSlideIconPause.classList.remove('hidden');
        
        if (!state.isImmersive) toggleImmersive(true);

        if (state.currentIndex === -1) openModal(0);
        
        state.slideshowInterval = setInterval(() => {
            nextImage(true);
        }, 4000);
    }
    function stopSlideshow() {
        if (state.slideshowInterval) {
            clearInterval(state.slideshowInterval);
            state.slideshowInterval = null;
        }
        el.immSlideIconPlay.classList.remove('hidden');
        el.immSlideIconPause.classList.add('hidden');
    }
    
    function setupFooterObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const y = entry.isIntersecting ? '-60px' : '0';
                el.fabContainer.style.transform = `translateY(${y})`;
                el.searchWrapper.style.transform = `translateY(${y})`;
            });
        }, { threshold: 0.1 });
        observer.observe(el.footer);
    }
    
    function toggleFitMode() {
        state.fitMode = state.fitMode === 'cover' ? 'contain' : 'cover';
        localStorage.setItem('cfs-fit', state.fitMode);
        updateFitIcon();
        renderGallery();
    }
    
    function updateFitIcon() {
        if (state.fitMode === 'contain') {
            el.fitIconCover.classList.add('hidden');
            el.fitIconContain.classList.remove('hidden');
        } else {
            el.fitIconCover.classList.remove('hidden');
            el.fitIconContain.classList.add('hidden');
        }
    }

    function setupEventListeners() {
        el.search.addEventListener('input', (e) => {
            const val = e.target.value;
            clearTimeout(state.searchTimeout);
            state.searchTimeout = setTimeout(() => { loadList(state.cwd, val); }, 500);
        });

        el.sortBy.addEventListener('change', () => { state.sortBy = el.sortBy.value; localStorage.setItem('cfs-sortBy', state.sortBy); renderGallery(); });
        el.sortDirBtn.addEventListener('click', () => {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            localStorage.setItem('cfs-sortDir', state.sortDir);
            $("#sortDirIcon").style.transform = state.sortDir === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)';
            renderGallery();
        });

        el.segmentBtns.forEach(btn => {
            btn.onclick = () => {
                el.segmentBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.filterType = btn.dataset.filter;
                if (state.filterType !== 'favorites' && state.filterType !== 'all') {
                    el.favFilterBtn.classList.remove('text-red-500', 'bg-red-500/10');
                }
                renderGallery();
            };
        });

        el.thumbSize.addEventListener('input', (e) => { localStorage.setItem('cfs-thumb', e.target.value); updateGridColumns(e.target.value); });
        el.fitToggleBtn.onclick = toggleFitMode;
        el.logoBtn.onclick = () => loadList('');
        el.themeToggle.onclick = () => { const current = localStorage.getItem('cfs-theme') || 'system'; applyTheme(current === 'dark' ? 'light' : 'dark'); };
        el.fullscreenBtn.onclick = toggleFullScreen;
        el.helpBtn.onclick = () => el.helpModal.classList.remove('hidden');
        el.closeHelp.onclick = () => el.helpModal.classList.add('hidden');
        el.toggleFilmstripBtn.onclick = toggleFilmstripVisibility;
        
        el.favFilterBtn.onclick = () => {
             if(state.filterType === 'favorites') {
                 state.filterType = 'all';
                 el.segmentBtns.forEach(b => b.classList.remove('active'));
                 el.segmentBtns[0].classList.add('active');
                 el.favFilterBtn.classList.remove('text-red-500', 'bg-red-500/10');
             } else {
                 state.filterType = 'favorites';
                 el.segmentBtns.forEach(b => b.classList.remove('active'));
                 el.favFilterBtn.classList.add('text-red-500', 'bg-red-500/10');
             }
             renderGallery();
        };

        el.settingsBtn.onclick = () => {
            el.modalThumbSize.value = el.thumbSize.value; el.modalThumbValue.textContent = el.thumbSize.value + 'px';
            el.modalSortBy.value = state.sortBy; el.modalSortDir.value = state.sortDir;
            el.settingsModal.classList.remove('hidden');
        };
        const hideSettings = () => el.settingsModal.classList.add('hidden');
        el.closeSettings.onclick = hideSettings; el.cancelSettings.onclick = hideSettings;
        el.settingsModal.onclick = (e) => { if(e.target === el.settingsModal) hideSettings(); };
        el.modalThumbSize.addEventListener('input', (e) => el.modalThumbValue.textContent = e.target.value + 'px');
        el.selectOutputDir.onclick = () => selectFolder(el.outputDirInput);
        el.selectCopiesDir.onclick = () => selectFolder(el.copiesDirInput);
        el.saveSettings.onclick = async () => {
            await api('/api/config', { method: 'POST', body: JSON.stringify({ output_dir: el.outputDirInput.value, copies_dir: el.copiesDirInput.value })});
            await loadConfig(); await loadList('');
            localStorage.setItem('cfs-thumb', el.modalThumbSize.value); updateGridColumns(el.modalThumbSize.value);
            state.sortBy = el.modalSortBy.value; el.sortBy.value = state.sortBy; localStorage.setItem('cfs-sortBy', state.sortBy);
            state.sortDir = el.modalSortDir.value; localStorage.setItem('cfs-sortDir', state.sortDir);
            applyTheme(el.themeSelect.value); 
            state.currentLang = el.langSelect.value; localStorage.setItem('cfs-lang', state.currentLang); updateTranslations();
            hideSettings();
        };
        
        el.clearCacheBtn.onclick = () => el.cacheConfirmModal.classList.remove('hidden');
        el.cancelCacheBtn.onclick = () => el.cacheConfirmModal.classList.add('hidden');
        el.confirmCacheBtn.onclick = async () => {
             await api('/api/cache/clear', { method: 'POST' });
             showToast(t('cacheCleared'), 'info');
             el.cacheConfirmModal.classList.add('hidden');
             loadList('');
        };

        el.mergerBtn.onclick = () => el.mergerModal.classList.remove('hidden');
        el.closeMerger.onclick = () => el.mergerModal.classList.add('hidden');
        el.mergerModal.onclick = (e) => { if(e.target === el.mergerModal) el.mergerModal.classList.add('hidden'); };
        el.addSourceBtn.onclick = async () => {
            try { const res = await api('/api/select_folder', { method: 'POST' }); if(res.folder_path) { state.mergerSources.push(res.folder_path); updateMergerSources(); } } catch {}
        };
        el.clearSourcesBtn.onclick = () => { state.mergerSources = []; updateMergerSources(); };
        el.mergerSelectDest.onclick = () => selectFolder(el.mergerDestInput);
        el.startMergeBtn.onclick = startMerge;

        el.prevBtn.onclick = (e) => { e.stopPropagation(); prevImage(); };
        el.nextBtn.onclick = (e) => { e.stopPropagation(); nextImage(); };
        el.closeModal.onclick = closeModal;
        
        document.addEventListener('keydown', e => {
            if (el.imageModal.classList.contains('hidden')) return;
            if (e.key === 'Escape') {
                if (state.isImmersive) toggleImmersive(false);
                else closeModal();
            }
            if (e.key === 'f' || e.key === 'F') toggleImmersive();
            if (e.key === 'v' || e.key === 'V') toggleFilmstripVisibility();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'Delete' && el.deleteConfirmModal.classList.contains('hidden')) deleteCurrent();
            
            // Enhanced Navigation
            if (e.key === 'Home') openModal(0);
            if (e.key === 'End') openModal(state.filteredImages.length - 1);
            if (e.key === 'r' || e.key === 'R') pickRandomImage();
            if (e.key === ' ') {
                e.preventDefault();
                const item = state.filteredImages[state.currentIndex];
                if (item.type === 'video') {
                    if (el.modalVideo.paused) el.modalVideo.play(); else el.modalVideo.pause();
                } else {
                    toggleSlideshow();
                }
            }
        });

        el.copyBtn.onclick = copyFile; 
        el.copyGenBtn.onclick = copyGenData;
        el.deleteBtn.onclick = deleteCurrent;
        el.favoriteBtn.onclick = toggleFavorite;
        el.downloadBtn.onclick = () => window.open(`/api/download?relpath=${encodeURIComponent(state.filteredImages[state.currentIndex].relPath)}`);
        el.openExplorerBtn.onclick = () => api('/api/open_in_explorer', { method: 'POST', body: JSON.stringify({ relpath: state.filteredImages[state.currentIndex].relPath }) });
        el.copyPos.onclick = function() { copyToClipboard(el.valPositive.textContent, this); };
        el.copyNeg.onclick = function() { copyToClipboard(el.valNegative.textContent, this); };
        el.copySeed.onclick = function() { copyToClipboard(el.valSeed.textContent, this); };
        
        el.zoomIn.onclick = (e) => { e.stopPropagation(); handleZoom(0.25); };
        el.zoomOut.onclick = (e) => { e.stopPropagation(); handleZoom(-0.25); };
        el.zoomReset.onclick = (e) => { e.stopPropagation(); resetZoom(); };
        
        el.modalImage.addEventListener('wheel', (e) => { if (!el.imageModal.classList.contains('hidden')) { e.preventDefault(); handleZoom(e.deltaY < 0 ? 0.1 : -0.1); }});
        el.modalImage.addEventListener('mousedown', e => { if (state.zoomLevel > 1) { e.preventDefault(); state.isDragging = true; state.startX = e.clientX - state.imageX; state.startY = e.clientY - state.imageY; el.modalImage.style.cursor = 'grabbing'; }});
        window.addEventListener('mouseup', () => { state.isDragging = false; if(state.zoomLevel > 1) el.modalImage.style.cursor = 'grab'; });
        window.addEventListener('mousemove', e => { if (state.isDragging) { e.preventDefault(); state.imageX = e.clientX - state.startX; state.imageY = e.clientY - state.startY; updateTransform(); }});
        
        // Double click zoom
        el.modalImage.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (state.zoomLevel !== 1) resetZoom();
            else {
                state.zoomLevel = 2.5;
                updateTransform();
            }
        });
        
        el.toggleImmersiveBtn.onclick = () => toggleImmersive();
        el.immExit.onclick = () => toggleImmersive(false);
        el.immCopy.onclick = copyFile;
        el.immDel.onclick = deleteCurrent;
        el.fabRandom.onclick = pickRandomImage;
        el.fabTop.onclick = scrollToTop;

        async function selectFolder(input) { try { const res = await api('/api/select_folder', { method: 'POST' }); if (res.folder_path) input.value = res.folder_path; } catch { const p = prompt("Path:"); if(p) input.value = p; }}
    }
    init();
})();