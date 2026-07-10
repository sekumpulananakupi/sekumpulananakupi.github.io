function getAccountElement(id) { return document.getElementById(id); }
function setAccountStatus(message, isError = false) { const status = getAccountElement("accountStatus"); if (!status) return; status.textContent = message || ""; status.classList.toggle("is-error", isError); }
function setAccountLoading(button, loading, label) { if (!button) return; button.disabled = loading; button.innerHTML = loading ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Memproses...' : label; }

async function getSavedMajorCount(userId) { const { count, error } = await saupiUserClient.from("saved_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("entity_type", "jurusan"); if (error) throw error; return count || 0; }
async function getChecklistProgressCount(userId) { const { count, error } = await saupiUserClient.from("checklist_progress").select("item_key", { count: "exact", head: true }).eq("user_id", userId).eq("checklist_key", "maba").eq("completed", true); if (error) throw error; return count || 0; }
async function loadNotificationPreferences(userId) { const { data, error } = await saupiUserClient.from("notification_preferences").select("in_app_enabled,email_enabled,job_alerts,calendar_alerts,major_alerts").eq("user_id", userId).maybeSingle(); if (error) throw error; return data; }
function fillNotificationPreferences(preferences = {}) { const form = getAccountElement("notificationPreferencesForm"); ["in_app_enabled", "email_enabled", "job_alerts", "calendar_alerts", "major_alerts"].forEach((name) => { const field = form?.elements.namedItem(name); if (field) field.checked = preferences[name] ?? name === "in_app_enabled"; }); }

async function renderAccount(user) {
  const signedOut = getAccountElement("accountSignedOut"), signedIn = getAccountElement("accountSignedIn"), syncStatus = getAccountElement("accountSyncStatus");
  if (!user) { signedOut.hidden = false; signedIn.hidden = true; return; }
  signedOut.hidden = true; signedIn.hidden = false;
  getAccountElement("accountUserName").textContent = user.user_metadata?.full_name || user.user_metadata?.name || "Akun SA UPI";
  getAccountElement("accountUserEmail").textContent = user.email || "";
  try { await syncGuestMajorJourney(); if (syncStatus) syncStatus.textContent = "Data lokal yang tersedia telah disinkronkan ke akun ini."; } catch { if (syncStatus) syncStatus.textContent = "Data lokal masih tersimpan di perangkat ini dan akan dicoba lagi saat kamu membuka akun."; }
  try { const [saved, checklist, preferences] = await Promise.all([getSavedMajorCount(user.id), getChecklistProgressCount(user.id), loadNotificationPreferences(user.id)]); getAccountElement("savedMajorCount").textContent = saved; getAccountElement("checklistProgressCount").textContent = checklist; fillNotificationPreferences(preferences); } catch { setAccountStatus("Sebagian data akun belum dapat dimuat. Coba segarkan halaman.", true); }
}

async function initialiseAccountPage() {
  const googleButton = getAccountElement("googleSignInButton"), signOutButton = getAccountElement("accountSignOutButton"), preferencesForm = getAccountElement("notificationPreferencesForm");
  if (!saupiUserClient) { setAccountStatus("Layanan akun belum tersedia. Coba lagi beberapa saat lagi.", true); return; }
  googleButton?.addEventListener("click", async () => { setAccountLoading(googleButton, true, '<i class="fa-brands fa-google" aria-hidden="true"></i> Lanjutkan dengan Google'); try { await signInWithGoogle(); } catch (error) { setAccountStatus(`Google sign-in belum dapat dimulai: ${error.message}`, true); setAccountLoading(googleButton, false, '<i class="fa-brands fa-google" aria-hidden="true"></i> Lanjutkan dengan Google'); } });
  signOutButton?.addEventListener("click", async () => { try { await signOutSaupiUser(); setAccountStatus("Kamu telah keluar dari akun."); } catch (error) { setAccountStatus(`Tidak dapat keluar dari akun: ${error.message}`, true); } });
  preferencesForm?.addEventListener("submit", async (event) => { event.preventDefault(); const user = await getCurrentSaupiUser(); if (!user) return; const values = Object.fromEntries(new FormData(preferencesForm)); const { error } = await saupiUserClient.from("notification_preferences").upsert({ user_id: user.id, in_app_enabled: Boolean(values.in_app_enabled), email_enabled: Boolean(values.email_enabled), job_alerts: Boolean(values.job_alerts), calendar_alerts: Boolean(values.calendar_alerts), major_alerts: Boolean(values.major_alerts), updated_at: new Date().toISOString() }, { onConflict: "user_id" }); setAccountStatus(error ? `Preferensi belum tersimpan: ${error.message}` : "Preferensi notifikasi berhasil disimpan.", Boolean(error)); });
  await renderAccount(await getCurrentSaupiUser()); saupiUserClient.auth.onAuthStateChange(async (_event, session) => renderAccount(session?.user || null));
}
document.addEventListener("DOMContentLoaded", () => initialiseAccountPage().catch(() => setAccountStatus("Halaman akun belum dapat disiapkan. Segarkan halaman untuk mencoba lagi.", true)));
