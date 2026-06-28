const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let jurusanData = [];
let statistikData = [];
let biayaData = [];

/* =========================
   HELPERS
========================= */

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").trim();
}

function formatNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toLocaleString("id-ID");
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);
  if (Number.isNaN(number)) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

function getShortRupiah(value) {
  const number = Number(value);
  if (!number || Number.isNaN(number)) return "-";

  if (number >= 1000000000) return `Rp${(number / 1000000000).toFixed(1).replace(".", ",")} M`;
  if (number >= 1000000) return `Rp${(number / 1000000).toFixed(number % 1000000 === 0 ? 0 : 1).replace(".", ",")} jt`;
  if (number >= 1000) return `Rp${(number / 1000).toFixed(0)} rb`;
  return formatRupiah(number);
}

function getTextPreview(text, maxLength = 180) {
  const clean = stripHTML(text || "");
  if (!clean) return "Deskripsi belum tersedia.";
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function getPersentaseKeterimaan(stat) {
  const dayaTampung = Number(stat?.daya_tampung || 0);
  const peminat = Number(stat?.peminat || 0);

  if (!dayaTampung || !peminat) return null;
  return (dayaTampung / peminat) * 100;
}

function formatPersentaseKeterimaan(stat) {
  const value = getPersentaseKeterimaan(stat);
  if (value === null) return "-";
  return `${value.toFixed(2)}%`;
}

function getRasioPersaingan(stat) {
  const rasio = getRasioNumber(stat);
  if (rasio === null) return "-";
  return `1 : ${rasio.toFixed(1).replace(".", ",")}`;
}

function getRasioNumber(stat) {
  const dayaTampung = Number(stat?.daya_tampung || 0);
  const peminat = Number(stat?.peminat || 0);
  if (!dayaTampung || !peminat) return null;
  return peminat / dayaTampung;
}

function getStatistikByJurusan(jurusanId) {
  return statistikData.filter(item => String(item.jurusan_id) === String(jurusanId));
}

function getLatestStatistik(jurusanId, jalur) {
  const data = getStatistikByJurusan(jurusanId)
    .filter(item => String(item.jalur || "").toUpperCase() === jalur.toUpperCase())
    .sort((a, b) => Number(a.tahun) - Number(b.tahun));

  return data.length ? data[data.length - 1] : null;
}

function getBiayaByJurusan(jurusanId) {
  return biayaData.filter(item => String(item.jurusan_id) === String(jurusanId));
}

function getBiayaSummary(jurusanId) {
  const rows = getBiayaByJurusan(jurusanId);

  const uktValues = rows
    .flatMap(row => [row.ukt, row.uang_kuliah])
    .map(Number)
    .filter(value => !Number.isNaN(value) && value > 0);

  const ipiValues = rows
    .map(row => Number(row.ipi))
    .filter(value => !Number.isNaN(value) && value > 0);

  const jalur = [...new Set(rows.map(row => row.jalur).filter(Boolean))];

  return {
    uktMin: uktValues.length ? Math.min(...uktValues) : null,
    uktMax: uktValues.length ? Math.max(...uktValues) : null,
    ipiMin: ipiValues.length ? Math.min(...ipiValues) : null,
    ipiMax: ipiValues.length ? Math.max(...ipiValues) : null,
    jalur
  };
}

function formatBiayaRange(min, max) {
  if (!min && !max) return "-";
  if (min && max && min === max) return formatRupiah(min);
  if (min && max) return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  if (min) return `Mulai ${formatRupiah(min)}`;
  return `Hingga ${formatRupiah(max)}`;
}

function formatShortBiayaRange(min, max) {
  if (!min && !max) return "-";
  if (min && max && min === max) return getShortRupiah(min);
  if (min && max) return `${getShortRupiah(min)} - ${getShortRupiah(max)}`;
  if (min) return `Mulai ${getShortRupiah(min)}`;
  return `Hingga ${getShortRupiah(max)}`;
}

function normalizeAkreditasi(value) {
  return String(value || "").trim().toLowerCase();
}

function getAkreditasiScore(value) {
  const normalized = normalizeAkreditasi(value);
  if (["unggul", "a"].includes(normalized)) return 5;
  if (["baik sekali", "b"].includes(normalized)) return 4;
  if (["baik", "c"].includes(normalized)) return 3;
  if (normalized) return 2;
  return null;
}

function getProspekCount(text) {
  return String(text || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean).length;
}

function getAverageAcceptance(context, side) {
  const snbp = getPersentaseKeterimaan(context[`snbp${side}`]);
  const snbt = getPersentaseKeterimaan(context[`snbt${side}`]);
  const values = [snbp, snbt].filter(value => value !== null);
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getAverageCompetition(context, side) {
  const snbp = getRasioNumber(context[`snbp${side}`]);
  const snbt = getRasioNumber(context[`snbt${side}`]);
  const values = [snbp, snbt].filter(value => value !== null);
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function winnerHigher(valueA, valueB, aName, bName) {
  if (valueA === null || valueB === null || valueA === undefined || valueB === undefined) {
    return { type: "unknown", label: "Data belum lengkap", name: "-" };
  }
  if (Number(valueA) === Number(valueB)) return { type: "draw", label: "Seri", name: "Seri" };
  return Number(valueA) > Number(valueB)
    ? { type: "a", label: aName, name: aName }
    : { type: "b", label: bName, name: bName };
}

function winnerLower(valueA, valueB, aName, bName) {
  if (valueA === null || valueB === null || valueA === undefined || valueB === undefined) {
    return { type: "unknown", label: "Data belum lengkap", name: "-" };
  }
  if (Number(valueA) === Number(valueB)) return { type: "draw", label: "Seri", name: "Seri" };
  return Number(valueA) < Number(valueB)
    ? { type: "a", label: aName, name: aName }
    : { type: "b", label: bName, name: bName };
}

function winnerBadge(winner) {
  const icon = winner.type === "draw" ? "fa-scale-balanced" : winner.type === "unknown" ? "fa-circle-info" : "fa-trophy";
  return `<span class="winner-badge winner-${escapeHTML(winner.type)}"><i class="fa-solid ${icon}"></i>${escapeHTML(winner.label)}</span>`;
}

function getWinnerClass(winner, side) {
  if (winner.type === "draw") return "is-draw";
  if (winner.type === "unknown") return "";
  return winner.type === side ? "is-winner" : "";
}

/* =========================
   LOAD DATA
========================= */

async function loadData() {
  const result = document.getElementById("compareResult");

  if (result) {
    result.innerHTML = renderEmptyState("Memuat data jurusan...", "Sebentar, data perbandingan sedang disiapkan.", "fa-spinner fa-spin");
  }

  const cacheKey = "compare_jurusan_v3";
  const cached = typeof getCache === "function" ? getCache(cacheKey, 1440) : null;

  if (cached) {
    jurusanData = cached.jurusanData || [];
    statistikData = cached.statistikData || [];
    biayaData = cached.biayaData || [];

    fillSelect("jurusanA");
    fillSelect("jurusanB");
    applyCompareParamsFromURL();
    updateCompareProgress();

    if (result && !document.getElementById("jurusanA")?.value && !document.getElementById("jurusanB")?.value) {
      result.innerHTML = renderEmptyState();
    }

    return;
  }

  const [jurusanResponse, statistikResponse, biayaResponse] = await Promise.all([
    supabaseClient
      .from("jurusan")
      .select(`
        id,
        nama,
        fakultas,
        jenjang,
        deskripsi,
        akreditasi,
        website_resmi,
        url_kurikulum,
        url_akreditasi,
        prospek_kerja
      `)
      .order("nama"),

    supabaseClient
      .from("statistik_jurusan")
      .select(`
        jurusan_id,
        tahun,
        jalur,
        daya_tampung,
        peminat
      `)
      .order("tahun", { ascending: false }),

    supabaseClient
      .from("biaya_pendidikan")
      .select(`
        jurusan_id,
        jalur,
        ukt,
        uang_kuliah,
        ipi
      `)
  ]);

  if (jurusanResponse.error) console.error(jurusanResponse.error);
  if (statistikResponse.error) console.error(statistikResponse.error);
  if (biayaResponse.error) console.error(biayaResponse.error);

  jurusanData = jurusanResponse.data || [];
  statistikData = statistikResponse.data || [];
  biayaData = biayaResponse.data || [];

  if (typeof setCache === "function") {
    setCache(cacheKey, { jurusanData, statistikData, biayaData });
  }

  fillSelect("jurusanA");
  fillSelect("jurusanB");
  applyCompareParamsFromURL();
  updateCompareProgress();

  if (result && !document.getElementById("jurusanA")?.value && !document.getElementById("jurusanB")?.value) {
    result.innerHTML = renderEmptyState();
  }
}

function fillSelect(id) {
  const select = document.getElementById(id);
  if (!select) return;

  select.innerHTML =
    `<option value="">Pilih Jurusan</option>` +
    jurusanData
      .map(item => `
        <option value="${escapeHTML(item.id)}">
          ${escapeHTML(item.nama)}${item.jenjang ? ` - ${escapeHTML(item.jenjang)}` : ""}
        </option>
      `)
      .join("");
}

function applyCompareParamsFromURL() {
  const params = new URLSearchParams(window.location.search);
  const jurusan1 = params.get("jurusan1");
  const jurusan2 = params.get("jurusan2");

  const selectA = document.getElementById("jurusanA");
  const selectB = document.getElementById("jurusanB");

  if (selectA && jurusan1) selectA.value = jurusan1;
  if (selectB && jurusan2) selectB.value = jurusan2;

  if (jurusan1 && jurusan2) {
    renderCompare();
    return;
  }

  const result = document.getElementById("compareResult");
  if (result && jurusan1 && !jurusan2) {
    result.innerHTML = renderEmptyState("Jurusan pertama sudah dipilih.", "Silakan pilih jurusan kedua untuk membuka hasil perbandingan.", "fa-circle-half-stroke");
  }
}

/* =========================
   RENDER COMPARE
========================= */

function renderCompare() {
  const selectA = document.getElementById("jurusanA");
  const selectB = document.getElementById("jurusanB");
  const result = document.getElementById("compareResult");

  if (!selectA || !selectB || !result) return;

  const idA = selectA.value;
  const idB = selectB.value;

  updateCompareProgress();

  if (!idA || !idB) {
    result.innerHTML = renderEmptyState("Lengkapi dua pilihan jurusan.", "Pilih jurusan pertama dan kedua agar hasil perbandingan bisa ditampilkan.", "fa-circle-half-stroke");
    return;
  }

  localStorage.removeItem("compareFirstJurusan");

  if (idA === idB) {
    result.innerHTML = renderEmptyState("Pilih dua jurusan yang berbeda.", "Perbandingan akan lebih berguna kalau jurusannya tidak sama.", "fa-triangle-exclamation");
    return;
  }

  const a = jurusanData.find(item => String(item.id) === String(idA));
  const b = jurusanData.find(item => String(item.id) === String(idB));

  if (!a || !b) {
    result.innerHTML = renderEmptyState("Data jurusan tidak ditemukan.", "Coba reset pilihan lalu pilih ulang jurusan yang tersedia.", "fa-magnifying-glass");
    return;
  }

  const context = buildCompareContext(a, b);

  result.innerHTML = `
    ${renderStickyNav()}

    <section class="compare-showcase" id="ringkasan">
      <div class="compare-duel-grid">
        ${renderJurusanHero(a, context, "A")}
        <div class="compare-duel-center">
          <span>VS</span>
          <small>Bandingkan</small>
        </div>
        ${renderJurusanHero(b, context, "B")}
      </div>

      ${renderDecisionSummary(a, b, context)}
      ${renderWinnerBoard(a, b, context)}
      ${renderRadarSection(a, b, context)}
    </section>

    ${renderSectionTable("profil", "Profil Jurusan", "fa-id-card", renderProfileRows(a, b))}
    ${renderSectionTable("statistik", "Statistik Penerimaan", "fa-chart-line", renderStatRows(context))}
    ${renderSectionTable("biaya", "Biaya Pendidikan", "fa-wallet", renderCostRows(context))}
    ${renderProspectSection(a, b)}

    <div class="info-note compare-note">
      <strong>Catatan:</strong>
      Persentase keterimaan dihitung dari daya tampung dibagi peminat. Rasio persaingan dihitung dari jumlah peminat per satu kursi.
      Data biaya merupakan ringkasan dari tabel biaya pendidikan yang tersedia di database.
    </div>
  `;
}

function buildCompareContext(a, b) {
  const snbpA = getLatestStatistik(a.id, "SNBP");
  const snbpB = getLatestStatistik(b.id, "SNBP");
  const snbtA = getLatestStatistik(a.id, "SNBT");
  const snbtB = getLatestStatistik(b.id, "SNBT");
  const biayaA = getBiayaSummary(a.id);
  const biayaB = getBiayaSummary(b.id);

  return { snbpA, snbpB, snbtA, snbtB, biayaA, biayaB };
}

function renderStickyNav() {
  return `
    <nav class="compare-sticky-nav" aria-label="Navigasi hasil perbandingan">
      <a href="#ringkasan">Ringkasan</a>
      <a href="#profil">Profil</a>
      <a href="#statistik">Statistik</a>
      <a href="#biaya">Biaya</a>
      <a href="#prospek">Prospek</a>
    </nav>
  `;
}

function renderJurusanHero(item, context, side) {
  const biaya = context[`biaya${side}`];
  const snbp = context[`snbp${side}`];
  const snbt = context[`snbt${side}`];
  const avgAcceptance = getAverageAcceptance(context, side);
  const avgCompetition = getAverageCompetition(context, side);

  return `
    <article class="compare-major-card compare-major-${side.toLowerCase()}">
      <div class="compare-major-top">
        <div>
          <span class="compare-major-label">Jurusan ${escapeHTML(side)}</span>
          <h2>${escapeHTML(item.nama)}</h2>
        </div>
        <span class="compare-accreditation">${escapeHTML(item.akreditasi || "-")}</span>
      </div>

      <p>${escapeHTML(getTextPreview(item.deskripsi, 150))}</p>

      <div class="compare-major-tags">
        <span><i class="fa-solid fa-building-columns"></i>${escapeHTML(item.fakultas || "UPI")}</span>
        <span><i class="fa-solid fa-graduation-cap"></i>${escapeHTML(item.jenjang || "-")}</span>
      </div>

      <div class="compare-metric-grid">
        <div>
          <small>Peluang Rata-rata</small>
          <strong>${avgAcceptance === null ? "-" : `${avgAcceptance.toFixed(2)}%`}</strong>
        </div>
        <div>
          <small>Rasio Rata-rata</small>
          <strong>${avgCompetition === null ? "-" : `1 : ${avgCompetition.toFixed(1).replace(".", ",")}`}</strong>
        </div>
        <div>
          <small>UKT/Biaya</small>
          <strong>${escapeHTML(formatShortBiayaRange(biaya.uktMin, biaya.uktMax))}</strong>
        </div>
        <div>
          <small>Data Terbaru</small>
          <strong>${escapeHTML(snbp?.tahun || snbt?.tahun || "-")}</strong>
        </div>
      </div>

      <a href="../pages/jurusan-detail.html?id=${encodeURIComponent(item.id)}" class="btn ghost compare-detail-btn">
        Lihat Detail
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    </article>
  `;
}

function renderDecisionSummary(a, b, context) {
  const aName = a.nama || "Jurusan A";
  const bName = b.nama || "Jurusan B";

  const acceptanceWinner = winnerHigher(getAverageAcceptance(context, "A"), getAverageAcceptance(context, "B"), aName, bName);
  const competitionWinner = winnerLower(getAverageCompetition(context, "A"), getAverageCompetition(context, "B"), aName, bName);
  const costWinner = winnerLower(context.biayaA.uktMax, context.biayaB.uktMax, aName, bName);
  const accreditationWinner = winnerHigher(getAkreditasiScore(a.akreditasi), getAkreditasiScore(b.akreditasi), aName, bName);

  const lines = [
    getSummaryLine("Peluang masuk", acceptanceWinner, "lebih longgar berdasarkan rata-rata SNBP dan SNBT."),
    getSummaryLine("Persaingan", competitionWinner, "lebih ringan dari sisi rasio peminat per kursi."),
    getSummaryLine("Biaya tertinggi", costWinner, "lebih rendah berdasarkan data biaya yang tersedia."),
    getSummaryLine("Akreditasi", accreditationWinner, "lebih unggul berdasarkan label akreditasi yang terbaca.")
  ];

  return `
    <section class="compare-decision-card">
      <div class="compare-decision-icon"><i class="fa-solid fa-brain"></i></div>
      <div>
        <p class="eyebrow">Kesimpulan Cepat</p>
        <h2>Gambaran awal sebelum membaca tabel lengkap</h2>
        <div class="compare-summary-list">
          ${lines.join("")}
        </div>
      </div>
    </section>
  `;
}

function getSummaryLine(label, winner, sentence) {
  if (winner.type === "draw") {
    return `<p><i class="fa-solid fa-scale-balanced"></i><strong>${escapeHTML(label)}:</strong> keduanya relatif seimbang.</p>`;
  }

  if (winner.type === "unknown") {
    return `<p><i class="fa-solid fa-circle-info"></i><strong>${escapeHTML(label)}:</strong> data belum lengkap.</p>`;
  }

  return `<p><i class="fa-solid fa-check"></i><strong>${escapeHTML(label)}:</strong> ${escapeHTML(winner.name)} ${escapeHTML(sentence)}</p>`;
}

function renderWinnerBoard(a, b, context) {
  const aName = a.nama || "Jurusan A";
  const bName = b.nama || "Jurusan B";

  const items = [
    {
      icon: "fa-award",
      title: "Akreditasi",
      desc: `${a.akreditasi || "-"} vs ${b.akreditasi || "-"}`,
      winner: winnerHigher(getAkreditasiScore(a.akreditasi), getAkreditasiScore(b.akreditasi), aName, bName)
    },
    {
      icon: "fa-door-open",
      title: "Peluang Masuk",
      desc: "Rata-rata persentase keterimaan SNBP dan SNBT",
      winner: winnerHigher(getAverageAcceptance(context, "A"), getAverageAcceptance(context, "B"), aName, bName)
    },
    {
      icon: "fa-people-arrows",
      title: "Persaingan",
      desc: "Rasio rata-rata peminat per kursi",
      winner: winnerLower(getAverageCompetition(context, "A"), getAverageCompetition(context, "B"), aName, bName)
    },
    {
      icon: "fa-wallet",
      title: "Biaya",
      desc: "UKT/biaya tertinggi lebih rendah",
      winner: winnerLower(context.biayaA.uktMax, context.biayaB.uktMax, aName, bName)
    },
    {
      icon: "fa-briefcase",
      title: "Prospek Tercatat",
      desc: "Jumlah prospek kerja yang tersedia di data",
      winner: winnerHigher(getProspekCount(a.prospek_kerja), getProspekCount(b.prospek_kerja), aName, bName)
    }
  ];

  return `
    <section class="compare-winner-board">
      <div class="compare-block-head">
        <p class="eyebrow">Highlight Pemenang</p>
        <h2>Aspek mana yang lebih unggul?</h2>
      </div>
      <div class="compare-winner-grid">
        ${items.map(item => `
          <article class="compare-winner-card">
            <div class="compare-winner-icon"><i class="fa-solid ${item.icon}"></i></div>
            <div>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.desc)}</p>
              ${winnerBadge(item.winner)}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderRadarSection(a, b, context) {
  const scoreA = buildRadarScores(a, context, "A");
  const scoreB = buildRadarScores(b, context, "B");

  const rows = [
    ["Akreditasi", scoreA.accreditation, scoreB.accreditation],
    ["Peluang", scoreA.acceptance, scoreB.acceptance],
    ["Persaingan", scoreA.competition, scoreB.competition],
    ["Biaya", scoreA.cost, scoreB.cost],
    ["Prospek", scoreA.prospect, scoreB.prospect]
  ];

  return `
    <section class="compare-radar-card">
      <div class="compare-block-head">
        <p class="eyebrow">Radar Sederhana</p>
        <h2>Skor cepat tiap aspek</h2>
      </div>

      <div class="compare-score-legend">
        <span><b></b>${escapeHTML(a.nama)}</span>
        <span><b></b>${escapeHTML(b.nama)}</span>
      </div>

      <div class="compare-score-list">
        ${rows.map(([label, aScore, bScore]) => `
          <div class="compare-score-row">
            <span>${escapeHTML(label)}</span>
            <div class="compare-score-bars">
              <div class="score-bar score-a" style="--score:${aScore}"><i></i><small>${aScore}/5</small></div>
              <div class="score-bar score-b" style="--score:${bScore}"><i></i><small>${bScore}/5</small></div>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function buildRadarScores(item, context, side) {
  const acc = getAkreditasiScore(item.akreditasi);
  const acceptance = getAverageAcceptance(context, side);
  const competition = getAverageCompetition(context, side);
  const costMax = context[`biaya${side}`].uktMax;
  const prospectCount = getProspekCount(item.prospek_kerja);

  return {
    accreditation: acc || 1,
    acceptance: acceptance === null ? 1 : clampScore(acceptance / 4),
    competition: competition === null ? 1 : clampScore(6 - competition / 6),
    cost: costMax === null ? 1 : clampScore(6 - costMax / 2000000),
    prospect: clampScore(prospectCount / 2)
  };
}

function clampScore(value) {
  const number = Math.round(Number(value));
  if (Number.isNaN(number)) return 1;
  return Math.max(1, Math.min(5, number));
}

function renderSectionTable(id, title, icon, rows) {
  return `
    <section class="compare-data-section" id="${escapeHTML(id)}">
      <div class="compare-block-head">
        <p class="eyebrow"><i class="fa-solid ${escapeHTML(icon)}"></i> Perbandingan</p>
        <h2>${escapeHTML(title)}</h2>
      </div>

      <div class="compare-table-wrap">
        <table class="compare-table modern-compare-table">
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProfileRows(a, b) {
  return `
    ${row("Fakultas", a.fakultas, b.fakultas)}
    ${row("Jenjang", a.jenjang, b.jenjang)}
    ${row("Akreditasi", a.akreditasi, b.akreditasi, false, winnerHigher(getAkreditasiScore(a.akreditasi), getAkreditasiScore(b.akreditasi), a.nama, b.nama))}
    ${row("Website Resmi", renderLink(a.website_resmi), renderLink(b.website_resmi), true)}
    ${row("Kurikulum", renderLink(a.url_kurikulum, "Lihat Kurikulum"), renderLink(b.url_kurikulum, "Lihat Kurikulum"), true)}
    ${row("Dokumen Akreditasi", renderLink(a.url_akreditasi, "Lihat Akreditasi"), renderLink(b.url_akreditasi, "Lihat Akreditasi"), true)}
  `;
}

function renderStatRows(context) {
  return `
    ${statRows("SNBP", context.snbpA, context.snbpB)}
    ${statRows("SNBT", context.snbtA, context.snbtB)}
  `;
}

function renderCostRows(context) {
  return `
    ${row("UKT/Biaya Terendah", formatRupiah(context.biayaA.uktMin), formatRupiah(context.biayaB.uktMin), false, winnerLower(context.biayaA.uktMin, context.biayaB.uktMin, "Jurusan A", "Jurusan B"))}
    ${row("UKT/Biaya Tertinggi", formatRupiah(context.biayaA.uktMax), formatRupiah(context.biayaB.uktMax), false, winnerLower(context.biayaA.uktMax, context.biayaB.uktMax, "Jurusan A", "Jurusan B"))}
    ${row("IPI Terendah", formatRupiah(context.biayaA.ipiMin), formatRupiah(context.biayaB.ipiMin), false, winnerLower(context.biayaA.ipiMin, context.biayaB.ipiMin, "Jurusan A", "Jurusan B"))}
    ${row("IPI Tertinggi", formatRupiah(context.biayaA.ipiMax), formatRupiah(context.biayaB.ipiMax), false, winnerLower(context.biayaA.ipiMax, context.biayaB.ipiMax, "Jurusan A", "Jurusan B"))}
    ${row("Jalur Biaya Tersedia", context.biayaA.jalur.join(", ") || "-", context.biayaB.jalur.join(", ") || "-")}
  `;
}

function row(label, valueA, valueB, isHTML = false, winner = null) {
  return `
    <tr>
      <td><strong>${escapeHTML(label)}</strong></td>
      <td class="${winner ? getWinnerClass(winner, "a") : ""}">${isHTML ? valueA : escapeHTML(valueA || "-")}</td>
      <td class="${winner ? getWinnerClass(winner, "b") : ""}">${isHTML ? valueB : escapeHTML(valueB || "-")}</td>
    </tr>
  `;
}

function statRows(label, statA, statB) {
  const rateA = getPersentaseKeterimaan(statA);
  const rateB = getPersentaseKeterimaan(statB);
  const ratioA = getRasioNumber(statA);
  const ratioB = getRasioNumber(statB);

  return `
    ${row(`${label} Tahun Terbaru`, statA?.tahun || "-", statB?.tahun || "-")}
    ${row(`${label} Daya Tampung`, statA ? `${formatNumber(statA.daya_tampung)} kursi` : "-", statB ? `${formatNumber(statB.daya_tampung)} kursi` : "-", false, winnerHigher(Number(statA?.daya_tampung || 0) || null, Number(statB?.daya_tampung || 0) || null, "Jurusan A", "Jurusan B"))}
    ${row(`${label} Peminat`, statA ? `${formatNumber(statA.peminat)} peminat` : "-", statB ? `${formatNumber(statB.peminat)} peminat` : "-")}
    ${row(`${label} Persentase Keterimaan`, formatPersentaseKeterimaan(statA), formatPersentaseKeterimaan(statB), false, winnerHigher(rateA, rateB, "Jurusan A", "Jurusan B"))}
    ${row(`${label} Rasio Persaingan`, getRasioPersaingan(statA), getRasioPersaingan(statB), false, winnerLower(ratioA, ratioB, "Jurusan A", "Jurusan B"))}
  `;
}

function renderProspectSection(a, b) {
  return `
    <section class="compare-data-section" id="prospek">
      <div class="compare-block-head">
        <p class="eyebrow"><i class="fa-solid fa-briefcase"></i> Perbandingan</p>
        <h2>Prospek Kerja</h2>
      </div>

      <div class="compare-prospect-grid">
        <article>
          <h3>${escapeHTML(a.nama)}</h3>
          ${renderList(a.prospek_kerja)}
        </article>
        <article>
          <h3>${escapeHTML(b.nama)}</h3>
          ${renderList(b.prospek_kerja)}
        </article>
      </div>
    </section>
  `;
}

function renderLink(url, label = "Buka Link") {
  if (!url) return "-";

  return `
    <a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="compare-link">
      ${escapeHTML(label)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
    </a>
  `;
}

function renderList(text) {
  const items = String(text || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

  if (!items.length) return `<p class="compare-muted">Prospek kerja belum tersedia.</p>`;

  return `
    <ul class="compare-list">
      ${items.slice(0, 10).map(item => `<li>${escapeHTML(item)}</li>`).join("")}
    </ul>
  `;
}

function renderEmptyState(title = "Pilih dua jurusan untuk dibandingkan.", description = "Setelah dua jurusan dipilih, SA-UPI akan menampilkan ringkasan keputusan, pemenang tiap aspek, dan tabel lengkap.", icon = "fa-graduation-cap") {
  return `
    <div class="compare-empty-state">
      <div class="compare-empty-icon"><i class="fa-solid ${escapeHTML(icon)}"></i></div>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(description)}</p>
    </div>
  `;
}

function resetCompareJurusan() {
  localStorage.removeItem("compareFirstJurusan");

  const selectA = document.getElementById("jurusanA");
  const selectB = document.getElementById("jurusanB");
  const result = document.getElementById("compareResult");

  if (selectA) selectA.value = "";
  if (selectB) selectB.value = "";
  if (result) result.innerHTML = renderEmptyState();

  updateCompareProgress();

  const cleanURL = window.location.pathname;
  window.history.replaceState({}, "", cleanURL);
}

function updateCompareProgress() {
  const selectA = document.getElementById("jurusanA");
  const selectB = document.getElementById("jurusanB");
  const card = document.querySelector(".compare-picker-card");

  if (!selectA || !selectB || !card) return;

  card.dataset.step = selectA.value && selectB.value ? "complete" : selectA.value || selectB.value ? "half" : "empty";
}

function setupHelpToggle() {
  const button = document.getElementById("compareHelpToggle");
  const box = document.getElementById("compareHelpBox");
  if (!button || !box) return;

  button.addEventListener("click", () => {
    box.hidden = !box.hidden;
    button.classList.toggle("is-active", !box.hidden);
  });
}

/* =========================
   INIT
========================= */

function setupEvents() {
  const jurusanA = document.getElementById("jurusanA");
  const jurusanB = document.getElementById("jurusanB");
  const resetButton = document.getElementById("resetCompareJurusan");

  if (jurusanA) jurusanA.addEventListener("change", renderCompare);
  if (jurusanB) jurusanB.addEventListener("change", renderCompare);
  if (resetButton) resetButton.addEventListener("click", resetCompareJurusan);

  setupHelpToggle();
}

setupEvents();
loadData();
