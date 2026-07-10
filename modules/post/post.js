const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return "";

  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getPostConfig(type) {
  const configs = {
    info: {
      table: "informasi_kampus",
      columns: "id, judul, isi, gambar, kategori, created_at",
      label: "Info Kampus",
      icon: "fa-bullhorn",
      backUrl: "../pages/info.html",
      backLabel: "Semua Info"
    },
    wiki: {
      table: "wiki_kampus",
      columns: "id, judul, isi, gambar, kategori, created_at",
      label: "Wiki Kampus",
      icon: "fa-book-open",
      backUrl: "../pages/wiki.html",
      backLabel: "Semua Wiki"
    },
    job: {
      table: "lowongan_kerja",
      columns: "id, posisi, perusahaan, lokasi, deskripsi, gambar, link, created_at",
      label: "Lowongan",
      icon: "fa-briefcase",
      backUrl: "../pages/lowongan.html",
      backLabel: "Semua Lowongan"
    }
  };

  return configs[type] || null;
}

function safeGetCache(key, minutes) {
  if (typeof getCache !== "function") return null;
  return getCache(key, minutes);
}

function safeSetCache(key, value) {
  if (typeof setCache !== "function") return;
  setCache(key, value);
}

async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const id = params.get("id");
  const postDetail = document.getElementById("postDetail");

  if (!postDetail) return;

  if (!type || !id) {
    showPostError("Artikel tidak ditemukan.");
    return;
  }

  const config = getPostConfig(type);

  if (!config) {
    showPostError("Jenis artikel tidak valid.");
    return;
  }

  postDetail.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      Memuat artikel...
    </div>
  `;

  const cacheKey = `post_${type}_${id}_v3`;
  const cached = safeGetCache(cacheKey, 1440);

  if (cached) {
    renderPost(cached.post, cached.relations, type);
    return;
  }

  const [{ data, error }, relations] = await Promise.all([
    supabaseClient
      .from(config.table)
      .select(config.columns)
      .eq("id", id)
      .single(),

    loadRelations(type, id)
  ]);

  if (error || !data) {
    console.error("Gagal memuat artikel:", error);
    showPostError("Gagal memuat artikel.");
    return;
  }

  safeSetCache(cacheKey, {
    post: data,
    relations
  });

  renderPost(data, relations, type);
}

async function loadRelations(type, artikelId) {
  const [kategoriResult, tagResult, jurusanResult] = await Promise.all([
    supabaseClient
      .from("artikel_kategori")
      .select("kategori:kategori_id(nama)")
      .eq("artikel_tipe", type)
      .eq("artikel_id", artikelId),

    supabaseClient
      .from("artikel_tags")
      .select("tag:tag_id(nama)")
      .eq("artikel_tipe", type)
      .eq("artikel_id", artikelId),

    supabaseClient
      .from("artikel_jurusan")
      .select("jurusan:jurusan_id(nama)")
      .eq("artikel_tipe", type)
      .eq("artikel_id", artikelId)
  ]);

  if (kategoriResult.error) console.error("Gagal memuat kategori artikel:", kategoriResult.error);
  if (tagResult.error) console.error("Gagal memuat tag artikel:", tagResult.error);
  if (jurusanResult.error) console.error("Gagal memuat relasi jurusan artikel:", jurusanResult.error);

  return {
    kategori: (kategoriResult.data || []).map(row => row.kategori?.nama).filter(Boolean),
    tags: (tagResult.data || []).map(row => row.tag?.nama).filter(Boolean),
    jurusan: (jurusanResult.data || []).map(row => row.jurusan?.nama).filter(Boolean)
  };
}

function renderPost(data, relations, type) {
  const postDetail = document.getElementById("postDetail");
  const config = getPostConfig(type);
  if (!postDetail || !config) return;

  const title = getTitle(data, type);
  const category = getCategory(data, type);
  const content = getContent(data, type);
  const plainText = stripHTML(content);
  const excerpt = makeExcerpt(plainText, type);
  const readingTime = countReadingTime(plainText);
  const tocItems = extractHeadings(content);

  document.title = `${title || "Artikel"} - SA UPI`;
  updateSeoPost(data, type, title, excerpt);

  postDetail.innerHTML = `
    <div class="post-layout">
      <article class="post-card">
        <header class="post-hero">
          <nav class="post-breadcrumb" aria-label="Breadcrumb">
            <a href="../index.html">Beranda</a>
            <span>/</span>
            <a href="${config.backUrl}">${config.backLabel}</a>
            <span>/</span>
            <span>Detail</span>
          </nav>

          <span class="post-type-badge">
            <i class="fa-solid ${config.icon}" aria-hidden="true"></i>
            ${escapeHTML(config.label)}
          </span>

          <h1>${escapeHTML(title)}</h1>

          ${excerpt ? `<p class="post-excerpt">${escapeHTML(excerpt)}</p>` : ""}

          <div class="post-info-row">
            <span class="post-info-item"><i class="fa-regular fa-folder-open"></i>${escapeHTML(category)}</span>
            ${data.created_at ? `<span class="post-info-item"><i class="fa-regular fa-calendar"></i>${formatDate(data.created_at)}</span>` : ""}
            <span class="post-info-item"><i class="fa-regular fa-clock"></i>${readingTime} menit baca</span>
          </div>
        </header>

        ${data.gambar ? `
          <div class="post-image-wrap">
            <img src="${escapeHTML(data.gambar)}" class="post-image" alt="${escapeHTML(title)}" loading="lazy" decoding="async">
          </div>
        ` : ""}

        <div class="post-body-wrap">
          <div class="post-meta-group">
            ${renderPills(relations?.kategori || [])}
            ${renderPills(relations?.tags || [], "tag-pill")}
            ${renderPills(relations?.jurusan || [], "jurusan-pill")}
          </div>

          <div class="post-content" id="postContent">
            ${content}
          </div>

          ${type === "job" && data.link ? `
            <a href="${escapeHTML(data.link)}" target="_blank" rel="noopener noreferrer" class="btn primary">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
              Buka Link Pendaftaran
            </a>
          ` : ""}

          <div class="post-actions-panel">
            <a href="${config.backUrl}" class="post-back-link">
              <i class="fa-solid fa-arrow-left"></i>
              ${config.backLabel}
            </a>

            <div class="share-actions">
              <button id="shareWhatsapp" class="btn primary" type="button">
                <i class="fa-brands fa-whatsapp"></i>
                Bagikan
              </button>

              <button id="copyLink" class="btn ghost" type="button">
                <i class="fa-regular fa-copy"></i>
                Salin Link
              </button>
            </div>
          </div>
        </div>
      </article>

      <aside class="post-sidebar" aria-label="Informasi artikel">
        ${tocItems.length ? renderToc(tocItems) : ""}

        <section class="sidebar-card writer-card">
          <h3>Ditulis oleh</h3>
          <div class="writer-box">
            <div class="writer-avatar">SA</div>
            <div>
              <strong>Sekumpulan Anak UPI</strong>
              <p>Portal informasi kampus, jurusan, wiki, dan lowongan untuk warga UPI.</p>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <div class="floating-share" aria-label="Aksi cepat">
      <button id="floatingWhatsapp" class="btn primary" type="button" aria-label="Bagikan ke WhatsApp">
        <i class="fa-brands fa-whatsapp"></i>
      </button>
      <button id="floatingCopy" class="btn ghost" type="button" aria-label="Salin link">
        <i class="fa-regular fa-copy"></i>
      </button>
    </div>
  `;

  prepareContentHeadings();
  setupShareButtons();
  setupReadingProgress();
  setupTocObserver();
}

function getTitle(data, type) {
  if (type === "job") return data.posisi || "Lowongan Kerja";
  return data.judul || "Artikel";
}

function getCategory(data, type) {
  if (type === "job") {
    return `${data.perusahaan || "Perusahaan"} · ${data.lokasi || "Fleksibel"}`;
  }
  return data.kategori || "Umum";
}

function getContent(data, type) {
  if (type === "job") return data.deskripsi || "";
  return data.isi || "";
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function makeExcerpt(text, type) {
  if (!text) return "";
  const maxLength = type === "job" ? 145 : 170;
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function updateSeoPost(data, type, title, excerpt) {
  const pageTitle = `${title || "Artikel"} - SA UPI`;
  const description = excerpt || "Baca informasi, wiki, dan lowongan terbaru dari SA UPI.";
  const canonicalUrl = getCanonicalUrl();
  const imageUrl = data.gambar || "https://anakupi.my.id/assets/images/og-default.svg";

  setCanonicalUrl(canonicalUrl);
  setMetaTag("description", description);
  setMetaTag("og:type", "article", "property");
  setMetaTag("og:site_name", "Sekumpulan Anak UPI", "property");
  setMetaTag("og:title", pageTitle, "property");
  setMetaTag("og:description", description, "property");
  setMetaTag("og:url", canonicalUrl, "property");
  setMetaTag("og:image", imageUrl, "property");
  setMetaTag("og:locale", "id_ID", "property");
  setMetaTag("twitter:card", "summary_large_image");
  setMetaTag("twitter:title", pageTitle);
  setMetaTag("twitter:description", description);
  setMetaTag("twitter:image", imageUrl);
}

function getCanonicalUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

function setCanonicalUrl(url) {
  let link = document.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

function setMetaTag(name, content, attr = "name") {
  if (!content) return;

  let tag = document.querySelector(`meta[${attr}="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function countReadingTime(text) {
  const words = (text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function extractHeadings(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";

  return [...div.querySelectorAll("h2, h3")]
    .slice(0, 8)
    .map((heading, index) => ({
      id: heading.id || `bagian-${index + 1}`,
      text: stripHTML(heading.innerHTML),
      level: heading.tagName.toLowerCase()
    }))
    .filter(item => item.text);
}

function prepareContentHeadings() {
  const headings = document.querySelectorAll("#postContent h2, #postContent h3");

  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `bagian-${index + 1}`;
  });
}

function renderToc(items) {
  return `
    <section class="sidebar-card toc-card">
      <h2>Isi Artikel</h2>
      <ul class="toc-list">
        ${items.map(item => `
          <li class="${item.level === "h3" ? "toc-subitem" : ""}">
            <a href="#${escapeHTML(item.id)}">${escapeHTML(item.text)}</a>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function renderPills(items, className = "") {
  if (!Array.isArray(items) || !items.length) return "";

  return items
    .map(item => `<span class="pill ${className}">${escapeHTML(item)}</span>`)
    .join("");
}

function showPostError(message) {
  const postDetail = document.getElementById("postDetail");
  if (!postDetail) return;

  postDetail.innerHTML = `
    <div class="empty">
      ${escapeHTML(message)}
      <br><br>
      <a href="../index.html" class="btn ghost">Kembali ke Beranda</a>
    </div>
  `;
}

function setupShareButtons() {
  const shareBtn = document.getElementById("shareWhatsapp");
  const copyBtn = document.getElementById("copyLink");
  const floatingShareBtn = document.getElementById("floatingWhatsapp");
  const floatingCopyBtn = document.getElementById("floatingCopy");

  const shareToWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(document.title + "\n" + window.location.href)}`, "_blank");
  };

  const copyCurrentLink = async button => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (!button) return;

      const previousHTML = button.innerHTML;
      button.innerHTML = `<i class="fa-solid fa-check"></i> Tersalin`;

      setTimeout(() => {
        button.innerHTML = previousHTML;
      }, 1800);
    } catch {
      alert("Gagal menyalin link.");
    }
  };

  shareBtn?.addEventListener("click", shareToWhatsapp);
  floatingShareBtn?.addEventListener("click", shareToWhatsapp);
  copyBtn?.addEventListener("click", () => copyCurrentLink(copyBtn));
  floatingCopyBtn?.addEventListener("click", () => copyCurrentLink(floatingCopyBtn));
}

function setupReadingProgress() {
  const bar = document.getElementById("readingProgressBar");
  if (!bar) return;

  const updateProgress = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
    bar.style.width = `${progress}%`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

function setupTocObserver() {
  const links = [...document.querySelectorAll(".toc-list a")];
  const headings = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!links.length || !headings.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      links.forEach(link => link.classList.remove("is-active"));
      const activeLink = document.querySelector(`.toc-list a[href="#${entry.target.id}"]`);
      activeLink?.classList.add("is-active");
    });
  }, {
    rootMargin: "-20% 0px -70% 0px",
    threshold: 0
  });

  headings.forEach(heading => observer.observe(heading));
}

loadPost();
