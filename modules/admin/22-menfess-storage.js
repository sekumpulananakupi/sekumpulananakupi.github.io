/* =========================
   MENFESS ANALYZER STORAGE
   Supabase adapter with safe local fallback
========================= */

let menfessAnalyzerData = [];
const MENFESS_LOCAL_FALLBACK_KEY = "saupi-menfess-analyzer-fallback-v1";

function getMenfessSupabaseClient() {
  if (typeof supabaseClient !== "undefined" && supabaseClient) return supabaseClient;
  if (typeof window !== "undefined" && window.supabaseClient) return window.supabaseClient;
  if (typeof globalThis !== "undefined" && globalThis.supabaseClient) return globalThis.supabaseClient;
  return null;
}

function mapMenfessFromDb(row = {}) {
  return {
    id: row.id,
    rawContent: row.raw_content || "",
    summary: row.summary || "",
    mainCategory: row.main_category || "Lainnya",
    subcategory: row.subcategory || "Umum",
    intent: row.intent || "Lainnya",
    sentiment: row.sentiment || "Netral",
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    urgencyLevel: row.urgency_level || "Rendah",
    contentRecommendation: row.content_recommendation || "Gabungkan dengan konten serupa",
    processingStatus: row.processing_status || "Sudah dianalisis",
    possibleDuplicates: Array.isArray(row.possible_duplicates) ? row.possible_duplicates : [],
    aiResult: row.ai_result || {},
    createdDate: row.created_at,
    updatedDate: row.updated_at
  };
}

function mapMenfessToDb(record = {}) {
  const row = {
    id: record.id,
    raw_content: record.rawContent,
    summary: record.summary,
    main_category: record.mainCategory,
    subcategory: record.subcategory,
    intent: record.intent,
    sentiment: record.sentiment,
    keywords: Array.isArray(record.keywords) ? record.keywords : [],
    urgency_level: record.urgencyLevel,
    content_recommendation: record.contentRecommendation,
    processing_status: record.processingStatus,
    possible_duplicates: Array.isArray(record.possibleDuplicates) ? record.possibleDuplicates : [],
    ai_result: record.aiResult || {},
    created_at: record.createdDate,
    updated_at: record.updatedDate || new Date().toISOString()
  };

  Object.keys(row).forEach(key => {
    if (row[key] === undefined) delete row[key];
  });

  return row;
}

function mapMenfessPatchToDb(patch = {}) {
  const row = {};
  const fieldMap = {
    rawContent: "raw_content",
    summary: "summary",
    mainCategory: "main_category",
    subcategory: "subcategory",
    intent: "intent",
    sentiment: "sentiment",
    keywords: "keywords",
    urgencyLevel: "urgency_level",
    contentRecommendation: "content_recommendation",
    processingStatus: "processing_status",
    possibleDuplicates: "possible_duplicates",
    aiResult: "ai_result"
  };

  Object.entries(fieldMap).forEach(([from, to]) => {
    if (patch[from] !== undefined) row[to] = patch[from];
  });

  row.updated_at = new Date().toISOString();
  return row;
}

function loadMenfessFallback() {
  try {
    const raw = localStorage.getItem(MENFESS_LOCAL_FALLBACK_KEY);
    menfessAnalyzerData = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Gagal memuat fallback Menfess Analyzer:", error);
    menfessAnalyzerData = [];
  }
  return menfessAnalyzerData;
}

function saveMenfessFallback(records) {
  menfessAnalyzerData = Array.isArray(records) ? records : [];
  localStorage.setItem(MENFESS_LOCAL_FALLBACK_KEY, JSON.stringify(menfessAnalyzerData));
  return menfessAnalyzerData;
}

const MenfessStorage = {
  async load() {
    const client = getMenfessSupabaseClient();
    if (!client) return loadMenfessFallback();

    const { data, error } = await client
      .from("menfess_analyzer")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat Menfess Analyzer dari Supabase:", error);
      return loadMenfessFallback();
    }

    menfessAnalyzerData = (data || []).map(mapMenfessFromDb);
    return menfessAnalyzerData;
  },

  async save(records) {
    const client = getMenfessSupabaseClient();
    if (!client) return saveMenfessFallback(records);

    const rows = Array.isArray(records) ? records.map(mapMenfessToDb) : [];
    if (!rows.length) return [];

    const { data, error } = await client
      .from("menfess_analyzer")
      .upsert(rows, { onConflict: "id" })
      .select("*");

    if (error) {
      console.error("Gagal menyimpan Menfess Analyzer ke Supabase:", error);
      throw error;
    }

    menfessAnalyzerData = (data || []).map(mapMenfessFromDb);
    return menfessAnalyzerData;
  },

  async addMany(records) {
    const incoming = Array.isArray(records) ? records : [];
    const client = getMenfessSupabaseClient();

    if (!client) {
      const current = loadMenfessFallback();
      return saveMenfessFallback([...incoming, ...current]);
    }

    const rows = incoming.map(mapMenfessToDb);
    if (!rows.length) return menfessAnalyzerData;

    const { error } = await client
      .from("menfess_analyzer")
      .insert(rows);

    if (error) {
      console.error("Gagal menambahkan menfess ke Supabase:", error);
      throw error;
    }

    await this.load();
    return menfessAnalyzerData;
  },

  async update(id, patch) {
    const client = getMenfessSupabaseClient();

    if (!client) {
      const current = loadMenfessFallback();
      menfessAnalyzerData = current.map(item => item.id === id ? { ...item, ...patch, updatedDate: new Date().toISOString() } : item);
      saveMenfessFallback(menfessAnalyzerData);
      return menfessAnalyzerData.find(item => item.id === id) || null;
    }

    const dbPatch = mapMenfessPatchToDb(patch);

    const { data, error } = await client
      .from("menfess_analyzer")
      .update(dbPatch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Gagal update menfess di Supabase:", error);
      throw error;
    }

    await this.load();
    return mapMenfessFromDb(data);
  },

  async remove(id) {
    const client = getMenfessSupabaseClient();

    if (!client) {
      const current = loadMenfessFallback();
      return saveMenfessFallback(current.filter(item => item.id !== id));
    }

    const { error } = await client
      .from("menfess_analyzer")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Gagal hapus menfess dari Supabase:", error);
      throw error;
    }

    await this.load();
    return menfessAnalyzerData;
  },

  async clear() {
    const client = getMenfessSupabaseClient();

    if (!client) return saveMenfessFallback([]);

    const { error } = await client
      .from("menfess_analyzer")
      .delete()
      .neq("id", "");

    if (error) {
      console.error("Gagal clear menfess dari Supabase:", error);
      throw error;
    }

    menfessAnalyzerData = [];
    return menfessAnalyzerData;
  }
};
