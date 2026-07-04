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
    const { message } = await req.json();

    if (!message) {
      return json({ error: "Pesan kosong." }, 400);
    }

    const apiKey = Deno.env.get("CONDUIT_API_KEY");
    const model = Deno.env.get("CONDUIT_MODEL") || "gpt-4.1-mini";

    if (!apiKey) {
      return json({ error: "CONDUIT_API_KEY belum diset." }, 500);
    }

    const response = await fetch("https://conduit.ozdoev.net/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
  {
  role: "system",
  content: `
Kamu adalah Asisten AI SA UPI.

UPI selalu berarti Universitas Pendidikan Indonesia.

Jawab dengan format Markdown yang rapi:
- Gunakan judul pendek.
- Gunakan paragraf singkat.
- Gunakan bullet list jika perlu.
- Jangan membuat paragraf terlalu panjang.
- Jangan pakai tabel kecuali benar-benar perlu.
- Jawab ramah, jelas, dan mudah dibaca siswa SMA.
`
},
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();

    return json(data);
  } catch (err) {
    return json({ error: String(err) }, 500);
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