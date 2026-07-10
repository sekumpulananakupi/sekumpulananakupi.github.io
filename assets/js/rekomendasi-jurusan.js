const RECOMMENDATION_SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const RECOMMENDATION_SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const recommendationClient = window.supabase
  ? window.supabase.createClient(RECOMMENDATION_SUPABASE_URL, RECOMMENDATION_SUPABASE_ANON_KEY)
  : null;

function escapeRecommendationHTML(value) {
  const entities = {
    "&": String.fromCharCode(38) + "amp;",
    "<": String.fromCharCode(38) + "lt;",
    ">": String.fromCharCode(38) + "gt;",
    "\"": String.fromCharCode(38) + "quot;",
    "'": String.fromCharCode(38) + "#039;"
  };
  return String(value || "").replace(/[&<>"']/g, (character) => entities[character]);
}

function parsePreferenceWords(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function setRecommendationStatus(message, isError = false) {
  const status = document.getElementById("recommendationStatus");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("is-error", isError);
}

function getMatches(item, words) {
  const fields = [
    ["nama jurusan", item.nama],
    ["fakultas/kampus", item.fakultas],
    ["deskripsi", item.deskripsi],
    ["prospek kerja", item.prospek_kerja]
  ];
  const matches = [];
  words.forEach((word) => {
    const matchedFields = fields
      .filter(([, value]) => String(value || "").toLowerCase().includes(word))
      .map(([label]) => label);
    if (matchedFields.length) matches.push({ word, matchedFields });
  });
  return matches;
}

function scoreMajor(item, preferences) {
  const interestMatches = getMatches(item, preferences.interests);
  const subjectMatches = getMatches(item, preferences.preferredSubjects);
  const careerMatches = getMatches(item, preferences.careerGoals);
  const facultyMatches = getMatches(item, preferences.facultyPreferences);
  const score = interestMatches.length * 3 + subjectMatches.length * 2 + careerMatches.length * 3 + facultyMatches.length * 2;
  return { item, score, interestMatches, subjectMatches, careerMatches, facultyMatches };
}

function renderExplanation(label, matches) {
  if (!matches.length) return "";
  const words = matches.map((match) => `<strong>${escapeRecommendationHTML(match.word)}</strong> (${escapeRecommendationHTML(match.matchedFields.join(", "))})`);
  return `<li><span>${escapeRecommendationHTML(label)}</span>${words.join(", ")}</li>`;
}

function renderRecommendations(items) {
  const list = document.getElementById("recommendationList");
  const title = document.getElementById("resultsTitle");
  if (!list || !title) return;
  if (!items.length) {
    title.textContent = "Belum ada kecocokan teks yang jelas";
    list.innerHTML = '<div class="recommendation-empty"><i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i><p>Coba gunakan kata yang lebih umum, atau jelajahi seluruh direktori jurusan.</p></div>';
    return;
  }
  title.textContent = `${items.length} jurusan untuk dieksplorasi`;
  list.innerHTML = items.map(({ item, score, interestMatches, subjectMatches, careerMatches, facultyMatches }) => `
    <article class="recommendation-card">
      <div class="recommendation-card-head"><div><p class="eyebrow">Skor kecocokan teks: ${score}</p><h3>${escapeRecommendationHTML(item.nama)}</h3><p>${escapeRecommendationHTML([item.fakultas, item.jenjang, item.akreditasi].filter(Boolean).join(" · ") || "Profil dasar tersedia")}</p></div><a class="btn ghost" href="jurusan-detail.html?id=${encodeURIComponent(item.id)}">Lihat profil</a></div>
      <p>${escapeRecommendationHTML(item.deskripsi || "Deskripsi belum tersedia.")}</p>
      <div class="recommendation-explanation"><strong>Alasan muncul</strong><ul>${renderExplanation("Minat", interestMatches)}${renderExplanation("Mata pelajaran/kekuatan", subjectMatches)}${renderExplanation("Arah karier", careerMatches)}${renderExplanation("Fakultas/kampus", facultyMatches)}</ul></div>
    </article>
  `).join("");
}

async function persistPreferences(preferences) {
  if (typeof getCurrentSaupiUser !== "function" || !recommendationClient) return;
  const user = await getCurrentSaupiUser();
  if (!user) return;
  const { error } = await recommendationClient.from("user_preferences").upsert({
    user_id: user.id,
    interests: preferences.interests,
    preferred_subjects: preferences.preferredSubjects,
    career_goals: preferences.careerGoals,
    campus_locations: preferences.facultyPreferences,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw error;
}

async function loadRecommendations(preferences) {
  const { data, error } = await recommendationClient
    .from("jurusan")
    .select("id,nama,fakultas,jenjang,akreditasi,deskripsi,prospek_kerja")
    .order("nama");
  if (error) throw error;
  const words = [...preferences.interests, ...preferences.preferredSubjects, ...preferences.careerGoals, ...preferences.facultyPreferences];
  return (data || [])
    .map((item) => scoreMajor(item, preferences))
    .filter((result) => result.score > 0 && words.length)
    .sort((a, b) => b.score - a.score || a.item.nama.localeCompare(b.item.nama, "id"))
    .slice(0, 8);
}

function initialiseRecommendationPage() {
  const form = document.getElementById("recommendationForm");
  if (!form || !recommendationClient) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const preferences = {
      interests: parsePreferenceWords(form.elements.interests.value),
      preferredSubjects: parsePreferenceWords(form.elements.preferred_subjects.value),
      careerGoals: parsePreferenceWords(form.elements.career_goals.value),
      facultyPreferences: parsePreferenceWords(form.elements.campus_locations.value)
    };
    if (!Object.values(preferences).some((items) => items.length)) {
      setRecommendationStatus("Tambahkan setidaknya satu minat, kekuatan, tujuan karier, atau fakultas/kampus.", true);
      return;
    }
    setRecommendationStatus("Menilai kecocokan dari data jurusan yang tersedia...");
    try {
      const results = await loadRecommendations(preferences);
      renderRecommendations(results);
      try {
        await persistPreferences(preferences);
        setRecommendationStatus("Rekomendasi diperbarui. Preferensi tersimpan di akunmu.");
      } catch (saveError) {
        setRecommendationStatus("Rekomendasi diperbarui. Masuk untuk menyimpan preferensi di akunmu.");
      }
    } catch (error) {
      console.error("Gagal memuat rekomendasi:", error);
      setRecommendationStatus("Rekomendasi belum dapat dimuat. Coba lagi beberapa saat lagi.", true);
    }
  });
}

document.addEventListener("DOMContentLoaded", initialiseRecommendationPage);
