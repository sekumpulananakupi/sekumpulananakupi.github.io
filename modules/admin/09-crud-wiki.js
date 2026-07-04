/* =========================
   CRUD WIKI
========================= */

if (qs("wikiForm")) {
  qs("wikiForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("wikiId").value;
    const imageFile = qs("wikiImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      judul: qs("wikiTitle").value,
      kategori: "",
      isi: getEditorHTML("wiki")
    };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("wiki_kampus")
        .update(payload)
        .eq("id", id);
    } else {
      response = await supabaseClient
        .from("wiki_kampus")
        .insert(payload)
        .select()
        .single();
    }

    if (response.error) {
      alert("Gagal menyimpan wiki: " + response.error.message);
      return;
    }

    const savedId = id ? Number(id) : response.data.id;

    let wikiKategoriIds = [];
    try {
      wikiKategoriIds = await ensureWikiKategoriFromInput();
    } catch (error) {
      alert("Gagal menyimpan kategori wiki: " + error.message);
      return;
    }

    await saveRelations(
      "wiki",
      savedId,
      wikiKategoriIds,
      getSelectedValues("wikiTagMulti"),
      []
    );

    clearForm("wiki");
    await loadWikiData();
localStorage.removeItem("draft_wiki");
localStorage.removeItem("draft_wiki_meta");
  });
}

/* =========================
   NOTION AI WIKI ASSISTANT
========================= */

function getWikiAIOptions() {
  return {
    seo: qs("aiSeo")?.checked || false,
    maba: qs("aiMaba")?.checked || false,
    faq: qs("aiFaq")?.checked || false,
    tips: qs("aiTips")?.checked || false,
    steps: qs("aiSteps")?.checked || false
  };
}

async function runWikiAI(mode = "generate") {
  const topic = qs("wikiAiTopic")?.value.trim();
  const angle = qs("wikiAiAngle")?.value.trim();
  const status = qs("wikiAiStatus");
  const currentTitle = qs("wikiTitle")?.value.trim();
  const currentContent = getEditorHTML("wiki");

  if (mode === "generate" && !topic) {
    alert("Isi dulu topik artikel wiki.");
    return;
  }

  if (mode !== "generate" && !currentContent) {
    alert("Isi artikel dulu, baru gunakan fitur perbaikan AI.");
    return;
  }

  if (mode === "selection-improve" && !getSelectedQuillHTML("wiki")) {
  alert("Blok dulu teks di editor yang ingin diperbaiki.");
  return;
}

  try {
    document
      .querySelectorAll(".notion-ai-actions button")
      .forEach(btn => btn.disabled = true);

    if (status) {
      status.className = "notion-ai-status";
      status.textContent = "AI sedang memproses...";
    }

    const { data, error } = await supabaseClient.functions.invoke(
      "ai-generate-wiki",
      {
        body: {
          mode,
          topic,
          angle,
          options: getWikiAIOptions(),
          current_title: currentTitle,
          current_html: currentContent,
          selected_html: getSelectedQuillHTML("wiki"),
          kategori: qs("wikiKategoriInput")?.value.trim() || "",
          tags: getSelectedValues("wikiTagMulti")
        }
      }
    );

    if (error) throw error;

    if (!data || !data.isi_html) {
      console.error(data);
      throw new Error("Respons AI tidak lengkap.");
    }

    if (data.judul && mode === "generate") {
      qs("wikiTitle").value = data.judul;
    }


    const html = normalizeAIHtmlForQuill(data.isi_html);

console.log("=== HTML SEBELUM MASUK QUILL ===");
console.log(html);

setEditorHTML("wiki", html);

setTimeout(() => {
  console.log("=== HTML SETELAH MASUK QUILL ===");
  console.log(getEditorHTML("wiki"));
}, 500);

    setEditorHTML("wiki", normalizeAIHtmlForQuill(data.isi_html));

try {
  localStorage.setItem("draft_wiki_meta", JSON.stringify({
    judul: data.judul || currentTitle || topic,
    mode,
    ai: true,
    generated_at: new Date().toISOString()
  }));
} catch (storageError) {
  console.warn("Draft terlalu besar untuk localStorage:", storageError);
}

    if (status) {
      status.className = "notion-ai-status success";
      status.textContent = `Selesai. Skor kualitas: ${data.quality_score || 0}/100`;
    }

    console.log("AI Wiki Result:", data);
  } catch (error) {
    console.error(error);

    if (status) {
      status.className = "notion-ai-status error";
      status.textContent = "Gagal memproses AI.";
    }

    alert("Gagal memproses AI: " + (error.message || error));
  } finally {
    document
      .querySelectorAll(".notion-ai-actions button")
      .forEach(btn => btn.disabled = false);
  }
}

if (qs("generateWikiAI")) {
  qs("generateWikiAI").addEventListener("click", () => {
    runWikiAI("generate");
  });
}

document.querySelectorAll(".notion-ai-action").forEach(button => {
  button.addEventListener("click", () => {
    const mode = button.dataset.aiAction;
    runWikiAI(mode);
  });
});

function getEditorHTML(type) {
  const selector = `#${type}Editor`;
  const editorRoot = document.querySelector(selector);

  if (window[`${type}Quill`]) {
    return window[`${type}Quill`].root.innerHTML;
  }

  if (window.editors && window.editors[type]) {
    return window.editors[type].root.innerHTML;
  }

  if (editorRoot && editorRoot.__quill) {
    return editorRoot.__quill.root.innerHTML;
  }

  const editor = document.querySelector(`${selector} .ql-editor`);
  if (editor) return editor.innerHTML;

  const textarea = qs(`${type}Content`) || qs(`${type}Isi`);
  return textarea ? textarea.value : "";
}

function setEditorHTML(type, html) {
  const selector = `#${type}Editor`;
  const editorRoot = document.querySelector(selector);
  const editor = document.querySelector(`${selector} .ql-editor`);

  // Kalau pakai Quill dan instance-nya tersimpan global
  if (window[`${type}Quill`]) {
    window[`${type}Quill`].clipboard.dangerouslyPasteHTML(html);
    return;
  }

  // Kalau Quill instance tersimpan di object editors
  if (window.editors && window.editors[type]) {
    window.editors[type].clipboard.dangerouslyPasteHTML(html);
    return;
  }

  // Fallback biasa
  if (editor) {
    editor.innerHTML = html;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (editorRoot && editorRoot.__quill) {
    editorRoot.__quill.clipboard.dangerouslyPasteHTML(html);
    return;
  }

  const textarea = qs(`${type}Content`) || qs(`${type}Isi`);
  if (textarea) {
    textarea.value = html;
  }
}

function normalizeAIHtmlForQuill(html) {
  return String(html || "")
    // Hapus wrapper list
    .replace(/<ul>/gi, "")
    .replace(/<\/ul>/gi, "")
    .replace(/<ol>/gi, "")
    .replace(/<\/ol>/gi, "")

    // Ubah setiap item jadi paragraf sendiri
    .replace(/<li>/gi, "<p>• ")
    .replace(/<\/li>/gi, "</p>")

    // Beri jarak setelah heading
    .replace(/<\/h2>/gi, "</h2><p><br></p>")
    .replace(/<\/h3>/gi, "</h3><p><br></p>")

    // Rapikan paragraf kosong berlebihan
    .replace(/(<p><br><\/p>){3,}/gi, "<p><br></p>");
}

function getSelectedQuillHTML(type) {
  const editorRoot = document.querySelector(`#${type}Editor`);

  let quill = null;

  if (window[`${type}Quill`]) {
    quill = window[`${type}Quill`];
  } else if (window.editors && window.editors[type]) {
    quill = window.editors[type];
  } else if (editorRoot && editorRoot.__quill) {
    quill = editorRoot.__quill;
  }

  if (!quill) return "";

  const range = quill.getSelection();

  if (!range || range.length === 0) {
    return "";
  }

  const contents = quill.getContents(range.index, range.length);
  const temp = document.createElement("div");
  const tempQuill = new Quill(temp);
  tempQuill.setContents(contents);

  return temp.querySelector(".ql-editor")?.innerHTML || "";
}