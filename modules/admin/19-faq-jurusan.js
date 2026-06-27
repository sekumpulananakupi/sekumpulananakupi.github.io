/* =========================
   CRUD FAQ JURUSAN
========================= */

async function loadFaqJurusanData() {
  const { data, error } = await supabaseClient
    .from("faq_jurusan")
    .select("id, jurusan_id, pertanyaan, jawaban, urutan, jurusan:jurusan_id(nama)")
    .order("urutan", { ascending: true });

  if (error) {
    alert("Gagal memuat FAQ jurusan: " + error.message);
    return;
  }

  faqJurusanData = data || [];
  renderFaqJurusanList();
}

function populateFaqJurusanOptions() {
  const select = qs("faqJurusanSelect");
  if (!select) return;

  select.innerHTML =
    `<option value="">Pilih jurusan</option>` +
    jurusanAdminData.map(item => `
      <option value="${item.id}">${item.nama}</option>
    `).join("");
}

function renderFaqJurusanList() {
  const list = qs("faqJurusanList");
  if (!list) return;

  list.innerHTML = faqJurusanData.length
    ? faqJurusanData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.jurusan?.nama || "Jurusan"}</span>
          <h3>${item.pertanyaan}</h3>
          <p>${item.jawaban}</p>
          <small>Urutan: ${item.urutan || 0}</small>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editFaqJurusan(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteFaqJurusan(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada FAQ jurusan.</div>`;
}

if (qs("faqJurusanForm")) {
  qs("faqJurusanForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("faqJurusanId").value;

    const payload = {
      jurusan_id: Number(qs("faqJurusanSelect").value),
      pertanyaan: qs("faqJurusanPertanyaan").value,
      jawaban: qs("faqJurusanJawaban").value,
      urutan: Number(qs("faqJurusanUrutan").value || 0)
    };

    const response = id
      ? await supabaseClient.from("faq_jurusan").update(payload).eq("id", id)
      : await supabaseClient.from("faq_jurusan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan FAQ jurusan: " + response.error.message);
      return;
    }

    clearFaqJurusanForm();
    await loadFaqJurusanData();
  });
}

function editFaqJurusan(id) {
  const item = faqJurusanData.find(row => row.id === id);
  if (!item) return;

  qs("faqJurusanId").value = item.id;
  qs("faqJurusanSelect").value = item.jurusan_id;
  qs("faqJurusanPertanyaan").value = item.pertanyaan || "";
  qs("faqJurusanJawaban").value = item.jawaban || "";
  qs("faqJurusanUrutan").value = item.urutan || 0;

  showAdminPage("faqJurusanPage");
}

async function deleteFaqJurusan(id) {
  if (!confirm("Yakin ingin menghapus FAQ jurusan ini?")) return;

  const { error } = await supabaseClient
    .from("faq_jurusan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus FAQ jurusan: " + error.message);
    return;
  }

  await loadFaqJurusanData();
}

function clearFaqJurusanForm() {
  qs("faqJurusanForm")?.reset();
  if (qs("faqJurusanId")) qs("faqJurusanId").value = "";
}

