/* =========================
   CRUD LOWONGAN + AI IMPORT TEKS & GAMBAR
   SA UPI Admin
========================= */

if (qs("jobForm")) {
  qs("jobForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("jobId").value;
    const imageFile = qs("jobImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      posisi: qs("jobTitle").value,
      perusahaan: qs("jobCompany").value,
      lokasi: qs("jobLocation").value,
      link: qs("jobLink").value,
      deadline: qs("jobDeadline").value || null,
      status: qs("jobStatus").value || "aktif",
      tipe_pekerjaan: qs("jobType").value || null,
      jenjang_pendidikan: qs("jobEducation").value || null,
      is_featured: qs("jobFeatured").checked,
      sumber: qs("jobSource").value || null,
      gaji_min: qs("jobSalaryMin").value ? Number(qs("jobSalaryMin").value) : null,
      gaji_max: qs("jobSalaryMax").value ? Number(qs("jobSalaryMax").value) : null,
      gaji_keterangan: qs("jobSalaryNote").value || null,
      deskripsi: getEditorHTML("job"),
      raw_text: qs("jobRawImport")?.value?.trim() || null,
      quality_score: qs("jobImportScore")
        ? Number(qs("jobImportScore").textContent) || null
        : null
    };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("lowongan_kerja")
        .update(payload)
        .eq("id", id);
    } else {
      response = await supabaseClient
        .from("lowongan_kerja")
        .insert(payload)
        .select()
        .single();
    }

    if (response.error) {
      alert("Gagal menyimpan lowongan: " + response.error.message);
      return;
    }

    const savedId = id ? Number(id) : response.data.id;

    await saveRelations(
      "job",
      savedId,
      [],
      [],
      getSelectedValues("jobJurusanMulti")
    );

    clearForm("job");
    clearJobImportPanel();
    await loadJobData();
    resetDashboardAudit();
    localStorage.removeItem("draft_job");
  });
}

/* =========================
   ELEMENT IMPORT LOWONGAN
========================= */

const jobRawImport = document.getElementById("jobRawImport");
const analyzeJobImport = document.getElementById("analyzeJobImport");
const clearJobImport = document.getElementById("clearJobImport");
const jobImportScore = document.getElementById("jobImportScore");
const jobImportWarning = document.getElementById("jobImportWarning");
const jobImportImage = document.getElementById("jobImportImage");
const analyzeJobImageImport = document.getElementById("analyzeJobImageImport");
const jobImagePreview = document.getElementById("jobImageImportPreview");

/* =========================
   IMPORT TEKS LOWONGAN
========================= */

if (analyzeJobImport) {
  analyzeJobImport.addEventListener("click", async () => {
    const text = jobRawImport?.value?.trim();

    if (!text) {
      alert("Paste dulu teks lowongannya.");
      return;
    }

    setButtonLoading(analyzeJobImport, true, "Menganalisis...");

    try {
      const result = await analyzeJobWithAI(text);
      applyJobAIResult(result, {
        fallbackDescription: text.replace(/\n/g, "<br>"),
        source: "Telegram"
      });
    } catch (error) {
      console.error(error);
      alert(getFriendlyError(error, "Gagal menganalisis lowongan dengan AI."));
    } finally {
      setButtonLoading(analyzeJobImport, false, "Analisis & Isi Form");
    }
  });
}

async function analyzeJobWithAI(text) {
  const { data, error } = await supabaseClient.functions.invoke("analyze-job-import", {
    body: { text },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data;
}

/* =========================
   IMPORT GAMBAR LOWONGAN
========================= */

if (jobImportImage) {
  jobImportImage.addEventListener("change", async () => {
    const file = jobImportImage.files?.[0];

    if (!file) {
      if (jobImagePreview) jobImagePreview.innerHTML = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar.");
      jobImportImage.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("Ukuran gambar terlalu besar. Maksimal 4 MB agar AI lebih stabil.");
      jobImportImage.value = "";
      return;
    }

    if (jobImagePreview) {
      const previewUrl = URL.createObjectURL(file);
      jobImagePreview.innerHTML = `
        <div class="job-image-preview-card">
          <img src="${previewUrl}" alt="Preview poster lowongan">
          <span>${escapeHTML(file.name)}</span>
        </div>
      `;
    }
  });
}

if (analyzeJobImageImport) {
  analyzeJobImageImport.addEventListener("click", async () => {
    const file = jobImportImage?.files?.[0];

    console.log("[AI IMAGE IMPORT] File dipilih:", file);

    if (!file) {
      alert("Upload dulu gambar/poster lowongannya.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("Ukuran gambar terlalu besar. Maksimal 4 MB agar AI lebih stabil.");
      return;
    }

    setButtonLoading(analyzeJobImageImport, true, "Upload gambar...");

    try {
      const imageUrl = await uploadImage(file);

      console.log("[AI IMAGE IMPORT] Image URL dari Supabase:", imageUrl);

      if (!imageUrl) {
        alert("Gagal upload gambar lowongan.");
        return;
      }

      setButtonLoading(analyzeJobImageImport, true, "Menganalisis gambar...");

      const payload = {
        imageUrl
      };

      console.log("[AI IMAGE IMPORT] Payload ke Edge Function:", payload);

      const result = await analyzeJobImageWithAI(payload);

      console.log("[AI IMAGE IMPORT] Hasil mentah dari AI:", result);
      console.table({
        title: result.title,
        company: result.company,
        location: result.location,
        deadline: result.deadline,
        type: result.type,
        education: result.education,
        quality_score: result.quality_score,
        warning: result.warning
      });

      if (jobRawImport) {
        jobRawImport.value = result.raw_text || "";
      }

      applyJobAIResult(result, {
        fallbackDescription: result.raw_text || "",
        source: "Instagram"
      });

      console.log("[AI IMAGE IMPORT] Form berhasil diisi dari hasil AI.");

    } catch (error) {
      console.error("[AI IMAGE IMPORT] Error:", error);
      alert(getFriendlyError(error, "Gagal menganalisis gambar lowongan dengan AI."));
    } finally {
      setButtonLoading(analyzeJobImageImport, false, "Analisis Gambar");
    }
  });
}

async function analyzeJobImageWithAI(payload) {
  console.log("[SUPABASE FUNCTION] invoke analyze-job-image:", payload);

  const { data, error } = await supabaseClient.functions.invoke("analyze-job-image", {
    body: payload,
  });

  console.log("[SUPABASE FUNCTION] data:", data);
  console.log("[SUPABASE FUNCTION] error:", error);

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================
   APPLY HASIL AI KE FORM
========================= */

function applyJobAIResult(result, options = {}) {
  const fallbackDescription = options.fallbackDescription || "";
  const source = options.source || "Telegram";

  fillValue("jobTitle", result.title || result.posisi || "");
  fillValue("jobCompany", result.company || result.perusahaan || "");
  fillValue("jobLocation", result.location || result.lokasi || "");
  fillValue("jobLink", result.link || "");
  fillValue("jobDeadline", normalizeDateValue(result.deadline));
  fillValue("jobSource", result.source || source);
  fillValue("jobStatus", "draft");
  fillValue("jobType", normalizeSelectValue("jobType", result.type || result.tipe_pekerjaan));
  fillValue("jobEducation", normalizeSelectValue("jobEducation", result.education || result.jenjang_pendidikan));
  fillValue("jobSalaryMin", result.salary_min ?? result.gaji_min ?? "");
  fillValue("jobSalaryMax", result.salary_max ?? result.gaji_max ?? "");
  fillValue("jobSalaryNote", result.salary_note || result.gaji_keterangan || "");

  if (jobImportScore) {
    jobImportScore.textContent = result.quality_score || result.score || 0;
  }

  if (jobImportWarning) {
    jobImportWarning.textContent = result.warning || "";
  }

  const html = result.description_html || result.deskripsi_html || result.description || fallbackDescription;
  console.log("[AI RESULT] description_html:", html);
  setEditorHTML("job", html);

  if (Array.isArray(result.jurusan) && result.jurusan.length) {
    checkJurusanFromAI(result.jurusan);
  }

  updateJobAssistantStatus();
}

function checkJurusanFromAI(jurusanNames) {
  const normalizedAI = jurusanNames.map(normalizeText).filter(Boolean);
  const checkboxes = document.querySelectorAll('#jobJurusanMulti input[type="checkbox"]');

  checkboxes.forEach(checkbox => {
    const label = checkbox.closest("label")?.innerText || checkbox.dataset.label || checkbox.value;
    const normalizedLabel = normalizeText(label);
    const normalizedValue = normalizeText(checkbox.value);

    const matched = normalizedAI.some(name =>
      normalizedLabel.includes(name) ||
      name.includes(normalizedLabel) ||
      normalizedValue.includes(name) ||
      name.includes(normalizedValue)
    );

    if (matched) checkbox.checked = true;
  });
}

/* =========================
   CLEAR & UTILITIES
========================= */

if (clearJobImport) {
  clearJobImport.addEventListener("click", clearJobImportPanel);
}

function clearJobImportPanel() {
  if (jobRawImport) jobRawImport.value = "";
  if (jobImportImage) jobImportImage.value = "";
  if (jobImagePreview) jobImagePreview.innerHTML = "";
  if (jobImportScore) jobImportScore.textContent = "0";
  if (jobImportWarning) jobImportWarning.textContent = "";
}

function fillValue(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setEditorHTML(type, html) {
  const safeHTML = html || "";
  const editorContainer = document.querySelector(`#${type}Editor`);
  const hiddenInput = document.getElementById(`${type}Content`);

  if (editorContainer && typeof Quill !== "undefined") {
    const quill = Quill.find(editorContainer);

    if (quill) {
      quill.clipboard.dangerouslyPasteHTML(safeHTML);
    } else {
      const editor = editorContainer.querySelector(".ql-editor");
      if (editor) editor.innerHTML = safeHTML;
    }
  } else {
    const editor = document.querySelector(`#${type}Editor .ql-editor`);
    if (editor) editor.innerHTML = safeHTML;
  }

  if (hiddenInput) {
    hiddenInput.value = safeHTML;
  }

  updateJobAssistantStatus();
}

function updateJobAssistantStatus() {
  const deadline = qs("jobDeadline")?.value;
  const desc = getEditorHTML("job") || "";
  const plainText = desc.replace(/<[^>]*>/g, " ").trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;

  if (qs("jobDeadlineStatus")) {
    qs("jobDeadlineStatus").textContent = deadline ? "Sudah diisi" : "Belum diisi";
  }

  if (qs("jobDescStatus")) {
    qs("jobDescStatus").textContent = `${wordCount} kata`;
  }
}

function normalizeDateValue(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return "";
}

function normalizeSelectValue(selectId, value) {
  const select = document.getElementById(selectId);
  if (!select || !value) return "";

  const normalizedValue = normalizeText(value);
  const option = [...select.options].find(opt => normalizeText(opt.value) === normalizedValue || normalizeText(opt.textContent) === normalizedValue);

  return option ? option.value : "";
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "dan")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function setButtonLoading(button, isLoading, label) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = label;
}

function getFriendlyError(error, fallback) {
  const message = error?.message || String(error || "");

  if (/credit|402|payment/i.test(message)) {
    return "Credit LLM CloudCrafters belum cukup atau belum dipindahkan ke Credit LLM.";
  }

  if (/unauthorized|401|403|api key/i.test(message)) {
    return "API key CloudCrafters bermasalah. Cek secret CC_API_KEY.";
  }

  return fallback;
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
