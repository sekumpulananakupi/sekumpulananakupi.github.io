/* =========================
   MENFESS ANALYZER LOGIC
   Rule-based local analyzer. Can be replaced by AI API later.
========================= */

const MENFESS_CATEGORIES = [
  "Akademik",
  "Administrasi",
  "Beasiswa",
  "MBKM",
  "Magang / Karier",
  "Organisasi",
  "Kehidupan Kampus",
  "Jurusan",
  "Fasilitas",
  "Teknologi Kampus",
  "Lainnya"
];

const MENFESS_INTENTS = [
  "Pertanyaan",
  "Keluhan",
  "Informasi",
  "Curhat",
  "Permintaan Rekomendasi",
  "Pengalaman",
  "Klarifikasi",
  "Lainnya"
];

const MENFESS_STATUSES = [
  "Belum dianalisis",
  "Sudah dianalisis",
  "Perlu FAQ",
  "FAQ dibuat",
  "Perlu Wiki",
  "Wiki dibuat",
  "Perlu Artikel",
  "Artikel dibuat",
  "Duplikat",
  "Tidak diproses",
  "Selesai"
];

const MENFESS_RECOMMENDATIONS = [
  "Buat FAQ",
  "Buat Wiki",
  "Buat Artikel",
  "Update konten lama",
  "Gabungkan dengan konten serupa",
  "Tidak perlu diproses"
];

const MENFESS_CATEGORY_RULES = [
  { category: "Akademik", subcategory: "Perkuliahan", keywords: ["krs", "nilai", "dosen", "kuliah", "kelas", "jadwal", "skripsi", "seminar", "tugas", "ujian", "uts", "uas", "ipk", "kontrak"] },
  { category: "Administrasi", subcategory: "Layanan akademik", keywords: ["tu", "administrasi", "surat", "legalisir", "transkrip", "ktm", "pembayaran", "registrasi", "siak", "cuti"] },
  { category: "Beasiswa", subcategory: "Pendanaan studi", keywords: ["beasiswa", "kip", "bidikmisi", "bantuan", "dana", "ukt", "keringanan"] },
  { category: "MBKM", subcategory: "Program merdeka belajar", keywords: ["mbkm", "kampus merdeka", "msib", "pertukaran", "studi independen", "magang merdeka"] },
  { category: "Magang / Karier", subcategory: "Karier mahasiswa", keywords: ["magang", "karier", "kerja", "lowongan", "cv", "interview", "fresh graduate", "loker"] },
  { category: "Organisasi", subcategory: "UKM dan himpunan", keywords: ["bem", "hima", "ukm", "organisasi", "kepanitiaan", "ormawa", "kegiatan"] },
  { category: "Kehidupan Kampus", subcategory: "Pengalaman mahasiswa", keywords: ["teman", "kost", "kos", "maba", "ospek", "kehidupan", "kampus", "nongkrong", "mental", "adaptasi"] },
  { category: "Jurusan", subcategory: "Program studi", keywords: ["jurusan", "prodi", "fakultas", "akreditasi", "kurikulum", "prospek", "peminatan"] },
  { category: "Fasilitas", subcategory: "Sarana kampus", keywords: ["wifi", "kelas", "perpus", "perpustakaan", "parkir", "toilet", "lab", "laboratorium", "kantin", "asrama"] },
  { category: "Teknologi Kampus", subcategory: "Sistem digital", keywords: ["spada", "sso", "email", "akun", "portal", "sistem", "login", "password", "website", "aplikasi"] }
];

const MENFESS_STOPWORDS = new Set([
  "yang", "dan", "atau", "dengan", "untuk", "dari", "pada", "ini", "itu", "aku", "saya", "admin", "min", "dong", "kak", "di", "ke", "ada", "jadi", "buat", "kalau", "karena", "gimana", "bagaimana", "apa", "ya", "nih", "sih", "banget"
]);

function splitMenfessInput(rawText) {
  return String(rawText || "")
    .split(/\n\s*\n|---+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeMenfessText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s/+-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createMenfessId() {
  return `mnf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractMenfessKeywords(rawContent, limit = 8) {
  const words = normalizeMenfessText(rawContent)
    .split(/\s+/)
    .filter(word => word.length > 2 && !MENFESS_STOPWORDS.has(word));

  const scores = new Map();
  words.forEach(word => scores.set(word, (scores.get(word) || 0) + 1));

  MENFESS_CATEGORY_RULES.forEach(rule => {
    rule.keywords.forEach(keyword => {
      const normalized = normalizeMenfessText(keyword);
      if (normalized && normalizeMenfessText(rawContent).includes(normalized)) {
        scores.set(keyword, (scores.get(keyword) || 0) + 3);
      }
    });
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function detectMenfessCategory(rawContent) {
  const normalized = normalizeMenfessText(rawContent);
  const scored = MENFESS_CATEGORY_RULES.map(rule => {
    const score = rule.keywords.reduce((total, keyword) => {
      return normalized.includes(normalizeMenfessText(keyword)) ? total + 1 : total;
    }, 0);

    return { ...rule, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score === 0) {
    return { mainCategory: "Lainnya", subcategory: "Umum" };
  }

  return { mainCategory: top.category, subcategory: top.subcategory };
}

function detectMenfessIntent(rawContent) {
  const text = normalizeMenfessText(rawContent);

  if (/\?|gimana|bagaimana|apa|kapan|dimana|berapa|boleh|adakah|bisa/.test(text)) return "Pertanyaan";
  if (/kecewa|buruk|parah|tolong|ngeluh|komplain|masalah|error|susah|lama|ribet/.test(text)) return "Keluhan";
  if (/info|informasi|pengumuman|jadwal|dibuka|ditutup|deadline/.test(text)) return "Informasi";
  if (/curhat|sedih|capek|takut|bingung|overthinking|stress|stres|cemas/.test(text)) return "Curhat";
  if (/rekomendasi|saran|pilih|mending|bagusnya|baiknya/.test(text)) return "Permintaan Rekomendasi";
  if (/pengalaman|dulu|pernah|waktu|cerita/.test(text)) return "Pengalaman";
  if (/klarifikasi|benar|bener|hoax|valid|konfirmasi|pastikan/.test(text)) return "Klarifikasi";

  return "Lainnya";
}

function detectMenfessSentiment(rawContent) {
  const text = normalizeMenfessText(rawContent);
  const negative = ["kecewa", "buruk", "parah", "sedih", "capek", "susah", "ribet", "error", "takut", "cemas", "stress", "stres", "marah"];
  const positive = ["bagus", "senang", "terima kasih", "makasih", "membantu", "keren", "mantap", "nyaman"];
  const negativeScore = negative.filter(word => text.includes(word)).length;
  const positiveScore = positive.filter(word => text.includes(word)).length;

  if (negativeScore > positiveScore) return "Negatif";
  if (positiveScore > negativeScore) return "Positif";
  return "Netral";
}

function detectMenfessUrgency(rawContent, sentiment, intent) {
  const text = normalizeMenfessText(rawContent);
  if (/deadline|hari ini|besok|segera|urgent|darurat|ditutup|gagal login|tidak bisa login/.test(text)) return "Tinggi";
  if (sentiment === "Negatif" || intent === "Keluhan" || /bingung|tolong|masalah/.test(text)) return "Sedang";
  return "Rendah";
}

function createMenfessSummary(rawContent) {
  const clean = String(rawContent || "").replace(/\s+/g, " ").trim();
  if (clean.length <= 150) return clean;
  return `${clean.slice(0, 147).trim()}...`;
}

function recommendMenfessContent(intent, category, urgency, keywords) {
  if (category === "Lainnya" && intent === "Curhat") return "Tidak perlu diproses";
  if (urgency === "Tinggi") return "Buat FAQ";
  if (intent === "Pertanyaan" || intent === "Klarifikasi") return "Buat FAQ";
  if (["Akademik", "Administrasi", "Beasiswa", "MBKM", "Jurusan", "Teknologi Kampus"].includes(category)) return "Buat Wiki";
  if (intent === "Pengalaman" || keywords.length >= 6) return "Buat Artikel";
  if (intent === "Keluhan") return "Update konten lama";
  return "Gabungkan dengan konten serupa";
}

function statusFromRecommendation(recommendation) {
  const map = {
    "Buat FAQ": "Perlu FAQ",
    "Buat Wiki": "Perlu Wiki",
    "Buat Artikel": "Perlu Artikel",
    "Tidak perlu diproses": "Tidak diproses"
  };

  return map[recommendation] || "Sudah dianalisis";
}

function calculateMenfessSimilarity(a, b) {
  const aKeywords = new Set(a.keywords || []);
  const bKeywords = new Set(b.keywords || []);
  const shared = [...aKeywords].filter(keyword => bKeywords.has(keyword)).length;
  const keywordScore = shared / Math.max(aKeywords.size, bKeywords.size, 1);
  const categoryScore = a.mainCategory === b.mainCategory ? 0.25 : 0;
  const aText = normalizeMenfessText(a.rawContent).split(/\s+/).slice(0, 45).join(" ");
  const bText = normalizeMenfessText(b.rawContent).split(/\s+/).slice(0, 45).join(" ");
  const contentScore = aText && bText && (aText.includes(bText.slice(0, 32)) || bText.includes(aText.slice(0, 32))) ? 0.25 : 0;

  return keywordScore + categoryScore + contentScore;
}

function findMenfessDuplicates(candidate, existingRecords) {
  return (existingRecords || [])
    .map(item => ({ id: item.id, summary: item.summary, score: calculateMenfessSimilarity(candidate, item) }))
    .filter(item => item.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function analyzeSingleMenfess(rawContent, existingRecords = []) {
  const now = new Date().toISOString();
  const category = detectMenfessCategory(rawContent);
  const intent = detectMenfessIntent(rawContent);
  const sentiment = detectMenfessSentiment(rawContent);
  const keywords = extractMenfessKeywords(rawContent);
  const urgency = detectMenfessUrgency(rawContent, sentiment, intent);
  const recommendation = recommendMenfessContent(intent, category.mainCategory, urgency, keywords);

  const record = {
    id: createMenfessId(),
    rawContent: rawContent.trim(),
    summary: createMenfessSummary(rawContent),
    mainCategory: category.mainCategory,
    subcategory: category.subcategory,
    intent,
    sentiment,
    keywords,
    urgencyLevel: urgency,
    contentRecommendation: recommendation,
    processingStatus: statusFromRecommendation(recommendation),
    possibleDuplicates: [],
    createdDate: now,
    updatedDate: now
  };

  record.possibleDuplicates = findMenfessDuplicates(record, existingRecords);
  if (record.possibleDuplicates.length && record.contentRecommendation !== "Tidak perlu diproses") {
    record.contentRecommendation = "Gabungkan dengan konten serupa";
  }

  return record;
}

function analyzeMenfessBatch(rawText, existingRecords = []) {
  const chunks = splitMenfessInput(rawText);
  const analyzed = [];

  chunks.forEach(chunk => {
    const record = analyzeSingleMenfess(chunk, [...analyzed, ...existingRecords]);
    analyzed.push(record);
  });

  return analyzed;
}

function normalizeMenfessAIResponse(data) {
  const result = data?.result || data || {};
  return result && typeof result === "object" ? result : {};
}

function createMenfessRecordFromAI(rawContent, result, existingRecords = []) {
  const now = new Date().toISOString();
  const fallback = analyzeSingleMenfess(rawContent, existingRecords);
  const recommendation = result.contentRecommendation || fallback.contentRecommendation;
  const possibleDuplicates = Array.isArray(result.possibleDuplicates) && result.possibleDuplicates.length
    ? result.possibleDuplicates
    : fallback.possibleDuplicates;

  return {
    id: createMenfessId(),
    rawContent: rawContent.trim(),
    summary: result.summary || fallback.summary,
    mainCategory: result.mainCategory || fallback.mainCategory,
    subcategory: result.subcategory || fallback.subcategory,
    intent: result.intent || fallback.intent,
    sentiment: result.sentiment || fallback.sentiment,
    keywords: Array.isArray(result.keywords) && result.keywords.length ? result.keywords : fallback.keywords,
    urgencyLevel: result.urgencyLevel || fallback.urgencyLevel,
    contentRecommendation: recommendation,
    processingStatus: result.processingStatus || statusFromRecommendation(recommendation),
    possibleDuplicates,
    aiResult: result,
    createdDate: now,
    updatedDate: now
  };
}

async function analyzeSingleMenfessWithAI(rawContent, existingRecords = []) {
  const client = typeof getMenfessSupabaseClient === "function" ? getMenfessSupabaseClient() : null;

  if (!client?.functions?.invoke) {
    console.warn("Supabase client/function tidak tersedia, fallback ke analyzer lokal.");
    return analyzeSingleMenfess(rawContent, existingRecords);
  }

  try {
    const { data, error } = await client.functions.invoke("analyze-menfess", {
      body: {
        rawContent,
        existingRecords: existingRecords.slice(0, 30).map(item => ({
          id: item.id,
          summary: item.summary,
          mainCategory: item.mainCategory,
          subcategory: item.subcategory,
          intent: item.intent,
          keywords: item.keywords
        }))
      }
    });

    if (error) {
      console.warn("AI gagal, fallback ke analyzer lokal:", error);
      return analyzeSingleMenfess(rawContent, existingRecords);
    }

    const result = normalizeMenfessAIResponse(data);
    if (!Object.keys(result).length) {
      console.warn("Respons AI kosong/tidak sesuai, fallback ke analyzer lokal:", data);
      return analyzeSingleMenfess(rawContent, existingRecords);
    }

    return createMenfessRecordFromAI(rawContent, result, existingRecords);
  } catch (error) {
    console.warn("Function analyze-menfess error, fallback ke analyzer lokal:", error);
    return analyzeSingleMenfess(rawContent, existingRecords);
  }
}

async function analyzeMenfessBatchWithAI(rawText, existingRecords = []) {
  const chunks = splitMenfessInput(rawText);
  const analyzed = [];

  for (const chunk of chunks) {
    const record = await analyzeSingleMenfessWithAI(chunk, [
      ...analyzed,
      ...existingRecords
    ]);

    if (!record.possibleDuplicates?.length) {
      record.possibleDuplicates = findMenfessDuplicates(record, [
        ...analyzed,
        ...existingRecords
      ]);
    }

    if (record.possibleDuplicates?.length && record.contentRecommendation !== "Tidak perlu diproses") {
      record.contentRecommendation = "Gabungkan dengan konten serupa";
      if (!record.processingStatus || record.processingStatus === "Sudah dianalisis") {
        record.processingStatus = "Duplikat";
      }
    }

    analyzed.push(record);
  }

  return analyzed;
}