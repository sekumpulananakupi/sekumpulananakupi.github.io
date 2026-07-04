const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      mode = "generate",
      topic,
      angle,
      options = {},
      current_title = "",
      current_html = "",
      selected_html = "",
      kategori = [],
      tags = []
    } = await req.json();

    const apiKey = Deno.env.get("CC_API_KEY");

    if (!apiKey) {
      return json({ error: "CC_API_KEY belum diset." }, 500);
    }

    if (mode === "generate" && (!topic || typeof topic !== "string")) {
      return json({ error: "Topik wiki kosong." }, 400);
    }

    if (mode !== "generate" && (!current_html || typeof current_html !== "string")) {
      return json({ error: "Konten wiki kosong." }, 400);
    }

    const modeInstruction = getModeInstruction(mode);

    const prompt = `
Kamu adalah AI Wiki Assistant untuk website SA UPI.

Tugas:
${modeInstruction}

Jawab HANYA JSON valid, tanpa markdown.

Format:
{
  "judul": "",
  "kategori_saran": [],
  "tag_saran": [],
  "ringkasan": "",
  "isi_html": "",
  "seo_title": "",
  "seo_description": "",
  "quality_score": 0,
  "warning": ""
}

Aturan umum:
- Bahasa Indonesia.
- Gaya ramah, jelas, dan cocok untuk mahasiswa UPI.
- Jangan mengarang informasi sensitif seperti tanggal resmi, biaya resmi, atau aturan kampus jika tidak diberikan.
- Jika informasi resmi tidak tersedia di teks, tulis secara umum dan beri catatan agar pembaca cek sumber resmi.
- isi_html hanya boleh memakai tag: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
- Jangan pakai markdown.
- Jangan pakai tag <html>, <body>, <script>, <style>, iframe, atau atribut event.
- quality_score 0-100.
- warning isi "" kalau aman.
- kategori_saran maksimal 3.
- tag_saran maksimal 8.

Preferensi:
- SEO friendly: ${Boolean(options.seo)}
- Untuk mahasiswa baru: ${Boolean(options.maba)}
- Tambahkan FAQ: ${Boolean(options.faq)}
- Tambahkan tips: ${Boolean(options.tips)}
- Buat langkah praktis: ${Boolean(options.steps)}

Data dari admin:
- Topik: ${topic || "-"}
- Arahan tambahan: ${angle || "-"}
- Judul saat ini: ${current_title || "-"}
- Kategori terpilih: ${Array.isArray(kategori) ? kategori.join(", ") : "-"}
- Tag terpilih: ${Array.isArray(tags) ? tags.join(", ") : "-"}

Konten saat ini:
${current_html || "-"}

Bagian yang dipilih admin:
${selected_html || "-"}
`;

    const response = await fetch("https://api.codecrafters.id/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return json({
        error: "Gagal memanggil CloudCrafters API.",
        status: response.status,
        detail: data,
      }, 500);
    }

    const content = data?.content?.[0]?.text || "";

    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return json({
        error: "Respons AI bukan JSON valid.",
        raw: content,
        cloudcrafters_response: data,
      }, 500);
    }

    parsed.isi_html = sanitizeHTML(parsed.isi_html || "");

    return json(parsed, 200);
  } catch (error) {
    return json({
      error: "Terjadi error di function.",
      detail: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

function getModeInstruction(mode: string) {
  const instructions: Record<string, string> = {
    generate: `
Buat artikel wiki baru dari topik yang diberikan.
Artikel harus punya pembuka, penjelasan utama, langkah praktis, tips, dan penutup.
`,

    improve: `
Perbaiki artikel yang sudah ada.
Rapikan struktur, perjelas kalimat, hilangkan pengulangan, dan buat lebih enak dibaca.
Jangan mengubah makna utama.
`,

    shorten: `
Persingkat artikel yang sudah ada.
Pertahankan poin penting, buang kalimat berulang, dan buat lebih padat.
`,

    expand: `
Perpanjang artikel yang sudah ada.
Tambahkan penjelasan, contoh, tips, dan bagian yang relevan tanpa mengarang data resmi.
`,

    formal: `
Ubah artikel menjadi lebih formal dan rapi.
Cocok untuk artikel informasi kampus, tetapi tetap mudah dipahami.
`,

    casual: `
Ubah artikel menjadi lebih santai, hangat, dan dekat dengan mahasiswa baru.
Tetap sopan dan informatif.
`,

    faq: `
Tambahkan bagian FAQ di akhir artikel.
Pertahankan isi sebelumnya, lalu tambahkan pertanyaan dan jawaban yang relevan.
`,

continue: `
Lanjutkan artikel dari konten yang sudah ada.
Jangan mengulang bagian sebelumnya.
Tambahkan 2-4 bagian baru yang relevan.
Pertahankan gaya bahasa dan struktur HTML.
`,

factcheck: `
Periksa artikel yang sudah ada.
Tandai klaim yang perlu dicek ulang, terutama tanggal, biaya, aturan kampus, link resmi, dan istilah akademik.
Jangan menghapus artikel.
Tambahkan bagian baru berjudul "Catatan Pemeriksaan Fakta" di akhir artikel.
Gunakan status:
- Aman
- Perlu cek ulang
- Berisiko jika tidak diverifikasi
`,

"selection-improve": `
Perbaiki hanya bagian teks yang dipilih admin.
Jika selected_html tersedia, fokus pada bagian tersebut.
Buat versi yang lebih jelas, rapi, dan enak dibaca.
`,

thumbnail: `
Buat konsep thumbnail artikel.
Jangan membuat gambar.
Isi isi_html dengan rekomendasi konsep visual, teks thumbnail, warna, ikon, dan layout.
`
  };

  return instructions[mode] || instructions.generate;
}

function sanitizeHTML(html: string) {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .trim();
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}