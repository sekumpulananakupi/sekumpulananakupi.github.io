const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const nama = document.getElementById('nama').value.trim();
  const email = document.getElementById('email').value.trim();
  const pesan = document.getElementById('pesan').value.trim();

  if (!nama || !email || !pesan) {
    formMessage.textContent = 'Mohon lengkapi semua kolom terlebih dahulu.';
    return;
  }

  formMessage.textContent = `Terima kasih, ${nama}! Pesanmu sudah tercatat secara lokal.`;
  contactForm.reset();
});
