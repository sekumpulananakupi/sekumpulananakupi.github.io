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
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return json({ error: "URL gambar lowongan kosong." }, 400);
    }

    const apiKey = Deno.env.get("CONDUIT_API_KEY");
    const model = Deno.env.get("CONDUIT_VISION_MODEL") || "gpt-5";

    if (!apiKey) {
      return json({ error: "CONDUIT_API_KEY belum diset." }, 500);
    }

    const prompt = `
Kamu adalah AI parser poster lowongan kerja untuk website SA UPI.

Baca gambar/poster lowongan dari URL yang diberikan, lalu ekstrak informasinya menjadi JSON valid.

Jawab HANYA JSON.
Jangan markdown.
Jangan penjelasan.

Format wajib:
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
  "raw_text": "",
  "description_html": "",
  "quality_score": 0,
  "warning": ""
}

Aturan:
- deadline format YYYY-MM-DD. Jika tidak ada, isi "".
- type hanya salah satu: Magang, Full Time, Part Time, Freelance, Kontrak, Fresh Graduate, atau "".
- education hanya salah satu: SMA/SMK, D3, D4, S1, S2, S3, Fresh Graduate, Mahasiswa Aktif, atau "".
- salary_min dan salary_max angka rupiah tanpa titik. Jika tidak ada, null.
- jurusan isi jurusan UPI yang relevan.
- raw_text isi semua teks penting yang terbaca dari gambar.
- description_html buat rapi memakai tag <p>, <ul>, <li>, <strong>.
- quality_score 0-100.
- warning isi catatan validasi, misalnya teks tidak jelas, deadline/link tidak ada, indikasi scam, biaya pendaftaran, atau data kurang lengkap.
`;

let lastData: any = null;
let lastContent = "";

for (let attempt = 1; attempt <= 2; attempt++) {
  const response = await fetch("https://conduit.ozdoev.net/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah AI parser poster lowongan kerja. Jawab hanya JSON valid tanpa markdown, tanpa kalimat pembuka, tanpa penjelasan.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2500,
    }),
  });

  const data = await response.json();
  lastData = data;
  lastContent = data?.choices?.[0]?.message?.content || "";

  if (!response.ok) {
    return json({
      error: "Gagal memanggil Conduit Vision API.",
      status: response.status,
      detail: data,
    }, 500);
  }

  const parsed = parseJsonFromAI(lastContent);

  if (parsed) {
    return json(parsed, 200);
  }
}

return json({
  error: "Respons AI bukan JSON valid setelah retry.",
  raw: lastContent,
  conduit_response: lastData,
}, 500);
  } catch (error) {
    return json({
      error: "Terjadi error di function analyze-job-image.",
      detail: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

function parseJsonFromAI(content: string) {
  try {
    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
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