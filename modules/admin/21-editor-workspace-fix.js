/* =========================
   v17 Editor & Workspace Fix
   - static section headings handled by CSS
   - compact chips
   - live writing assistant for Info/Wiki
   - lowongan helper
   - safe loaders for pages that sometimes do not render on first open
========================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const safeCall = async (name) => {
    try {
      if (typeof window[name] === "function") await window[name]();
    } catch (err) {
      console.warn(`[admin v17] ${name} gagal dipanggil:`, err);
    }
  };

  function getEditorRoot(type) {
    const el = $(`${type}Editor`);
    if (!el) return null;
    return el.querySelector(".ql-editor") || el;
  }

  function getEditorHTMLSafe(type) {
    try {
      if (typeof window.getEditorHTML === "function") return window.getEditorHTML(type) || "";
    } catch (_) {}
    const root = getEditorRoot(type);
    return root ? root.innerHTML : "";
  }

  function textFromHTML(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
  }

  function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }

  function updateAssistant(type) {
    const title = $(`${type}Title`)?.value?.trim() || "";
    const html = getEditorHTMLSafe(type);
    const text = textFromHTML(html);
    const words = countWords(text);
    const readMinutes = Math.max(0, Math.ceil(words / 200));
    const doc = document.createElement("div");
    doc.innerHTML = html || "";
    const paragraphs = [...doc.querySelectorAll("p")].filter(p => textFromHTML(p.innerHTML)).length || (text ? 1 : 0);
    const headings = doc.querySelectorAll("h1,h2,h3,h4,h5,h6").length;

    const wordEl = $(`${type}WordCount`);
    const readEl = $(`${type}ReadTime`);
    const paragraphEl = $(`${type}ParagraphCount`);
    const headingEl = $(`${type}HeadingCount`);
    if (wordEl) wordEl.textContent = `${words} kata`;
    if (readEl) readEl.textContent = `±${readMinutes} menit`;
    if (paragraphEl) paragraphEl.textContent = paragraphs;
    if (headingEl) headingEl.textContent = headings;

    const categoryChecked = document.querySelectorAll(`#${type}KategoriMulti input[type="checkbox"]:checked`).length > 0;
    const hasMedia = !!$(`${type}Image`)?.files?.length;
    let score = 0;
    if (title.length >= 8) score += 25;
    if (categoryChecked) score += 25;
    if (words >= 80) score += 35;
    if (hasMedia || words >= 180) score += 15;

    const bar = $(`${type}ReadinessBar`);
    const readinessText = $(`${type}ReadinessText`);
    if (bar) bar.style.width = `${Math.min(score, 100)}%`;
    if (readinessText) {
      readinessText.textContent = score >= 85
        ? "Siap publish. Tinggal cek preview publik sebelum menyimpan."
        : score >= 55
          ? "Sudah cukup baik. Lengkapi kategori, isi, atau media agar lebih aman."
          : "Lengkapi judul, kategori, isi, dan media sebelum publish.";
    }

    const last = $(`${type}LastSaved`);
    if (last) last.textContent = `Terakhir dicek ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function updateJobAssistant() {
    const html = getEditorHTMLSafe("job");
    const words = countWords(textFromHTML(html));
    const descStatus = $("jobDescStatus");
    if (descStatus) descStatus.textContent = `${words} kata`;

    const deadlineInput = $("jobDeadline");
    const deadlineStatus = $("jobDeadlineStatus");
    if (deadlineStatus) {
      if (!deadlineInput?.value) {
        deadlineStatus.textContent = "Belum diisi";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(deadlineInput.value);
        const diff = Math.ceil((deadline - today) / 86400000);
        deadlineStatus.textContent = diff < 0 ? "Sudah lewat" : diff === 0 ? "Hari ini" : `${diff} hari lagi`;
      }
    }
  }

  function attachEditorWatch(type) {
    const root = getEditorRoot(type);
    const title = $(`${type}Title`);
    const cat = $(`${type}KategoriMulti`);
    const img = $(`${type}Image`);
    const update = () => updateAssistant(type);
    root?.addEventListener("input", update);
    title?.addEventListener("input", update);
    cat?.addEventListener("change", update);
    img?.addEventListener("change", update);
    setTimeout(update, 300);
    setTimeout(update, 1200);
  }

  function attachJobWatch() {
    const root = getEditorRoot("job");
    root?.addEventListener("input", updateJobAssistant);
    $("jobDeadline")?.addEventListener("change", updateJobAssistant);
    setTimeout(updateJobAssistant, 300);
    setTimeout(updateJobAssistant, 1200);
  }

  function openPreview(type, mode) {
    const title = $(`${type}Title`)?.value || "Tanpa judul";
    const html = getEditorHTMLSafe(type);
    const width = mode === "mobile" ? "420" : "960";
    const win = window.open("", `_preview_${type}_${mode}`, `width=${width},height=780,scrollbars=yes`);
    if (!win) return;
    win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preview ${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:${mode === "mobile" ? "390px" : "860px"};margin:0 auto;padding:28px;line-height:1.75;color:#0f172a;background:#f8fafc}article{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:28px}h1{line-height:1.2}img{max-width:100%;border-radius:16px}</style></head><body><article><h1>${title}</h1>${html || "<p>Belum ada isi.</p>"}</article></body></html>`);
    win.document.close();
  }

  function attachPreviewButtons(type) {
    $(`${type}PreviewDesktop`)?.addEventListener("click", () => openPreview(type, "desktop"));
    $(`${type}PreviewMobile`)?.addEventListener("click", () => openPreview(type, "mobile"));
  }

  function loadAllAdminDataSoft() {
    [
      "loadInfoData",
      "loadWikiData",
      "loadJobData",
      "loadDokumenData",
      "loadFaqData",
      "loadJurusanAdminData",
      "loadStatistikJurusanData",
      "loadBiayaPendidikanAdmin",
      "loadFaqJurusanData",
      "loadKategoriAdminData",
      "loadTagAdminData",
      "loadMasterRelations",
      "loadKategoriData",
      "loadTagData"
    ].forEach((fn, index) => setTimeout(() => safeCall(fn), 150 + index * 60));
  }

  function attachPageLoaders() {
    document.querySelectorAll("[data-page]").forEach(btn => {
      btn.addEventListener("click", () => {
        const page = btn.getAttribute("data-page");
        const map = {
          dokumenPage: ["loadDokumenData"],
          faqPage: ["loadFaqData"],
          jurusanPage: ["loadJurusanAdminData"],
          statistikPage: ["loadStatistikJurusanData"],
          biayaPendidikanPage: ["loadBiayaPendidikanAdmin"],
          faqJurusanPage: ["loadFaqJurusanData"],
          taxonomyPage: ["loadKategoriAdminData", "loadTagAdminData"],
          wikiPage: ["loadWikiData"],
          infoPage: ["loadInfoData"],
          jobPage: ["loadJobData"]
        };
        (map[page] || []).forEach(fn => setTimeout(() => safeCall(fn), 120));
        setTimeout(() => { updateAssistant("info"); updateAssistant("wiki"); updateJobAssistant(); }, 300);
      });
    });
  }

  function tidyGeneratedLists() {
    // Jika renderer lama membuat teks abu-abu lewat inline style/class, paksa judul tetap terbaca di dark mode.
    const style = document.createElement("style");
    style.textContent = `
      body.admin-dark #wikiList *, body.admin-dark #jobList *, body.admin-dark #jurusanAdminList *, body.admin-dark #statistikList *, body.admin-dark #biayaPendidikanAdminList *, body.admin-dark #faqJurusanList *, body.admin-dark #dokumenList *, body.admin-dark #faqList * { border-color: rgba(226,232,240,.13); }
      body.admin-dark #wikiList h3, body.admin-dark #jobList h3, body.admin-dark #jurusanAdminList h3, body.admin-dark #statistikList h3, body.admin-dark #biayaPendidikanAdminList h3, body.admin-dark #faqJurusanList h3, body.admin-dark #dokumenList h3, body.admin-dark #faqList h3 { color:#f8fafc!important; }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    attachEditorWatch("info");
    attachEditorWatch("wiki");
    attachJobWatch();
    attachPreviewButtons("info");
    attachPreviewButtons("wiki");
    attachPageLoaders();
    tidyGeneratedLists();

    // Data kadang kosong karena hanya dimuat saat pindah tab. Panggil ulang secara aman setelah semua modul selesai register.
    setTimeout(loadAllAdminDataSoft, 900);
    setTimeout(loadAllAdminDataSoft, 2500);
  });
})();
