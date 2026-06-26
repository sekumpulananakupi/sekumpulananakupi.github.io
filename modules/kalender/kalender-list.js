const calendarList = document.getElementById("calendarList");
const calendarSearch = document.getElementById("calendarSearch");
const calendarCategory = document.getElementById("calendarCategory");
const calendarSemester = document.getElementById("calendarSemester");
const calendarCount = document.getElementById("calendarCount");
const hidePast = document.getElementById("hidePast");
const calendarPagination = document.getElementById("calendarPagination");

let currentPage = 1;
const itemsPerPage = 12;

function renderKalender() {
  if (!calendarList) return;

  const keyword = calendarSearch.value.toLowerCase().trim();
  const selectedCategory = calendarCategory.value;
  const selectedSemester = calendarSemester.value;
  const isHidePast = hidePast ? hidePast.checked : true;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let filteredData = kalenderAkademik.filter((item) => {
    const matchKeyword =
      item.kegiatan.toLowerCase().includes(keyword) ||
      item.kategori.toLowerCase().includes(keyword) ||
      item.semester.toLowerCase().includes(keyword) ||
      item.tanggal.toLowerCase().includes(keyword) ||
      item.deskripsi.toLowerCase().includes(keyword);

    const matchCategory =
      selectedCategory === "semua" || item.kategori === selectedCategory;

    const matchSemester =
      selectedSemester === "semua" || item.semester === selectedSemester;

    const selesai = new Date(item.selesai || item.mulai);
    selesai.setHours(23, 59, 59, 999);

    const matchPast = !isHidePast || selesai >= now;

    return matchKeyword && matchCategory && matchSemester && matchPast;
  });

  filteredData.sort((a, b) => new Date(a.mulai) - new Date(b.mulai));

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (currentPage > totalPages) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  calendarCount.textContent = `${totalItems} jadwal ditemukan`;

  if (paginatedData.length === 0) {
    calendarList.innerHTML = `
      <div class="empty-state">
        <h3>Jadwal tidak ditemukan</h3>
        <p>Coba gunakan kata kunci atau filter lain.</p>
      </div>
    `;

    if (calendarPagination) calendarPagination.innerHTML = "";
    return;
  }

  calendarList.innerHTML = paginatedData
    .map((item) => {
      const status = getStatus(item.mulai, item.selesai);
      const statusClass = status.toLowerCase().replaceAll(" ", "-");

      return `
        <article class="calendar-card">
          <div class="calendar-card-top">
            <span class="calendar-badge">${item.kategori}</span>
            <span class="calendar-semester">${item.semester}</span>
          </div>

          <h3>${item.kegiatan}</h3>

          <div class="calendar-date">
            ${item.tanggal}
          </div>

          <div class="calendar-status ${statusClass}">
            ${status}
          </div>

          <p>${item.deskripsi}</p>
        </article>
      `;
    })
    .join("");

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if (!calendarPagination) return;

  if (totalPages <= 1) {
    calendarPagination.innerHTML = "";
    return;
  }

  let html = "";

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="${i === currentPage ? "active" : ""}" data-page="${i}">
        ${i}
      </button>
    `;
  }

  calendarPagination.innerHTML = html;
}

calendarSearch.addEventListener("input", () => {
  currentPage = 1;
  renderKalender();
});

calendarCategory.addEventListener("change", () => {
  currentPage = 1;
  renderKalender();
});

calendarSemester.addEventListener("change", () => {
  currentPage = 1;
  renderKalender();
});

if (hidePast) {
  hidePast.addEventListener("change", () => {
    currentPage = 1;
    renderKalender();
  });
}

if (calendarPagination) {
  calendarPagination.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    currentPage = Number(button.dataset.page);
    renderKalender();

    calendarList.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

renderKalender();