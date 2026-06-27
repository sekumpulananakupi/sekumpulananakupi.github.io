const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("show");
  });
}

let isAdmin = false;

let infoData = [];
let wikiData = [];
let jobData = [];
let dokumenData = [];
let faqData = [];

let kategoriData = [];
let tagData = [];
let jurusanData = [];
let biayaPendidikanData = [];

let statistikData = [];
let jurusanAdminData = [];
let kategoriAdminData = [];
let tagAdminData = [];

let faqJurusanData = [];

let infoEditor = null;
let wikiEditor = null;
let jobEditor = null;

// Halaman admin yang sudah pernah dimuat
const loadedAdminPages = new Set();

let artikelJurusanData = [];

const ADMIN_PAGE_SIZE = 20;

const adminListVisibleCount = {
  info: ADMIN_PAGE_SIZE,
  wiki: ADMIN_PAGE_SIZE,
  job: ADMIN_PAGE_SIZE,
  dokumen: ADMIN_PAGE_SIZE,
  faq: ADMIN_PAGE_SIZE,
  jurusan: ADMIN_PAGE_SIZE,
  biaya: ADMIN_PAGE_SIZE,
  statistik: ADMIN_PAGE_SIZE,
  faqJurusan: ADMIN_PAGE_SIZE
};

let adminJobPage = 0;
let adminJobHasMore = true;

let adminBiayaPage = 0;
let adminBiayaHasMore = true;

let dashboardAuditLoaded = false;
