/* =========================
   MASTER DATA / CHECKBOX
========================= */

async function loadMasterData() {
  const cachedMaster = sessionStorage.getItem("admin_master_data_v1");

  if (cachedMaster) {
    try {
      const parsed = JSON.parse(cachedMaster);
      kategoriData = parsed.kategoriData || [];
      tagData = parsed.tagData || [];
      jurusanData = parsed.jurusanData || [];
      renderMasterInputs();
      return;
    } catch (error) {
      console.warn("Cache master data rusak, mengambil ulang dari Supabase.", error);
      sessionStorage.removeItem("admin_master_data_v1");
    }
  }

  const [kategoriResult, tagResult, jurusanResult] = await Promise.all([
    supabaseClient.from("kategori").select("id, nama, slug, tipe").order("nama", { ascending: true }),
    supabaseClient.from("tags").select("id, nama, slug").order("nama", { ascending: true }),
    supabaseClient.from("jurusan").select("id, nama").order("nama", { ascending: true })
  ]);

  if (kategoriResult.error) console.error("Kategori error:", kategoriResult.error);
  if (tagResult.error) console.error("Tag error:", tagResult.error);
  if (jurusanResult.error) console.error("Jurusan error:", jurusanResult.error);

  kategoriData = kategoriResult.data || [];
  tagData = tagResult.data || [];
  jurusanData = jurusanResult.data || [];

  sessionStorage.setItem(
    "admin_master_data_v1",
    JSON.stringify({ kategoriData, tagData, jurusanData })
  );

  renderMasterInputs();
}

function clearMasterDataCache() {
  sessionStorage.removeItem("admin_master_data_v1");
}

function renderMasterInputs() {
  const kategoriInfo = kategoriData.filter(item => (item.tipe || "info") === "info");
  const kategoriWiki = kategoriData.filter(item => item.tipe === "wiki");

  fillCheckGroup("infoKategoriMulti", kategoriInfo);
  fillWikiKategoriInput(kategoriWiki);
  fillCheckGroup("wikiTagMulti", tagData);
  fillCheckGroup("jobJurusanMulti", jurusanData);
  fillSingleSelect("statistikJurusan", jurusanData);
}

function fillWikiKategoriInput(data) {
  const input = qs("wikiKategoriInput");
  const list = qs("wikiKategoriList");
  const legacy = qs("wikiKategoriMulti");
  if (list) {
    list.innerHTML = data.map(item => `<option value="${item.nama}"></option>`).join("");
  }
  if (legacy) fillCheckGroup("wikiKategoriMulti", data);
  if (legacy) legacy.hidden = true;
  if (input) input.dataset.ready = "true";
}

function slugifyAdmin(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "kategori";
}

async function ensureWikiKategoriFromInput() {
  const input = qs("wikiKategoriInput");
  const name = input?.value.trim();
  if (!name) return [];

  let existing = kategoriData.find(item =>
    item.tipe === "wiki" && item.nama.toLowerCase() === name.toLowerCase()
  );
  if (existing) return [Number(existing.id)];

  const baseSlug = slugifyAdmin(name);
  let slug = baseSlug;
  let counter = 2;
  while (kategoriData.some(item => item.slug === slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const { data, error } = await supabaseClient
    .from("kategori")
    .insert({ nama: name, slug, tipe: "wiki" })
    .select("id, nama, slug, tipe")
    .single();

  if (error) throw error;
  kategoriData.push(data);
  clearMasterDataCache();
  await loadMasterData();
  if (input) input.value = data.nama;
  return [Number(data.id)];
}

function fillCheckGroup(elementId, data) {
  const container = qs(elementId);
  if (!container) return;

  const emptyLabel = elementId === "jobJurusanMulti"
    ? "Pilih jurusan terkait"
    : "Pilih data";

  container.className = "multi-select";
  container.innerHTML = `
    <button type="button" class="multi-select-button">${emptyLabel}</button>
    <div class="multi-select-panel">
      <input type="search" class="multi-select-search" placeholder="Cari..." />
      <div class="multi-select-options">
        ${data.map(item => `
          <label class="multi-option">
            <input type="checkbox" value="${item.id}">
            <span>${item.nama}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;

  const button = container.querySelector(".multi-select-button");
  const search = container.querySelector(".multi-select-search");
  const panel = container.querySelector(".multi-select-panel");
  const options = container.querySelector(".multi-select-options");

  button.addEventListener("click", event => {
    event.stopPropagation();
    closeAllMultiSelect(container);
    container.classList.toggle("open");
    search.focus();
  });

  panel?.addEventListener("click", event => {
    event.stopPropagation();
  });

  search.addEventListener("input", () => {
    const keyword = normalizeMultiSelectSearch(search.value);
    options.querySelectorAll(".multi-option").forEach(option => {
      const text = normalizeMultiSelectSearch(option.textContent);
      option.hidden = keyword ? !text.includes(keyword) : false;
    });
  });

  container.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => updateMultiSelectLabel(container));
  });

  updateMultiSelectLabel(container);
}

function normalizeMultiSelectSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function updateMultiSelectLabel(container) {
  if (!container) return;
  const button = container.querySelector(".multi-select-button");
  const checked = container.querySelectorAll("input[type='checkbox']:checked");
  if (!button) return;

  const isJobJurusan = container.id === "jobJurusanMulti";

  if (!checked.length) {
    button.textContent = isJobJurusan ? "Pilih jurusan terkait" : "Pilih data";
    return;
  }

  if (checked.length === 1) {
    const label = checked[0].closest("label")?.querySelector("span")?.textContent;
    button.textContent = label || "1 data dipilih";
    return;
  }

  button.textContent = `${checked.length} ${isJobJurusan ? "jurusan" : "data"} dipilih`;
}

function closeAllMultiSelect(except = null) {
  document.querySelectorAll(".multi-select.open").forEach(select => {
    if (select !== except) select.classList.remove("open");
  });
}

document.addEventListener("click", () => closeAllMultiSelect());

function fillSingleSelect(elementId, data) {
  const select = qs(elementId);
  if (!select) return;

  select.innerHTML =
    `<option value="">Pilih jurusan</option>` +
    data.map(item => `<option value="${item.id}">${item.nama}</option>`).join("");
}

function getSelectedValues(elementId) {
  const container = qs(elementId);
  if (!container) return [];

  return Array.from(container.querySelectorAll("input[type='checkbox']:checked"))
    .map(input => Number(input.value));
}

async function saveRelations(type, artikelId, kategoriIds = [], tagIds = [], jurusanIds = []) {
  await Promise.all([
    supabaseClient.from("artikel_kategori").delete().eq("artikel_tipe", type).eq("artikel_id", artikelId),
    supabaseClient.from("artikel_tags").delete().eq("artikel_tipe", type).eq("artikel_id", artikelId),
    supabaseClient.from("artikel_jurusan").delete().eq("artikel_tipe", type).eq("artikel_id", artikelId)
  ]);

  const inserts = [];

  if (kategoriIds.length) {
    inserts.push(supabaseClient.from("artikel_kategori").insert(
      kategoriIds.map(id => ({ artikel_tipe: type, artikel_id: artikelId, kategori_id: id }))
    ));
  }

  if (tagIds.length) {
    inserts.push(supabaseClient.from("artikel_tags").insert(
      tagIds.map(id => ({ artikel_tipe: type, artikel_id: artikelId, tag_id: id }))
    ));
  }

  if (jurusanIds.length) {
    inserts.push(supabaseClient.from("artikel_jurusan").insert(
      jurusanIds.map(id => ({ artikel_tipe: type, artikel_id: artikelId, jurusan_id: id }))
    ));
  }

  if (inserts.length) await Promise.all(inserts);
}

async function getRelations(type, artikelId) {
  const [kategoriResult, tagResult, jurusanResult] = await Promise.all([
    supabaseClient.from("artikel_kategori").select("kategori_id").eq("artikel_tipe", type).eq("artikel_id", artikelId),
    supabaseClient.from("artikel_tags").select("tag_id").eq("artikel_tipe", type).eq("artikel_id", artikelId),
    supabaseClient.from("artikel_jurusan").select("jurusan_id").eq("artikel_tipe", type).eq("artikel_id", artikelId)
  ]);

  return {
    kategoriIds: (kategoriResult.data || []).map(row => Number(row.kategori_id)),
    tagIds: (tagResult.data || []).map(row => Number(row.tag_id)),
    jurusanIds: (jurusanResult.data || []).map(row => Number(row.jurusan_id))
  };
}

async function setSelectedRelations(type, artikelId, kategoriId, tagId, jurusanId) {
  const relations = await getRelations(type, artikelId);
  setCheckedOptions(kategoriId, relations.kategoriIds);
  setCheckedOptions(tagId, relations.tagIds);
  setCheckedOptions(jurusanId, relations.jurusanIds);
}

function setCheckedOptions(containerId, selectedIds) {
  const container = qs(containerId);
  if (!container) return;

  container.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.checked = selectedIds.includes(Number(input.value));
  });

  updateMultiSelectLabel(container);
}
