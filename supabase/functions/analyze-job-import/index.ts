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
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return json({ error: "Teks lowongan kosong." }, 400);
    }

    const apiKey = Deno.env.get("CC_API_KEY");

    if (!apiKey) {
      return json({ error: "CC_API_KEY belum diset." }, 500);
    }

    const prompt = `
Ekstrak lowongan kerja berikut menjadi JSON valid.
Jawab HANYA JSON, tanpa markdown.

Format:
{
  "title": "",
  "company": "",
  "location": "",
  "link": "",
  "deadline": "",
  "type": "",
  "education": "",
  "salary_min": null,
  "salary_max": null,
  "salary_note": "",
  "jurusan": [],
  "tags": [],
  "description_html": "",
  "quality_score": 0,
  "warning": ""
}

Aturan:
- deadline format YYYY-MM-DD, kalau tidak ada isi "".
- type: Magang, Full Time, Part Time, Freelance, Kontrak, Fresh Graduate, atau "".
- education: SMA/SMK, D3, D4, S1, S2, S3, Fresh Graduate, Mahasiswa Aktif, atau "".
- salary_min dan salary_max angka rupiah tanpa titik, kalau tidak ada null.
- description_html pakai <p>, <ul>, <li>, <strong>. Tuliskan kualifikasi kerja dan dokumen yang harus dikirimkan.

Teks:
${text}
`;

    const response = await fetch("https://api.codecrafters.id/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash:free",
        max_tokens: 160000,
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

    return json(parsed, 200);
  } catch (error) {
    return json({
      error: "Terjadi error di function.",
      detail: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}