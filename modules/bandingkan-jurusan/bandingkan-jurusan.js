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

function getTextPreview(text, maxLength = 220) {
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
  const dayaTampung = Number(stat?.daya_tampung || 0);
  const peminat = Number(stat?.peminat || 0);

  if (!dayaTampung || !peminat) return "-";

  const rasio = peminat / dayaTampung;
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

  if (!uktValues.length && !ipiValues.length) {
    return {
      uktMin: null,
      uktMax: null,
      ipiMin: null,
      ipiMax: null,
      jalur: []
    };
  }

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

function normalizeAkreditasi(value) {
  return String(value || "").trim().toLowerCase();
}

function compareHigherBetter(valueA, valueB, labelA, labelB, suffix = "") {
  if (valueA === null || valueB === null || valueA === undefined || valueB === undefined) return "Data belum lengkap.";
  if (Number(valueA) === Number(valueB)) return "Keduanya sama.";
  return Number(valueA) > Number(valueB)
    ? `${labelA} lebih tinggi${suffix}.`
    : `${labelB} lebih tinggi${suffix}.`;
}

function compareLowerBetter(valueA, valueB, labelA, labelB, suffix = "") {
  if (valueA === null || valueB === null || valueA === undefined || valueB === undefined) return "Data belum lengkap.";
  if (Number(valueA) === Number(valueB)) return "Keduanya sama.";
  return Number(valueA) < Number(valueB)
    ? `${labelA} lebih rendah${suffix}.`
    : `${labelB} lebih rendah${suffix}.`;
}

/* =========================
   LOAD DATA
========================= */

async function loadData() {
  const result = document.getElementById("compareResult");

  if (result) {
    result.innerHTML = `<div class="empty">Memuat data jurusan...</div>`;
  }

  const cacheKey = "compare_jurusan_v2";
  const cached = getCache(cacheKey, 1440);

  if (cached) {
    jurusanData = cached.jurusanData;
    statistikData = cached.statistikData;
    biayaData = cached.biayaData;

    fillSelect("jurusanA");
    fillSelect("jurusanB");
    applyCompareParamsFromURL();

    if (result && !document.getElementById("jurusanA")?.value) {
      result.innerHTML = `<div class="empty">Pilih dua jurusan untuk dibandingkan.</div>`;
    }

    return;
  }

  const [
    jurusanResponse,
    statistikResponse,
    biayaResponse
  ] = await Promise.all([

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

  if (jurusanResponse.error)
    console.error(jurusanResponse.error);

  if (statistikResponse.error)
    console.error(statistikResponse.error);

  if (biayaResponse.error)
    console.error(biayaResponse.error);

  jurusanData = jurusanResponse.data || [];
  statistikData = statistikResponse.data || [];
  biayaData = biayaResponse.data || [];

  setCache(cacheKey, {
    jurusanData,
    statistikData,
    biayaData
  });

  fillSelect("jurusanA");
  fillSelect("jurusanB");
  applyCompareParamsFromURL();

  if (result && !document.getElementById("jurusanA")?.value) {
    result.innerHTML = `<div class="empty">Pilih dua jurusan untuk dibandingkan.</div>`;
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
    result.innerHTML = `<div class="empty">Jurusan pertama sudah dipilih. Silakan pilih jurusan kedua untuk dibandingkan.</div>`;
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

  if (!idA || !idB) {
    result.innerHTML = `<div class="empty">Pilih dua jurusan untuk dibandingkan.</div>`;
    return;
  }

  if (idA && idB) {
  localStorage.removeItem("compareFirstJurusan");
  }

  if (idA === idB) {
    result.innerHTML = `<div class="empty">Pilih dua jurusan yang berbeda.</div>`;
    return;
  }

  const a = jurusanData.find(item => String(item.id) === String(idA));
  const b = jurusanData.find(item => String(item.id) === String(idB));

  if (!a || !b) {
    result.innerHTML = `<div class="empty">Data jurusan tidak ditemukan.</div>`;
    return;
  }

  const context = buildCompareContext(a, b);

  result.innerHTML = `
    <div class="compare-top-grid">
      ${renderJurusanHero(a, context.biayaA)}
      ${renderJurusanHero(b, context.biayaB)}
    </div>

    ${renderInsightBox(a, b, context)}
    ${renderCompareTable(a, b, context)}
  `;
}

function buildCompareContext(a, b) {
  const snbpA = getLatestStatistik(a.id, "SNBP");
  const snbpB = getLatestStatistik(b.id, "SNBP");
  const snbtA = getLatestStatistik(a.id, "SNBT");
  const snbtB = getLatestStatistik(b.id, "SNBT");

  const biayaA = getBiayaSummary(a.id);
  const biayaB = getBiayaSummary(b.id);

  return {
    snbpA,
    snbpB,
    snbtA,
    snbtB,
    biayaA,
    biayaB
  };
}

function renderJurusanHero(item, biaya) {
  return `
    <article class="compare-hero-card">
      <div class="compare-hero-pills">
        <span class="pill">${escapeHTML(item.fakultas || "UPI")}</span>
        <span class="pill">${escapeHTML(item.jenjang || "-")}</span>
      </div>

      <h3>${escapeHTML(item.nama)}</h3>
      <p>${escapeHTML(getTextPreview(item.deskripsi, 180))}</p>

      <div class="compare-mini-grid">
        <div>
          <span>Akreditasi</span>
          <strong>${escapeHTML(item.akreditasi || "-")}</strong>
        </div>
        <div>
          <span>UKT/Biaya</span>
          <strong>${escapeHTML(formatBiayaRange(biaya.uktMin, biaya.uktMax))}</strong>
        </div>
      </div>

      <a href="../pages/jurusan-detail.html?id=${encodeURIComponent(item.id)}" class="btn ghost">
        Lihat Detail
      </a>
    </article>
  `;
}

function renderInsightBox(a, b, context) {
  const aName = a.nama || "Jurusan A";
  const bName = b.nama || "Jurusan B";

  const snbpRateA = getPersentaseKeterimaan(context.snbpA);
  const snbpRateB = getPersentaseKeterimaan(context.snbpB);
  const snbtRateA = getPersentaseKeterimaan(context.snbtA);
  const snbtRateB = getPersentaseKeterimaan(context.snbtB);

  const uktMaxA = context.biayaA.uktMax;
  const uktMaxB = context.biayaB.uktMax;

  const sameAkreditasi = normalizeAkreditasi(a.akreditasi) &&
    normalizeAkreditasi(a.akreditasi) === normalizeAkreditasi(b.akreditasi);

  return `
    <section class="compare-insight-box">
      <h3>Ringkasan Cepat</h3>
      <ul>
        <li>${sameAkreditasi ? `Akreditasi keduanya sama-sama ${escapeHTML(a.akreditasi)}.` : `Akreditasi: ${escapeHTML(aName)} (${escapeHTML(a.akreditasi || "-")}) vs ${escapeHTML(bName)} (${escapeHTML(b.akreditasi || "-")}).`}</li>
        <li>SNBP: ${escapeHTML(compareHigherBetter(snbpRateA, snbpRateB, aName, bName, " persentase keterimaannya"))}</li>
        <li>SNBT: ${escapeHTML(compareHigherBetter(snbtRateA, snbtRateB, aName, bName, " persentase keterimaannya"))}</li>
        <li>Biaya tertinggi: ${escapeHTML(compareLowerBetter(uktMaxA, uktMaxB, aName, bName, " dibanding yang lain"))}</li>
      </ul>
    </section>
  `;
}

function renderCompareTable(a, b, context) {
  return `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Aspek</th>
            <th>${escapeHTML(a.nama)}</th>
            <th>${escapeHTML(b.nama)}</th>
          </tr>
        </thead>
        <tbody>
          ${row("Fakultas", a.fakultas, b.fakultas)}
          ${row("Jenjang", a.jenjang, b.jenjang)}
          ${row("Akreditasi", a.akreditasi, b.akreditasi)}
          ${row("Website Resmi", renderLink(a.website_resmi), renderLink(b.website_resmi), true)}
          ${row("Kurikulum", renderLink(a.url_kurikulum, "Lihat Kurikulum"), renderLink(b.url_kurikulum, "Lihat Kurikulum"), true)}
          ${row("Akreditasi Dokumen", renderLink(a.url_akreditasi, "Lihat Akreditasi"), renderLink(b.url_akreditasi, "Lihat Akreditasi"), true)}

          ${statRows("SNBP", context.snbpA, context.snbpB)}
          ${statRows("SNBT", context.snbtA, context.snbtB)}

          ${row("UKT/Biaya Terendah", formatRupiah(context.biayaA.uktMin), formatRupiah(context.biayaB.uktMin))}
          ${row("UKT/Biaya Tertinggi", formatRupiah(context.biayaA.uktMax), formatRupiah(context.biayaB.uktMax))}
          ${row("IPI Terendah", formatRupiah(context.biayaA.ipiMin), formatRupiah(context.biayaB.ipiMin))}
          ${row("IPI Tertinggi", formatRupiah(context.biayaA.ipiMax), formatRupiah(context.biayaB.ipiMax))}
          ${row("Jalur Biaya Tersedia", context.biayaA.jalur.join(", ") || "-", context.biayaB.jalur.join(", ") || "-")}
          ${row("Prospek Kerja", renderList(a.prospek_kerja), renderList(b.prospek_kerja), true)}
        </tbody>
      </table>
    </div>

    <div class="info-note compare-note">
      <strong>Catatan:</strong>
      Persentase keterimaan dihitung dari daya tampung dibagi peminat. Rasio persaingan dihitung dari jumlah peminat per satu kursi.
      Data biaya merupakan ringkasan dari tabel biaya pendidikan yang tersedia di database.
    </div>
  `;
}

function row(label, valueA, valueB, isHTML = false) {
  return `
    <tr>
      <td><strong>${escapeHTML(label)}</strong></td>
      <td>${isHTML ? valueA : escapeHTML(valueA || "-")}</td>
      <td>${isHTML ? valueB : escapeHTML(valueB || "-")}</td>
    </tr>
  `;
}

function statRows(label, statA, statB) {
  return `
    ${row(`${label} Tahun Terbaru`, statA?.tahun || "-", statB?.tahun || "-")}
    ${row(`${label} Daya Tampung`, statA ? `${formatNumber(statA.daya_tampung)} kursi` : "-", statB ? `${formatNumber(statB.daya_tampung)} kursi` : "-")}
    ${row(`${label} Peminat`, statA ? `${formatNumber(statA.peminat)} peminat` : "-", statB ? `${formatNumber(statB.peminat)} peminat` : "-")}
    ${row(`${label} Persentase Keterimaan`, formatPersentaseKeterimaan(statA), formatPersentaseKeterimaan(statB))}
    ${row(`${label} Rasio Persaingan`, getRasioPersaingan(statA), getRasioPersaingan(statB))}
  `;
}

function renderLink(url, label = "Buka Link") {
  if (!url) return "-";

  return `
    <a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="compare-link">
      ${escapeHTML(label)}
    </a>
  `;
}

function renderList(text) {
  const items = String(text || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

  if (!items.length) return "-";

  return `
    <ul class="compare-list">
      ${items.slice(0, 8).map(item => `<li>${escapeHTML(item)}</li>`).join("")}
    </ul>
  `;
}

function resetCompareJurusan() {
  localStorage.removeItem("compareFirstJurusan");

  const selectA = document.getElementById("jurusanA");
  const selectB = document.getElementById("jurusanB");
  const result = document.getElementById("compareResult");

  if (selectA) selectA.value = "";
  if (selectB) selectB.value = "";

  if (result) {
    result.innerHTML = `<div class="empty">Pilih dua jurusan untuk dibandingkan.</div>`;
  }

  const cleanURL = window.location.pathname;
  window.history.replaceState({}, "", cleanURL);
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
}

setupEvents();
loadData();
