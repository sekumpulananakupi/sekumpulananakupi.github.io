/* =========================
   AUTO SAVE DRAFT
========================= */

function setupDraftAutosave(type, editor) {
  if (!editor) return;

  const key = `draft_${type}`;

  const saved = localStorage.getItem(key);

  if (saved) {
    editor.root.innerHTML = saved;
  }

  editor.on("text-change", () => {
    localStorage.setItem(
      key,
      editor.root.innerHTML
    );
  });
}


function getEditorHTML(type) {
  if (type === "info" && infoEditor) return infoEditor.root.innerHTML;
  if (type === "wiki" && wikiEditor) return wikiEditor.root.innerHTML;
  if (type === "job" && jobEditor) return jobEditor.root.innerHTML;

  const fallback = qs(`${type}Content`);
  return fallback ? fallback.value : "";
}

function setEditorHTML(type, html) {
  if (type === "info" && infoEditor) {
    infoEditor.root.innerHTML = html || "";
    return;
  }

  if (type === "wiki" && wikiEditor) {
    wikiEditor.root.innerHTML = html || "";
    return;
  }

  if (type === "job" && jobEditor) {
    jobEditor.root.innerHTML = html || "";
    return;
  }

  const fallback = qs(`${type}Content`);
  if (fallback) fallback.value = html || "";
}

function clearEditor(type) {
  if (type === "info" && infoEditor) infoEditor.setContents([]);
  if (type === "wiki" && wikiEditor) wikiEditor.setContents([]);
  if (type === "job" && jobEditor) jobEditor.setContents([]);
}

function showAdminPage(pageId) {
  document.querySelectorAll(".sidebar-link[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  document.querySelectorAll(".admin-page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });
}

