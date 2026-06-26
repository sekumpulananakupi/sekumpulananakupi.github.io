function safeDate(dateString) {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEventsByDate(dateStr) {
  const hari = safeDate(dateStr);

  return kalenderAkademik.filter((item) => {
    const mulai = safeDate(item.mulai);
    const selesai = safeDate(item.selesai || item.mulai);
    selesai.setHours(23, 59, 59, 999);

    return hari >= mulai && hari <= selesai;
  });
}

function getStatus(tanggalMulai, tanggalSelesai) {
  const today = new Date();
  const start = new Date(tanggalMulai);
  const end = new Date(tanggalSelesai || tanggalMulai);

  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (today < start) return "Akan Datang";
  if (today >= start && today <= end) return "Sedang Berlangsung";
  return "Selesai";
}

function getCountdownInfo(diff) {
  if (diff === 0) return { text: "Hari Ini", className: "today" };
  if (diff === 1) return { text: "Besok", className: "tomorrow" };
  if (diff <= 7) return { text: `${diff} hari lagi`, className: "week" };

  return { text: `${diff} hari lagi`, className: "future" };
}