
// Core navigation tanpa sidebar lama: semua tombol .sidebar-link tetap bisa membuka workspace.
(function () {
  async function loadActiveAdminPage(pageId) {
    if (typeof window.loadAdminPage !== "function") return;
    await window.loadAdminPage(pageId);
  }

  function activateAdminPage(pageId, options = {}) {
    if (!pageId) return;
    const page = document.getElementById(pageId);
    if (!page) return;

    document.querySelectorAll(".admin-page").forEach((item) => {
      item.classList.toggle("active", item.id === pageId);
    });

    document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageId);
    });

    document.querySelectorAll(".smart-dock-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === pageId);
    });

    const workspace = document.getElementById("v8WorkspaceState");
    const activeTitle = page.querySelector("h2, h3");
    if (workspace && activeTitle) workspace.textContent = activeTitle.textContent.trim();

    localStorage.setItem("saupi-admin-last-page", pageId);
    document.body.classList.remove("admin-menu-open", "admin-palette-open");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (options.load !== false) {
      loadActiveAdminPage(pageId);
    }
  }

  window.activateAdminPage = activateAdminPage;

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        activateAdminPage(link.dataset.page);
      });
    });

    const last = localStorage.getItem("saupi-admin-last-page");
    if (last && document.getElementById(last)) activateAdminPage(last);
    else activateAdminPage("dashboardPage");
  });
})();


// admin-modern.js - UX tambahan untuk admin modern SA-UPI
(function () {
  const body = document.body;

  function goToPage(pageId) {
    if (window.activateAdminPage) window.activateAdminPage(pageId);
    else document.querySelector(`.sidebar-link[data-page="${pageId}"]`)?.click();
    body.classList.remove("admin-menu-open");
  }

  function setupMobileMenu() {
    const toggle = document.querySelector(".admin-mobile-toggle");
    const overlay = document.getElementById("adminOverlay");
    if (toggle) {
      toggle.addEventListener("click", () => {
        body.classList.toggle("admin-menu-open");
      });
    }
    if (overlay) {
      overlay.addEventListener("click", () => body.classList.remove("admin-menu-open"));
    }
    document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
      link.addEventListener("click", () => body.classList.remove("admin-menu-open"));
    });
  }

  function setupGlobalSearch() {
    const input = document.getElementById("adminGlobalSearch");
    if (!input) return;

    const menuMap = [
      ["dashboard beranda home", "dashboardPage"],
      ["info informasi kampus pengumuman berita", "infoPage"],
      ["wiki artikel panduan konten", "wikiPage"],
      ["lowongan kerja magang karir job", "jobPage"],
      ["dokumen file kampus pdf", "dokumenPage"],
      ["faq kampus pertanyaan", "faqPage"],
      ["jurusan prodi program studi", "jurusanPage"],
      ["statistik penerimaan peminat daya tampung", "statistikPage"],
      ["biaya pendidikan ukt ipi", "biayaPendidikanPage"],
      ["faq jurusan prodi", "faqJurusanPage"],
      ["menfess analyzer analisis curhat pertanyaan internal", "menfessAnalyzerPage"],
      ["kategori tag taxonomy pengaturan", "taxonomyPage"]
    ];

    function runSearch() {
      const keyword = input.value.trim().toLowerCase();
      if (!keyword) return;
      const found = menuMap.find(([terms]) => terms.includes(keyword) || keyword.split(/\s+/).some((word) => terms.includes(word)));
      if (found) {
        goToPage(found[1]);
        input.value = "";
      }
    }

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") runSearch();
      if (event.key === "Escape") input.blur();
    });

    document.addEventListener("keydown", (event) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const pressed = isMac ? event.metaKey && event.key.toLowerCase() === "k" : event.ctrlKey && event.key.toLowerCase() === "k";
      if (pressed) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenu();
    setupGlobalSearch();
  });
})();

// v3: tambah sentuhan UX kecil tanpa mengganggu script CRUD lama
(function () {
  function enhanceSearchPlaceholder() {
    const input = document.getElementById("adminGlobalSearch");
    if (!input) return;
    const hints = [
      "Cari: wiki, lowongan, jurusan...",
      "Ketik 'ukt' untuk Biaya Pendidikan...",
      "Ketik 'faq' untuk FAQ Kampus...",
      "Tekan Ctrl + K dari mana saja..."
    ];
    let index = 0;
    window.setInterval(() => {
      if (document.activeElement === input || input.value) return;
      index = (index + 1) % hints.length;
      input.placeholder = hints[index];
    }, 2800);
  }

  function markDirtyForms() {
    document.querySelectorAll(".form-card input, .form-card textarea, .form-card select").forEach((field) => {
      field.addEventListener("input", () => {
        const form = field.closest(".form-card");
        if (form) form.classList.add("is-dirty");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    enhanceSearchPlaceholder();
    markDirtyForms();
  });
})();


// v4: dark mode, command palette visual, toast notification, submit saved state
(function () {
  const MENU_ITEMS = [
    { label: "Dashboard", desc: "Ringkasan utama admin", page: "dashboardPage", icon: "fa-house", keys: "dashboard beranda home" },
    { label: "Info Kampus", desc: "Tambah dan kelola informasi kampus", page: "infoPage", icon: "fa-newspaper", keys: "info informasi kampus pengumuman berita" },
    { label: "Wiki Kampus", desc: "Artikel panduan dan edukasi", page: "wikiPage", icon: "fa-book-open", keys: "wiki artikel panduan konten" },
    { label: "Lowongan Kerja", desc: "Peluang kerja, magang, dan karier", page: "jobPage", icon: "fa-briefcase", keys: "lowongan kerja magang karir job" },
    { label: "Dokumen Kampus", desc: "Link dokumen penting", page: "dokumenPage", icon: "fa-file-lines", keys: "dokumen file kampus pdf" },
    { label: "FAQ Kampus", desc: "Pertanyaan umum kampus", page: "faqPage", icon: "fa-circle-question", keys: "faq kampus pertanyaan" },
    { label: "Data Jurusan", desc: "Profil program studi", page: "jurusanPage", icon: "fa-graduation-cap", keys: "jurusan prodi program studi" },
    { label: "Statistik Jurusan", desc: "Peminat dan daya tampung", page: "statistikPage", icon: "fa-chart-line", keys: "statistik penerimaan peminat daya tampung" },
    { label: "Biaya Pendidikan", desc: "UKT, IPI, dan uang kuliah", page: "biayaPendidikanPage", icon: "fa-wallet", keys: "biaya pendidikan ukt ipi" },
    { label: "FAQ Jurusan", desc: "Pertanyaan per program studi", page: "faqJurusanPage", icon: "fa-comments", keys: "faq jurusan prodi" },
    { label: "Menfess Analyzer", desc: "Analisis menfess internal menjadi FAQ, Wiki, dan Artikel", page: "menfessAnalyzerPage", icon: "fa-magnifying-glass-chart", keys: "menfess analyzer analisis curhat pertanyaan internal" },
    { label: "Kategori & Tag", desc: "Pengaturan taxonomy konten", page: "taxonomyPage", icon: "fa-tags", keys: "kategori tag taxonomy pengaturan" },
    { label: "Ganti Tema", desc: "Aktifkan atau matikan dark mode", action: "theme", icon: "fa-moon", keys: "dark mode tema gelap terang" },
    { label: "Bantuan Admin", desc: "Buka panel bantuan dan shortcut", action: "help", icon: "fa-circle-question", keys: "bantuan help shortcut panduan" },
    { label: "Logout", desc: "Keluar dari sesi admin", action: "logout", icon: "fa-right-from-bracket", keys: "logout keluar sign out" }
  ];

  function goToPage(pageId) {
    if (window.activateAdminPage) window.activateAdminPage(pageId);
    else document.querySelector(`.sidebar-link[data-page="${pageId}"]`)?.click();
    document.body.classList.remove("admin-palette-open", "admin-menu-open");
  }

  function showToast(title, message) {
    const stack = document.getElementById("adminToastStack");
    if (!stack) return;
    const toast = document.createElement("div");
    toast.className = "admin-toast";
    toast.innerHTML = `<i class="fas fa-check-circle"></i><div><strong>${title}</strong><span>${message}</span></div>`;
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function setupTheme() {
    const button = document.getElementById("adminThemeToggle");
    const saved = localStorage.getItem("saupi-admin-theme");
    if (saved === "dark") document.body.classList.add("admin-dark");
    function syncIcon() {
      if (!button) return;
      button.innerHTML = document.body.classList.contains("admin-dark") ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    syncIcon();
    if (button) button.addEventListener("click", () => {
      document.body.classList.toggle("admin-dark");
      localStorage.setItem("saupi-admin-theme", document.body.classList.contains("admin-dark") ? "dark" : "light");
      syncIcon();
      showToast("Tema diganti", document.body.classList.contains("admin-dark") ? "Dark mode aktif." : "Light mode aktif.");
    });
  }

  function setupPalette() {
    const backdrop = document.getElementById("adminPaletteBackdrop");
    const input = document.getElementById("adminPaletteInput");
    const list = document.getElementById("adminPaletteList");
    const close = document.getElementById("adminPaletteClose");
    const openBtn = document.getElementById("openPaletteBtn");
    if (!backdrop || !input || !list) return;

    function filteredItems() {
      const q = input.value.trim().toLowerCase();
      if (!q) return MENU_ITEMS;
      return MENU_ITEMS.filter(item => `${item.label} ${item.desc} ${item.keys}`.toLowerCase().includes(q));
    }

    function render() {
      const items = filteredItems();
      list.innerHTML = items.map((item, index) => `
        <button class="palette-item ${index === 0 ? "is-active" : ""}" type="button" ${item.page ? `data-page="${item.page}"` : `data-action="${item.action}"`}>
          <i class="fas ${item.icon}"></i>
          <span><strong>${item.label}</strong><span>${item.desc}</span></span>
          <kbd>Enter</kbd>
        </button>
      `).join("") || '<div class="palette-help">Tidak ada menu yang cocok.</div>';
    }

    function openPalette() {
      document.body.classList.add("admin-palette-open");
      input.value = "";
      render();
      window.setTimeout(() => input.focus(), 30);
    }

    function closePalette() {
      document.body.classList.remove("admin-palette-open");
    }

    function runPaletteItem(item) {
      if (!item) return;
      if (item.dataset.page) return goToPage(item.dataset.page);
      if (item.dataset.action === "theme") document.getElementById("adminThemeToggle")?.click();
      if (item.dataset.action === "help") document.getElementById("adminHelpToggle")?.click();
      if (item.dataset.action === "logout") document.getElementById("logoutBtn")?.click();
      if (item.dataset.action === "openWebsite") window.open("../index.html", "_blank", "noopener");
      closePalette();
    }

    list.addEventListener("click", (event) => {
      runPaletteItem(event.target.closest(".palette-item"));
    });
    input.addEventListener("input", render);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const first = list.querySelector(".palette-item");
        if (first) runPaletteItem(first);
      }
      if (event.key === "Escape") closePalette();
    });
    document.addEventListener("keydown", (event) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const pressed = isMac ? event.metaKey && event.key.toLowerCase() === "k" : event.ctrlKey && event.key.toLowerCase() === "k";
      if (pressed) {
        event.preventDefault();
        openPalette();
      }
      if (event.key === "Escape") closePalette();
    }, true);
    if (close) close.addEventListener("click", closePalette);
    if (openBtn) openBtn.addEventListener("click", openPalette);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closePalette();
    });
  }

  function setupSubmitFeedback() {
    document.querySelectorAll(".form-card").forEach((form) => {
      form.addEventListener("submit", () => {
        form.classList.remove("is-dirty");
        form.classList.add("is-saved");
        showToast("Diproses", "Data sedang disimpan oleh modul admin.");
        window.setTimeout(() => form.classList.remove("is-saved"), 2200);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupTheme();
    setupPalette();
    setupSubmitFeedback();
  });
})();


// v5: shortcut dock, form focus mode, recent workspace memory
(function () {
  const shortcutPages = {
    "1": "dashboardPage",
    "2": "infoPage",
    "3": "wikiPage",
    "4": "jobPage",
    "5": "jurusanPage"
  };

  function clickPage(pageId) {
    if (window.activateAdminPage) window.activateAdminPage(pageId);
    else document.querySelector(`.sidebar-link[data-page="${pageId}"]`)?.click();
  }

  function syncDockActive(pageId) {
    document.querySelectorAll(".smart-dock-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === pageId);
    });
  }

  function setupShortcutDock() {
    document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
      link.addEventListener("click", () => {
        const pageId = link.dataset.page;
        if (!pageId) return;
        localStorage.setItem("saupi-admin-last-page", pageId);
        syncDockActive(pageId);
      });
    });

    document.addEventListener("keydown", (event) => {
      const pageId = shortcutPages[event.key];
      if (!event.altKey || !pageId) return;
      event.preventDefault();
      clickPage(pageId);
    });

    const last = localStorage.getItem("saupi-admin-last-page");
    if (last) syncDockActive(last);
    else syncDockActive("dashboardPage");
  }

  function setupFocusMode() {
    const exit = document.createElement("button");
    exit.type = "button";
    exit.className = "focus-exit-float";
    exit.innerHTML = '<i class="fas fa-compress"></i> Keluar Mode Fokus';
    document.body.appendChild(exit);

    function exitFocus() {
      document.body.classList.remove("admin-focus-mode");
      document.querySelector(".admin-content")?.classList.remove("is-focused");
      document.querySelectorAll(".form-card.is-focused-form").forEach((form) => form.classList.remove("is-focused-form"));
    }
    exit.addEventListener("click", exitFocus);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("admin-focus-mode")) exitFocus();
    });

    document.querySelectorAll(".form-card").forEach((form) => {
      if (form.querySelector(".form-utility-bar")) return;
      const title = form.id ? form.id.replace(/Form$/, "") : "Form";
      const bar = document.createElement("div");
      bar.className = "form-utility-bar";
      bar.innerHTML = `<span><i class="fas fa-pen-to-square"></i> Editor ${title}</span><button type="button" class="focus-form-btn"><i class="fas fa-expand"></i> Mode Fokus</button>`;
      form.prepend(bar);
      bar.querySelector("button")?.addEventListener("click", () => {
        document.body.classList.add("admin-focus-mode");
        document.querySelector(".admin-content")?.classList.add("is-focused");
        document.querySelectorAll(".form-card.is-focused-form").forEach((item) => item.classList.remove("is-focused-form"));
        form.classList.add("is-focused-form");
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupShortcutDock();
    setupFocusMode();
  });
})();


// v6: help drawer, onboarding preference, live clock
(function () {
  function setupHelpDrawer() {
    const open = document.getElementById("adminHelpToggle");
    const close = document.getElementById("adminHelpClose");
    const drawer = document.getElementById("adminHelpDrawer");
    function setOpen(value) {
      document.body.classList.toggle("admin-help-open", value);
      if (drawer) drawer.setAttribute("aria-hidden", value ? "false" : "true");
    }
    if (open) open.addEventListener("click", () => setOpen(!document.body.classList.contains("admin-help-open")));
    if (close) close.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "/" && event.shiftKey) {
        event.preventDefault();
        setOpen(true);
      }
    });
  }

  function setupOnboarding() {
    const btn = document.getElementById("dismissOnboardingBtn");
    const hidden = localStorage.getItem("saupi-admin-onboarding-v6") === "hidden";
    if (hidden) document.body.classList.add("admin-onboarding-hidden");
    if (btn) btn.addEventListener("click", () => {
      document.body.classList.add("admin-onboarding-hidden");
      localStorage.setItem("saupi-admin-onboarding-v6", "hidden");
      if (window.dispatchEvent) window.dispatchEvent(new CustomEvent("saupi:toast", { detail: { title: "Tips disembunyikan", message: "Onboarding v6 tidak akan muncul lagi di browser ini." }}));
    });
  }

  function setupLiveClock() {
    const el = document.getElementById("adminLiveClock");
    if (!el) return;
    function tick() {
      el.textContent = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
    }
    tick();
    window.setInterval(tick, 1000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupHelpDrawer();
    setupOnboarding();
    setupLiveClock();
  });
})();


// v7: checklist progress, quick note autosave, scroll progress
(function(){
  function setupChecklist(){
    const checks=[...document.querySelectorAll('[data-v7-check]')];
    const bar=document.getElementById('v7CheckProgress');
    const text=document.getElementById('v7CheckText');
    if(!checks.length||!bar||!text)return;
    const key='saupi-admin-v7-checklist';
    try{JSON.parse(localStorage.getItem(key)||'[]').forEach((v,i)=>{if(checks[i])checks[i].checked=!!v;});}catch(e){}
    function update(){
      const done=checks.filter(c=>c.checked).length;
      bar.style.width=(done/checks.length*100)+'%';
      text.textContent=`${done}/${checks.length} siap`;
      localStorage.setItem(key,JSON.stringify(checks.map(c=>c.checked)));
      if(done===checks.length&&window.dispatchEvent){
        window.dispatchEvent(new CustomEvent('saupi:toast',{detail:{title:'Checklist lengkap',message:'Konten sudah lebih siap untuk dipublish.'}}));
      }
    }
    checks.forEach(c=>c.addEventListener('change',update));
    update();
  }
  function setupQuickNote(){
    const note=document.getElementById('adminQuickNote');
    if(!note)return;
    const key='saupi-admin-v7-note';
    note.value=localStorage.getItem(key)||'';
    note.addEventListener('input',()=>localStorage.setItem(key,note.value));
  }
  function setupScrollProgress(){
    function update(){
      const doc=document.documentElement;
      const max=doc.scrollHeight-window.innerHeight;
      const pct=max>0?(window.scrollY/max)*100:0;
      document.body.style.setProperty('--admin-scroll-progress',pct.toFixed(2)+'%');
    }
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    update();
  }
  document.addEventListener('DOMContentLoaded',()=>{setupChecklist();setupQuickNote();setupScrollProgress();});
})();


// v8: production polish, readiness score, environment state, writing assistant
(function(){
  function textFromEditor(id){
    const node=document.getElementById(id);
    if(!node)return '';
    return (node.innerText||node.textContent||'').trim();
  }
  function setupV8Readiness(){
    const ring=document.getElementById('v8ReadinessRing');
    const score=document.getElementById('v8ReadinessScore');
    const text=document.getElementById('v8ReadinessText');
    const checks=[...document.querySelectorAll('[data-v7-check]')];
    if(!ring||!score||!text||!checks.length)return;
    function update(){
      const done=checks.filter(c=>c.checked).length;
      const pct=Math.round(done/checks.length*100);
      ring.style.setProperty('--score',pct+'%');
      score.textContent=pct+'%';
      text.textContent=pct===100?'Siap publish. Tinggal cek preview publik sebelum menyimpan.':pct>=50?'Sudah lumayan. Lengkapi sisa checklist agar lebih aman.':'Lengkapi checklist publish untuk melihat kesiapan konten.';
    }
    checks.forEach(c=>c.addEventListener('change',update));
    update();
  }
  function setupV8Environment(){
    const theme=document.getElementById('v8ThemeState');
    const workspace=document.getElementById('v8WorkspaceState');
    function update(){
      if(theme) theme.textContent=document.body.classList.contains('admin-dark')?'Dark':'Light';
      const active=document.querySelector('.admin-page.active h2');
      if(workspace) workspace.textContent=active?active.textContent.trim():'Dashboard';
    }
    document.addEventListener('click',()=>setTimeout(update,50));
    window.addEventListener('storage',update);
    update();
  }
  function setupV8WritingAssistant(){
    const titleCounter=document.getElementById('v8TitleCounter');
    const readTime=document.getElementById('v8ReadTime');
    const titleInputs=['infoTitle','wikiTitle','jobTitle','dokumenJudul','faqPertanyaan','jurusanNama','faqJurusanPertanyaan'].map(id=>document.getElementById(id)).filter(Boolean);
    const contentIds=['infoEditor','wikiEditor','jobEditor'];
    if(!titleCounter||!readTime)return;
    function update(){
      const activeInput=titleInputs.find(input=>input===document.activeElement)||titleInputs.find(input=>input.value.trim());
      const titleLen=activeInput?activeInput.value.trim().length:0;
      const words=contentIds.map(textFromEditor).join(' ').split(/\s+/).filter(Boolean).length;
      titleCounter.textContent=titleLen+' karakter';
      readTime.textContent='±'+Math.max(0,Math.ceil(words/180))+' menit';
      document.querySelectorAll('.form-card').forEach(form=>{
        const has=[...form.querySelectorAll('input[type="text"], input[type="url"], textarea')].some(el=>el.value&&el.value.trim());
        form.classList.toggle('v8-has-content',has);
      });
    }
    titleInputs.forEach(input=>input.addEventListener('input',update));
    document.addEventListener('input',update);
    document.addEventListener('keyup',update);
    update();
  }
  document.addEventListener('DOMContentLoaded',()=>{setupV8Readiness();setupV8Environment();setupV8WritingAssistant();});
})();

// v10: helper cards can trigger focus mode for the relevant editor form.
(function(){
  function enterFocus(form){
    if(!form)return;
    document.body.classList.add('admin-focus-mode');
    document.querySelector('.admin-content')?.classList.add('is-focused');
    document.querySelectorAll('.form-card.is-focused-form').forEach(item=>item.classList.remove('is-focused-form'));
    form.classList.add('is-focused-form');
    form.scrollIntoView({behavior:'smooth',block:'start'});
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-focus-target]').forEach(btn=>{
      btn.addEventListener('click',()=>enterFocus(document.getElementById(btn.dataset.focusTarget)));
    });
  });
})();

// v13: contextual writing assistant for Informasi Kampus editor.
(function(){
  const WORDS_PER_MINUTE = 200;
  let saveTimer = null;

  function editorRoot(){ return document.getElementById('infoEditor'); }
  function editorHtml(){
    const root = editorRoot();
    const ql = root && root.querySelector('.ql-editor');
    return ql ? ql.innerHTML : (root ? root.innerHTML : '');
  }
  function editorText(){
    const root = editorRoot();
    const ql = root && root.querySelector('.ql-editor');
    return (ql ? ql.innerText : (root ? root.innerText : '') || '').trim();
  }
  function wordsFrom(text){ return text.split(/\s+/).filter(Boolean); }
  function fmtTime(d){
    try { return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return ''; }
  }
  function updateAssistant(){
    const text = editorText();
    const words = wordsFrom(text);
    const html = editorHtml();
    const wordCount = document.getElementById('infoWordCount');
    const readTime = document.getElementById('infoReadTime');
    const paragraphCount = document.getElementById('infoParagraphCount');
    const headingCount = document.getElementById('infoHeadingCount');
    const readinessBar = document.getElementById('infoReadinessBar');
    const readinessText = document.getElementById('infoReadinessText');
    const title = document.getElementById('infoTitle');
    const categoryValue = document.getElementById('infoCategory');
    const categoryChecks = [...document.querySelectorAll('#infoKategoriMulti input[type="checkbox"]')];
    const image = document.getElementById('infoImage');
    const hasTitle = !!(title && title.value.trim().length >= 8);
    const hasCategory = !!((categoryValue && categoryValue.value.trim()) || categoryChecks.some(c=>c.checked));
    const hasContent = words.length >= 20;
    const hasMedia = !!(image && image.files && image.files.length);
    const done = [hasTitle, hasCategory, hasContent, hasMedia].filter(Boolean).length;
    const pct = Math.round(done / 4 * 100);

    if(wordCount) wordCount.textContent = words.length.toLocaleString('id-ID') + ' kata';
    if(readTime) readTime.textContent = '±' + Math.max(0, Math.ceil(words.length / WORDS_PER_MINUTE)) + ' menit';
    if(paragraphCount){
      const p = (html.match(/<p\b/gi)||[]).length || (text ? text.split(/\n{2,}/).filter(Boolean).length : 0);
      paragraphCount.textContent = String(p);
    }
    if(headingCount) headingCount.textContent = String((html.match(/<h[1-6]\b/gi)||[]).length);
    if(readinessBar) readinessBar.style.width = pct + '%';
    if(readinessText){
      readinessText.textContent = pct >= 100 ? 'Siap publish. Tinggal cek preview dan simpan.' : pct >= 50 ? 'Sudah lumayan. Lengkapi bagian yang belum beres.' : 'Lengkapi judul, kategori, isi, dan media sebelum publish.';
    }
  }
  function markSaving(){
    const status = document.getElementById('infoAutosaveStatus');
    const last = document.getElementById('infoLastSaved');
    if(status) status.innerHTML = '<i class="fas fa-rotate"></i> Menyimpan draft...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{
      try{
        localStorage.setItem('saupi-info-draft-v13', JSON.stringify({
          title: document.getElementById('infoTitle')?.value || '',
          category: document.getElementById('infoCategory')?.value || '',
          content: editorHtml(),
          savedAt: Date.now()
        }));
      }catch(e){}
      if(status) status.innerHTML = '<i class="fas fa-circle-check"></i> Draft lokal aman';
      if(last) last.textContent = 'Tersimpan ' + fmtTime(new Date());
    }, 450);
  }
  function makePreview(mode){
    const title = document.getElementById('infoTitle')?.value || 'Preview Informasi Kampus';
    const content = editorHtml() || '<p>Belum ada isi.</p>';
    const width = mode === 'mobile' ? 390 : 920;
    const height = mode === 'mobile' ? 760 : 760;
    const win = window.open('', 'saupiInfoPreview'+mode, `width=${width},height=${height}`);
    if(!win) return;
    win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#f8fafc;color:#0f172a;font-family:Inter,Arial,sans-serif;line-height:1.75}.wrap{max-width:${mode==='mobile'?'360px':'760px'};margin:0 auto;padding:28px 20px}article{background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.08)}h1{font-size:${mode==='mobile'?'28px':'42px'};line-height:1.12;letter-spacing:-.04em}img{max-width:100%;border-radius:18px}a{color:#2563eb}</style></head><body><main class="wrap"><article><p style="font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:.08em;font-size:12px">Informasi Kampus</p><h1>${title}</h1>${content}</article></main></body></html>`);
    win.document.close();
  }
  function setup(){
    const root = editorRoot();
    const fields = ['infoTitle','infoCategory','infoImage'].map(id=>document.getElementById(id)).filter(Boolean);
    const updateAll = ()=>{ updateAssistant(); markSaving(); };
    fields.forEach(el=>el.addEventListener('input',updateAll));
    fields.forEach(el=>el.addEventListener('change',updateAll));
    document.addEventListener('click', e=>{
      if(e.target && e.target.closest('#infoKategoriMulti')) setTimeout(updateAll, 80);
    });
    document.getElementById('infoPreviewDesktop')?.addEventListener('click',()=>makePreview('desktop'));
    document.getElementById('infoPreviewMobile')?.addEventListener('click',()=>makePreview('mobile'));
    if(root){
      root.addEventListener('input', updateAll);
      root.addEventListener('keyup', updateAll);
      const observer = new MutationObserver(()=>updateAssistant());
      observer.observe(root,{childList:true,subtree:true,characterData:true});
    }
    setInterval(updateAssistant, 1600);
    updateAssistant();
  }
  document.addEventListener('DOMContentLoaded', setup);
})();