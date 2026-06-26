const nextEventCard = document.getElementById("nextEventCard");

function renderNextEvent() {
  if (!nextEventCard) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = kalenderAkademik
    .filter((item) => {
      const selesai = new Date(item.selesai || item.mulai);
      selesai.setHours(23, 59, 59, 999);
      return selesai >= today;
    })
    .sort((a, b) => new Date(a.mulai) - new Date(b.mulai))
    .slice(0, 3);

  if (upcoming.length === 0) {
    nextEventCard.innerHTML = `
      <h2>📅 Agenda Terdekat</h2>
      <p>Tidak ada agenda berikutnya.</p>
    `;
    return;
  }

  nextEventCard.innerHTML = `
    <h2>📅 3 Agenda Terdekat</h2>

    <div class="next-event-list">
      ${upcoming
        .map((event) => {
          const start = new Date(event.mulai);
          start.setHours(0, 0, 0, 0);

          let diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
          if (diff < 0) diff = 0;

          const countdown = getCountdownInfo(diff);

          return `
            <div class="next-event-item">
              <div class="next-event-left">
                <div class="next-event-title">${event.kegiatan}</div>
                <div class="next-event-date">${event.tanggal}</div>
                <div class="next-event-category">${event.kategori}</div>
              </div>

              <div class="next-event-right">
                <div class="next-event-days ${countdown.className}">
                  ${countdown.text}
                </div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

renderNextEvent();