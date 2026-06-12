const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
menuToggle.addEventListener('click', () => navMenu.classList.toggle('show'));

const STORAGE_KEYS = {
  info: 'sau_info_kampus',
  wiki: 'sau_wiki_kampus',
  job: 'sau_lowongan_kerja'
};

const seedData = {
  info: [
    { id: crypto.randomUUID(), title: 'Open Recruitment Panitia Kegiatan Mahasiswa', category: 'Kegiatan', content: 'Komunitas membuka pendaftaran panitia untuk kegiatan diskusi bulanan mahasiswa UPI.' },
    { id: crypto.randomUUID(), title: 'Info Beasiswa Prestasi Mahasiswa', category: 'Beasiswa', content: 'Mahasiswa dapat menyiapkan CV, transkrip nilai, dan surat rekomendasi untuk pendaftaran beasiswa.' }
  ],
  wiki: [
    { id: crypto.randomUUID(), title: 'Apa itu FPMIPA?', tag: 'fakultas, akademik', content: 'FPMIPA adalah Fakultas Pendidikan Matematika dan Ilmu Pengetahuan Alam di Universitas Pendidikan Indonesia.' },
    { id: crypto.randomUUID(), title: 'Tips Naik Angkot ke Kampus', tag: 'transportasi, mahasiswa baru', content: 'Mahasiswa baru sebaiknya mengecek rute dan menyiapkan uang kecil saat menggunakan transportasi umum menuju kampus.' }
  ],
  job: [
    { id: crypto.randomUUID(), title: 'Tutor Kimia Part-Time', company: 'Bimbel EduBandung', location: 'Bandung', deadline: '2026-07-31', content: 'Dibutuhkan tutor kimia untuk siswa SMA. Jadwal fleksibel, cocok untuk mahasiswa tingkat akhir atau alumni.' }
  ]
};

function getData(type) {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS[type])) || [];
}

function saveData(type, data) {
  localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(data));
  renderAll();
}

function initData() {
  Object.keys(STORAGE_KEYS).forEach(type => {
    if (!localStorage.getItem(STORAGE_KEYS[type])) saveData(type, seedData[type]);
  });
}

function createCard(type, item) {
  if (type === 'info') {
    return `
      <article class="item-card">
        <div class="meta"><span class="pill">${item.category}</span></div>
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editInfo('${item.id}')">Edit</button>
          <button class="btn danger" onclick="deleteItem('info','${item.id}')">Hapus</button>
        </div>
      </article>`;
  }
  if (type === 'wiki') {
    return `
      <article class="item-card">
        <div class="meta"><span class="pill">${item.tag}</span></div>
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editWiki('${item.id}')">Edit</button>
          <button class="btn danger" onclick="deleteItem('wiki','${item.id}')">Hapus</button>
        </div>
      </article>`;
  }
  return `
    <article class="item-card">
      <div class="meta"><span class="pill">${item.company}</span><span class="pill">${item.location}</span><span class="pill">Deadline: ${item.deadline}</span></div>
      <h3>${item.title}</h3>
      <p>${item.content}</p>
      <div class="card-actions">
        <button class="btn ghost" onclick="editJob('${item.id}')">Edit</button>
        <button class="btn danger" onclick="deleteItem('job','${item.id}')">Hapus</button>
      </div>
    </article>`;
}

function renderList(type, listId, searchId) {
  const keyword = document.getElementById(searchId).value.toLowerCase();
  const data = getData(type).filter(item => JSON.stringify(item).toLowerCase().includes(keyword));
  document.getElementById(listId).innerHTML = data.length
    ? data.map(item => createCard(type, item)).join('')
    : '<div class="empty">Belum ada data atau hasil pencarian tidak ditemukan.</div>';
}

function renderAll() {
  renderList('info', 'infoList', 'infoSearch');
  renderList('wiki', 'wikiList', 'wikiSearch');
  renderList('job', 'jobList', 'jobSearch');
  document.getElementById('countInfo').textContent = getData('info').length;
  document.getElementById('countWiki').textContent = getData('wiki').length;
  document.getElementById('countJobs').textContent = getData('job').length;
}

function upsert(type, item) {
  const data = getData(type);
  const index = data.findIndex(row => row.id === item.id);
  if (index >= 0) data[index] = item;
  else data.unshift({ ...item, id: crypto.randomUUID() });
  saveData(type, data);
}

function deleteItem(type, id) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  saveData(type, getData(type).filter(item => item.id !== id));
}

function clearForm(type) {
  document.getElementById(`${type}Form`).reset();
  document.getElementById(`${type}Id`).value = '';
}

function editInfo(id) {
  const item = getData('info').find(row => row.id === id);
  infoId.value = item.id; infoTitle.value = item.title; infoCategory.value = item.category; infoContent.value = item.content;
  location.hash = '#kampus';
}

function editWiki(id) {
  const item = getData('wiki').find(row => row.id === id);
  wikiId.value = item.id; wikiTitle.value = item.title; wikiTag.value = item.tag; wikiContent.value = item.content;
  location.hash = '#wiki';
}

function editJob(id) {
  const item = getData('job').find(row => row.id === id);
  jobId.value = item.id; jobTitle.value = item.title; jobCompany.value = item.company; jobLocation.value = item.location; jobDeadline.value = item.deadline; jobContent.value = item.content;
  location.hash = '#lowongan';
}

document.getElementById('infoForm').addEventListener('submit', event => {
  event.preventDefault();
  upsert('info', { id: infoId.value, title: infoTitle.value, category: infoCategory.value, content: infoContent.value });
  clearForm('info');
});

document.getElementById('wikiForm').addEventListener('submit', event => {
  event.preventDefault();
  upsert('wiki', { id: wikiId.value, title: wikiTitle.value, tag: wikiTag.value, content: wikiContent.value });
  clearForm('wiki');
});

document.getElementById('jobForm').addEventListener('submit', event => {
  event.preventDefault();
  upsert('job', { id: jobId.value, title: jobTitle.value, company: jobCompany.value, location: jobLocation.value, deadline: jobDeadline.value, content: jobContent.value });
  clearForm('job');
});

['infoSearch', 'wikiSearch', 'jobSearch'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderAll);
});

document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (!confirm('Reset semua data demo? Data yang kamu tambah akan hilang.')) return;
  Object.keys(STORAGE_KEYS).forEach(type => localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(seedData[type])));
  renderAll();
});

initData();
renderAll();
