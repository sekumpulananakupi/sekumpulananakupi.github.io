const monthTitle = document.getElementById("monthTitle");
const monthGrid = document.getElementById("monthGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const calendarModal = document.getElementById("calendarModal");
const closeCalendarModal = document.getElementById("closeCalendarModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

let currentMonth = 6;
let currentYear = 2026;
let lastModalTrigger = null;

function closeModal() {
  if (!calendarModal) return;

  calendarModal.classList.remove("show");
  calendarModal.setAttribute("aria-hidden", "true");
  lastModalTrigger?.focus();
  lastModalTrigger = null;
}

function trapModalFocus(event) {
  if (event.key !== "Tab" || !calendarModal?.classList.contains("show")) return;

  const focusable = [...calendarModal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )];
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function renderMonth() {
  if (!monthTitle || !monthGrid) return;

  monthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  monthGrid.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const emptyDays = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < emptyDays; i++) {
    monthGrid.innerHTML += `<div class="month-day empty"></div>`;
  }

  const totalDay = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let day = 1; day <= totalDay; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    const events = getEventsByDate(dateStr);
    const maxVisible = 2;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const isToday = dateStr === todayStr;

    let html = `
      <div class="month-day ${isToday ? "today" : ""}" data-date="${dateStr}">
        <div class="month-number">${day}</div>
    `;

    events.slice(0, maxVisible).forEach((event) => {
      html += `
        <div class="month-event">
          ${event.kegiatan}
        </div>
      `;
    });

    if (events.length > maxVisible) {
      html += `
        <button class="month-more" type="button" data-date="${dateStr}">
          +${events.length - maxVisible} agenda lainnya
        </button>
      `;
    }

    html += `</div>`;
    monthGrid.innerHTML += html;
  }
}

document.addEventListener("click", (e) => {
  const moreBtn = e.target.closest(".month-more");
  const day = e.target.closest(".month-day");

  const targetDate = moreBtn ? moreBtn.dataset.date : day?.dataset.date;

  if (!targetDate || !calendarModal || !modalTitle || !modalBody) return;

  const events = getEventsByDate(targetDate);
  if (events.length === 0) return;

  modalTitle.textContent = targetDate;

  modalBody.innerHTML = events
    .map(
      (event) => `
        <div class="modal-event">
          <h3>${event.kegiatan}</h3>
          <strong>${event.tanggal}</strong>
          <p>${event.deskripsi}</p>
          <small>${event.kategori} · ${event.semester}</small>
        </div>
      `
    )
    .join("");

  lastModalTrigger = moreBtn || day;
  calendarModal.classList.add("show");
  calendarModal.setAttribute("aria-hidden", "false");
  closeCalendarModal?.focus();
});

if (closeCalendarModal && calendarModal) {
  closeCalendarModal.onclick = closeModal;
}

if (calendarModal) {
  calendarModal.onclick = (e) => {
    if (e.target === calendarModal) closeModal();
  };
}

document.addEventListener("keydown", (event) => {
  if (!calendarModal?.classList.contains("show")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
    return;
  }
  trapModalFocus(event);
});

if (prevMonthBtn) {
  prevMonthBtn.onclick = () => {
    currentMonth--;

    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }

    renderMonth();
  };
}

if (nextMonthBtn) {
  nextMonthBtn.onclick = () => {
    currentMonth++;

    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }

    renderMonth();
  };
}

renderMonth();

document.querySelectorAll(".month-day").forEach((day) => {
  const events = day.querySelectorAll(".month-event").length;
  const more = day.querySelector(".month-more, .agenda-more, .more-events");

  if (events > 0 || more) {
    day.classList.add("has-agenda");
  }

  if (events > 1 || more) {
    day.classList.add("many-agenda");
  }
});