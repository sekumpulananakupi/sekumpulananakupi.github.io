function dashboardElement(id) { return document.getElementById(id); }

function dashboardName(user) {
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Member SA UPI";
}

async function getDashboardCount(table, userId, filters = []) {
  let query = saupiUserClient.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  filters.forEach(([column, value]) => { query = value === null ? query.is(column, null) : query.eq(column, value); });
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function initialiseMemberDashboard() {
  const signedOut = dashboardElement("dashboardSignedOut");
  const signedIn = dashboardElement("dashboardSignedIn");
  const status = dashboardElement("memberDashboardStatus");
  if (!saupiUserClient) {
    status.textContent = "Layanan akun belum tersedia. Coba muat ulang halaman.";
    return;
  }

  const user = await getCurrentSaupiUser();
  if (!user) {
    signedOut.hidden = false;
    signedIn.hidden = true;
    return;
  }

  signedOut.hidden = true;
  signedIn.hidden = false;
  dashboardElement("dashboardUserName").textContent = dashboardName(user);
  dashboardElement("dashboardUserEmail").textContent = user.email || "";

  try {
    await syncGuestMajorJourney();
    const [savedMajors, completedChecklist, notifications] = await Promise.all([
      getDashboardCount("saved_items", user.id, [["entity_type", "jurusan"]]),
      getDashboardCount("checklist_progress", user.id, [["checklist_key", "maba"], ["completed", true]]),
      getDashboardCount("notifications", user.id, [["read_at", null]])
    ]);
    dashboardElement("dashboardSavedMajors").textContent = savedMajors;
    dashboardElement("dashboardChecklistProgress").textContent = completedChecklist;
    dashboardElement("dashboardUnreadNotifications").textContent = notifications;
  } catch (error) {
    console.error("[dashboard] Unable to load member data", error);
    status.textContent = "Beberapa data dashboard belum dapat dimuat. Silakan segarkan halaman.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initialiseMemberDashboard().catch((error) => {
    console.error("[dashboard] Initialisation failed", error);
    const status = dashboardElement("memberDashboardStatus");
    if (status) status.textContent = "Dashboard belum dapat disiapkan. Silakan segarkan halaman.";
  });
});
