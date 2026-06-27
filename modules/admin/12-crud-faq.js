/* =========================
   CRUD FAQ
========================= */

async function loadFaqData() {
  const { data } = await supabaseClient
    .from("faq_kampus")
    .select("id, pertanyaan, jawaban, kategori, created_at")
    .order("created_at", { ascending: false });

  faqData = data || [];
  resetAdminListPagination("faq");
  renderFaqList();
  updateDashboardStats();
}

function renderFaqList() {
  const list = qs("faqList");
  if (!list) return;

  const visibleItems = faqData.slice(0, adminListVisibleCount.faq);

  list.innerHTML = visibleItems.length
    ? visibleItems.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.kategori || "FAQ"}</span>
          <h3>${item.pertanyaan}</h3>
          <p>${item.jawaban || ""}</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editFaq(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteFaq(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("") + renderAdminLoadMore("faq", faqData.length, "renderFaqList")
    : `<div class="empty">Belum ada FAQ.</div>`;
}

if (qs("faqForm")) {
  qs("faqForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("faqId").value;

    const payload = {
      pertanyaan: qs("faqPertanyaan").value,
      kategori: qs("faqKategori").value,
      jawaban: qs("faqJawaban").value
    };

    const response = id
      ? await supabaseClient.from("faq_kampus").update(payload).eq("id", id)
      : await supabaseClient.from("faq_kampus").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan FAQ: " + response.error.message);
      return;
    }

    clearFaqForm();
    await loadFaqData();
    resetDashboardAudit();
  });
}

function editFaq(id) {
  const item = faqData.find(row => row.id === id);
  if (!item) return;

  qs("faqId").value = item.id;
  qs("faqPertanyaan").value = item.pertanyaan || "";
  qs("faqKategori").value = item.kategori || "";
  qs("faqJawaban").value = item.jawaban || "";

  showAdminPage("faqPage");
}

async function deleteFaq(id) {
  if (!confirm("Yakin ingin menghapus FAQ ini?")) return;

  const { error } = await supabaseClient
    .from("faq_kampus")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus FAQ: " + error.message);
    return;
  }

  await loadFaqData();
    resetDashboardAudit();
}

function clearFaqForm() {
  qs("faqForm")?.reset();
  if (qs("faqId")) qs("faqId").value = "";
}

