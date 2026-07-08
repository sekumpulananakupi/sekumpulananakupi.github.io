/* =========================
   MENFESS DRAFT GENERATOR
   Template/local draft generator; ready for AI API replacement.
========================= */

function escapeMenfessDraftText(value) {
  return String(value || "").replace(/[<>]/g, "");
}

function createMenfessDraftFAQ(record) {
  const topic = escapeMenfessDraftText(record.summary || record.rawContent);
  const keywords = (record.keywords || []).join(", ") || "kata kunci belum tersedia";

  return `Pertanyaan:\n${topic}\n\nJawaban draft:\nPertanyaan ini berkaitan dengan ${record.mainCategory} (${record.subcategory}). Berdasarkan menfess yang masuk, admin dapat menjawab dengan panduan singkat, tautan resmi UPI/SA-UPI bila tersedia, dan langkah praktis yang bisa dilakukan mahasiswa.\n\nKata kunci: ${keywords}\n\nCatatan admin:\n- Verifikasi informasi sebelum dipublikasikan.\n- Jangan menyertakan isi menfess mentah atau identitas pengirim.`;
}

function createMenfessDraftWiki(record) {
  const title = `${record.mainCategory}: ${record.subcategory}`;
  const keywords = (record.keywords || []).map(keyword => `- ${keyword}`).join("\n") || "- Tambahkan kata kunci relevan";

  return `# ${title}\n\n## Ringkasan\n${escapeMenfessDraftText(record.summary)}\n\n## Latar Belakang\nTopik ini sering muncul dari arsip menfess internal dan perlu diubah menjadi panduan yang aman untuk publik.\n\n## Panduan Utama\n1. Jelaskan konteks ${record.mainCategory.toLowerCase()} secara ringkas.\n2. Tambahkan langkah yang bisa dilakukan mahasiswa.\n3. Sertakan sumber resmi jika ada.\n\n## Kata Kunci\n${keywords}\n\n## Catatan Kurasi\nKonten ini adalah draft dari Menfess Analyzer. Admin wajib mengecek fakta, bahasa, dan kelayakan publikasi.`;
}

function createMenfessDraftArticle(record) {
  const title = `Panduan Mahasiswa: ${record.mainCategory}`;
  const keywords = (record.keywords || []).join(", ") || "kampus, mahasiswa, UPI";

  return `Judul draft:\n${title}\n\nLead:\nBanyak mahasiswa membahas topik ${record.mainCategory.toLowerCase()} dalam kanal menfess. Artikel ini merangkum isu tersebut menjadi panduan publik yang aman dan bermanfaat.\n\nStruktur artikel:\n1. Pembuka: jelaskan masalah umum tanpa mengutip menfess mentah.\n2. Konteks: kaitkan dengan ${record.subcategory}.\n3. Solusi: berikan langkah praktis dan sumber resmi.\n4. Penutup: arahkan pembaca ke FAQ/Wiki terkait.\n\nKata kunci SEO/internal: ${keywords}\n\nCatatan admin:\nPastikan artikel tidak mengandung data personal, tuduhan spesifik, atau raw menfess.`;
}

function generateMenfessDraft(record, type) {
  if (!record) return "Record menfess tidak ditemukan.";

  if (record.aiResult) {
    if (type === "faq" && record.aiResult.draftFaq) return record.aiResult.draftFaq;
    if (type === "wiki" && record.aiResult.draftWiki) return record.aiResult.draftWiki;
    if (type === "artikel" && record.aiResult.draftArticle) return record.aiResult.draftArticle;
  }

  if (type === "faq") return createMenfessDraftFAQ(record);
  if (type === "wiki") return createMenfessDraftWiki(record);
  if (type === "artikel") return createMenfessDraftArticle(record);

  return "Pilih tipe draft: FAQ, Wiki, atau Artikel.";
}