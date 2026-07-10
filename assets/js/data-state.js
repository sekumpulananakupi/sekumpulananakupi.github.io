/* Reusable presentation helpers for Supabase-backed public modules. */
function renderDataRecoveryState(options = {}) {
  const {
    title = "Data belum dapat dimuat.",
    message = "Periksa koneksi Anda, lalu coba lagi.",
    retryLabel = "Coba lagi",
    refreshLabel = "Muat ulang data",
    reportHref = "../pages/hubungi-kami.html?subject=laporan-data",
    cacheLabel = ""
  } = options;

  return `
    <section class="data-recovery-state" role="status" aria-live="polite">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <div>
        <h2>${escapeDataState(title)}</h2>
        <p>${escapeDataState(message)}</p>
        ${cacheLabel ? `<p class="data-cache-note"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> ${escapeDataState(cacheLabel)}</p>` : ""}
      </div>
      <div class="data-recovery-actions">
        <button class="btn primary" type="button" data-retry-data>${escapeDataState(retryLabel)}</button>
        <button class="btn ghost" type="button" data-refresh-data>${escapeDataState(refreshLabel)}</button>
        <a class="btn ghost" href="${escapeDataState(reportHref)}">Laporkan masalah</a>
      </div>
    </section>`;
}

function renderSolutionEmptyState(options = {}) {
  const {
    title = "Belum ada hasil yang sesuai.",
    message = "Coba ubah pencarian atau jelajahi pilihan terkait.",
    resetLabel = "Hapus filter",
    suggestions = [],
    requestHref = "../pages/hubungi-kami.html?subject=permintaan-konten"
  } = options;

  return `
    <section class="data-empty-state" aria-live="polite">
      <i class="fa-regular fa-compass" aria-hidden="true"></i>
      <h2>${escapeDataState(title)}</h2>
      <p>${escapeDataState(message)}</p>
      <div class="data-empty-actions">
        <button class="btn secondary" type="button" data-reset-filters>${escapeDataState(resetLabel)}</button>
        ${suggestions.map(item => `<a class="btn ghost" href="${escapeDataState(item.href)}">${escapeDataState(item.label)}</a>`).join("")}
        <a class="btn ghost" href="${escapeDataState(requestHref)}">Minta konten</a>
      </div>
    </section>`;
}

function bindDataRecoveryActions(container, handlers = {}) {
  container?.querySelector("[data-retry-data]")?.addEventListener("click", handlers.retry);
  container?.querySelector("[data-refresh-data]")?.addEventListener("click", handlers.refresh || (() => window.location.reload()));
  container?.querySelector("[data-reset-filters]")?.addEventListener("click", handlers.reset);
}

function escapeDataState(value) {
  const element = document.createElement("span");
  element.textContent = String(value || "");
  return element.innerHTML;
}
