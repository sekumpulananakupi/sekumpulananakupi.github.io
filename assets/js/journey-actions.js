/* Shared client-side journey helpers for the public SA UPI experience. */
const SAUPI_JOURNEY_KEY = "saupi_major_journey_v1";

function readMajorJourney() {
  try {
    return JSON.parse(localStorage.getItem(SAUPI_JOURNEY_KEY)) || {
      saved: [],
      active: null,
      comparison: []
    };
  } catch (error) {
    console.warn("Journey jurusan tidak dapat dibaca:", error);
    return { saved: [], active: null, comparison: [] };
  }
}

function writeMajorJourney(journey) {
  try {
    localStorage.setItem(SAUPI_JOURNEY_KEY, JSON.stringify(journey));
  } catch (error) {
    console.warn("Journey jurusan tidak dapat disimpan:", error);
  }
}

function setActiveMajor(major) {
  const journey = readMajorJourney();
  journey.active = {
    id: String(major.id),
    name: major.name || "Jurusan UPI",
    faculty: major.faculty || "",
    updatedAt: new Date().toISOString()
  };
  writeMajorJourney(journey);
  return journey;
}

function toggleSavedMajor(major) {
  const journey = readMajorJourney();
  const id = String(major.id);
  const index = journey.saved.findIndex(item => String(item.id) === id);

  if (index >= 0) {
    journey.saved.splice(index, 1);
  } else {
    journey.saved.unshift({
      id,
      name: major.name || "Jurusan UPI",
      faculty: major.faculty || "",
      savedAt: new Date().toISOString()
    });
  }

  setActiveMajor(major);
  writeMajorJourney(journey);
  return { saved: index < 0, journey };
}

function isSavedMajor(id) {
  return readMajorJourney().saved.some(item => String(item.id) === String(id));
}

function createCompareMajorUrl(major) {
  const journey = setActiveMajor(major);
  const candidates = [String(major.id), ...journey.comparison.map(String)]
    .filter((id, index, list) => list.indexOf(id) === index)
    .slice(0, 2);

  journey.comparison = candidates;
  writeMajorJourney(journey);

  const params = new URLSearchParams();
  params.set("jurusanA", candidates[0]);
  if (candidates[1]) params.set("jurusanB", candidates[1]);
  return `../pages/bandingkan-jurusan.html?${params.toString()}`;
}

function createMajorAiUrl(major) {
  setActiveMajor(major);
  const prompt = `Saya sedang mempertimbangkan jurusan ${major.name || "ini"} di UPI. Bantu saya menilai kecocokan, biaya, peluang masuk, dan prospek kerjanya. Jelaskan batasan data dan sumber resmi yang perlu saya cek.`;
  return `../pages/asisten-ai.html?majorId=${encodeURIComponent(major.id)}&majorName=${encodeURIComponent(major.name || "")}&prompt=${encodeURIComponent(prompt)}`;
}

function renderMajorJourneyActions(major) {
  const saved = isSavedMajor(major.id);
  const compareUrl = createCompareMajorUrl(major);

  return `
    <section class="context-action-block" aria-labelledby="majorJourneyTitle">
      <div class="context-action-copy">
        <p class="eyebrow">Langkah berikutnya</p>
        <h2 id="majorJourneyTitle">Susun pilihan jurusanmu</h2>
        <p>Simpan jurusan ini, bandingkan dengan pilihan lain, tinjau biaya, lalu minta penjelasan AI dengan konteks jurusan aktif.</p>
      </div>
      <div class="context-action-list">
        <button type="button" class="btn primary" data-save-major data-major-id="${String(major.id)}" data-major-name="${escapeJourneyAttribute(major.name)}" data-major-faculty="${escapeJourneyAttribute(major.faculty)}" aria-pressed="${saved}">
          <i class="fa-${saved ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i>
          <span>${saved ? "Tersimpan" : "Simpan Jurusan"}</span>
        </button>
        <a class="btn secondary" data-compare-major href="${compareUrl}">
          <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i> Bandingkan Pilihan
        </a>
        <a class="btn ghost" href="#biaya">
          <i class="fa-solid fa-wallet" aria-hidden="true"></i> Tinjau Biaya
        </a>
        <a class="btn ghost" href="../pages/lowongan.html?jurusan=${encodeURIComponent(major.name || "")}">
          <i class="fa-solid fa-briefcase" aria-hidden="true"></i> Lihat Lowongan Terkait
        </a>
        <a class="btn ghost" href="${createMajorAiUrl(major)}">
          <i class="fa-solid fa-sparkles" aria-hidden="true"></i> Tanya AI tentang Jurusan Ini
        </a>
      </div>
      <p class="context-action-status" aria-live="polite"></p>
    </section>`;
}

function escapeJourneyAttribute(value) {
  const entities = {
    "&": String.fromCharCode(38) + "amp;",
    "<": String.fromCharCode(38) + "lt;",
    ">": String.fromCharCode(38) + "gt;",
    "'": String.fromCharCode(38) + "#39;",
    "\"": String.fromCharCode(38) + "quot;"
  };
  return String(value || "").replace(/[&<>'"]/g, char => entities[char]);
}

function setupMajorJourneyActions() {
  document.querySelectorAll("[data-save-major]").forEach(button => {
    button.addEventListener("click", () => {
      const result = toggleSavedMajor({
        id: button.dataset.majorId,
        name: button.dataset.majorName,
        faculty: button.dataset.majorFaculty
      });
      button.setAttribute("aria-pressed", String(result.saved));
      button.innerHTML = `<i class="fa-${result.saved ? "solid" : "regular"} fa-bookmark" aria-hidden="true"></i><span>${result.saved ? "Tersimpan" : "Simpan Jurusan"}</span>`;
      const status = button.closest(".context-action-block")?.querySelector(".context-action-status");
      if (result.saved && typeof saveMajorForCurrentUser === "function") {
        saveMajorForCurrentUser({
          id: button.dataset.majorId,
          name: button.dataset.majorName,
          faculty: button.dataset.majorFaculty
        })
          .then(savedToAccount => {
            if (status) status.textContent = savedToAccount
              ? "Jurusan disimpan dan disinkronkan ke akun Anda."
              : "Jurusan disimpan di perangkat ini. Masuk untuk menyinkronkannya.";
          })
          .catch(() => {
            if (status) status.textContent = "Jurusan tersimpan di perangkat ini. Sinkronisasi akun akan dicoba lagi setelah Anda masuk.";
          });
      } else if (status) {
        status.textContent = result.saved ? "Jurusan disimpan di perangkat ini." : "Jurusan dihapus dari simpanan perangkat ini.";
      }
    });
  });
}
