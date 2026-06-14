function showEmpty(targetId, title, message, icon = "📭") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">${icon}</span>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
}

function showError(targetId, message = "Gagal memuat data.") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">⚠️</span>
      <h3>Terjadi Kesalahan</h3>
      <p>${message}</p>
    </div>
  `;
}
