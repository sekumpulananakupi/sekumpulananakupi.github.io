const SAUPI_SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SAUPI_SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const SAUPI_GUEST_MIGRATION_KEY = "saupi_guest_migration_v1";

const saupiUserClient = window.supabase
  ? window.supabase.createClient(SAUPI_SUPABASE_URL, SAUPI_SUPABASE_ANON_KEY)
  : null;

async function signUpSaupiUser({ fullName, audience, nim, major, faculty, graduationYear, email, password }) {
  if (!saupiUserClient) throw new Error("Layanan akun belum tersedia.");
  const { data, error } = await saupiUserClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.href,
      data: { full_name: fullName, audience, nim, major, faculty, graduation_year: graduationYear }
    }
  });
  if (error) throw error;
  return data;
}

async function signInSaupiUser(email, password) {
  if (!saupiUserClient) throw new Error("Layanan akun belum tersedia.");
  const { data, error } = await saupiUserClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signInWithGoogle() {
  if (!saupiUserClient) throw new Error("Layanan akun belum tersedia.");
  const { error } = await saupiUserClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href }
  });
  if (error) throw error;
}

async function getCurrentSaupiUser() {
  if (!saupiUserClient) return null;
  const { data, error } = await saupiUserClient.auth.getSession();
  if (error) throw error;
  return data.session?.user || null;
}

async function syncGuestMajorJourney() {
  const user = await getCurrentSaupiUser();
  if (!user || !window.readMajorJourney || localStorage.getItem(SAUPI_GUEST_MIGRATION_KEY) === user.id) return;
  const journey = window.readMajorJourney();
  const saved = Array.isArray(journey.saved) ? journey.saved : [];
  if (saved.length) {
    const rows = saved.map(item => ({ user_id: user.id, entity_type: "jurusan", entity_id: String(item.id), metadata: { name: item.name || "", faculty: item.faculty || "", saved_at: item.savedAt || null } }));
    const { error } = await saupiUserClient.from("saved_items").upsert(rows, { onConflict: "user_id,entity_type,entity_id" });
    if (error) throw error;
  }
  localStorage.setItem(SAUPI_GUEST_MIGRATION_KEY, user.id);
}

async function saveMajorForCurrentUser(major) {
  const user = await getCurrentSaupiUser();
  if (!user) return false;
  const { error } = await saupiUserClient.from("saved_items").upsert({ user_id: user.id, entity_type: "jurusan", entity_id: String(major.id), metadata: { name: major.name || "", faculty: major.faculty || "" } }, { onConflict: "user_id,entity_type,entity_id" });
  if (error) throw error;
  return true;
}

async function signOutSaupiUser() {
  if (!saupiUserClient) return;
  const { error } = await saupiUserClient.auth.signOut();
  if (error) throw error;
}
