/* =========================
   STATISTIK JURUSAN
========================= */

async function loadStatistikData() {
  const { data } = await supabaseClient
    .from("statistik_jurusan")
    .select("id, jurusan_id, tahun, jalur, daya_tampung, peminat, jurusan:jurusan_id(nama)")
    .order("tahun", { ascending: false });

  statistikData = data || [];
  renderStatistikList();
}

function renderStatistikList() {
  const list = qs("statistikList");
  if (!list) return;

  list.innerHTML = statistikData.length
    ? statistikData.map(item => {
        const persen = item.peminat > 0
          ? ((item.daya_tampung / item.peminat) * 100).toFixed(2)
          : "0.00";

        return `
          <article class="admin-list-item">
            <div>
              <span class="pill">${item.jurusan?.nama || "-"}</span>
              <h3>${item.jalur} ${item.tahun}</h3>
              <p>${item.daya_tampung} kursi dari ${item.peminat} peminat · ${persen}%</p>
            </div>

            <div class="card-actions">
              <button class="btn ghost" onclick="editStatistik(${item.id})">Edit</button>
              <button class="btn danger" onclick="deleteStatistik(${item.id})">Hapus</button>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty">Belum ada statistik jurusan.</div>`;
}

if (qs("statistikForm")) {
  qs("statistikForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("statistikId").value;

    const payload = {
      jurusan_id: Number(qs("statistikJurusan").value),
      tahun: Number(qs("statistikTahun").value),
      jalur: qs("statistikJalur").value,
      daya_tampung: Number(qs("statistikDayaTampung").value),
      peminat: Number(qs("statistikPeminat").value)
    };

    const response = id
      ? await supabaseClient.from("statistik_jurusan").update(payload).eq("id", id)
      : await supabaseClient.from("statistik_jurusan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan statistik: " + response.error.message);
      return;
    }

    clearStatistikForm();
    await loadStatistikData();
  });
}

function editStatistik(id) {
  const item = statistikData.find(row => row.id === id);
  if (!item) return;

  qs("statistikId").value = item.id;
  qs("statistikJurusan").value = item.jurusan_id;
  qs("statistikTahun").value = item.tahun;
  qs("statistikJalur").value = item.jalur;
  qs("statistikDayaTampung").value = item.daya_tampung;
  qs("statistikPeminat").value = item.peminat;

  showAdminPage("statistikPage");
}

async function deleteStatistik(id) {
  if (!confirm("Yakin ingin menghapus statistik ini?")) return;

  const { error } = await supabaseClient
    .from("statistik_jurusan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus statistik: " + error.message);
    return;
  }

  await loadStatistikData();
}

function clearStatistikForm() {
  qs("statistikForm")?.reset();
  if (qs("statistikId")) qs("statistikId").value = "";
}

