    # Evaluasi UI, UX, Fitur, dan Roadmap SA UPI

    **Tanggal evaluasi:** 10 Juli 2026  
    **Metode:** audit berbasis kode sumber dan struktur halaman. Penilaian ini belum mencakup uji perangkat nyata, pengukuran Lighthouse, pengujian akun admin, atau validasi data produksi.

    ## 1. Ringkasan eksekutif

    SA UPI sudah memiliki fondasi portal kampus yang sangat luas: direktori jurusan, pembanding jurusan, informasi kampus, wiki, lowongan, dokumen, FAQ, kalender, panduan mahasiswa baru, pencarian global, asisten AI, komunitas, kosan, dan dashboard admin. Secara produk, arahnya tepat: menyatukan kebutuhan calon mahasiswa, mahasiswa aktif, dan alumni dalam satu portal.

    Nilai utama saat ini adalah **cakupan fitur**, **navigasi kategori yang cukup jelas**, serta **konten dinamis berbasis Supabase**. Hal yang paling perlu diprioritaskan adalah konsistensi kualitas antarhalaman, reliabilitas data, aksesibilitas interaksi, keamanan tampilan hasil AI, dan konsolidasi arsitektur front-end.

    | Aspek | Skor | Catatan singkat |
    |---|---:|---|
    | UI visual | 7.5/10 | Sistem warna, kartu, hero, dan dark mode sudah kuat; ada inkonsistensi komponen dan masalah encoding emoji. |
    | UX / alur pengguna | 7/10 | Kebutuhan utama dapat ditemukan, tetapi beberapa fitur belum terhubung penuh dan tujuan pengguna belum dipersonalisasi. |
    | Fitur & nilai produk | 8/10 | Cakupan sangat baik untuk portal komunitas kampus. |
    | Aksesibilitas | 6/10 | Sudah ada beberapa `aria-*`, label, dan live region; masih perlu fokus keyboard, fokus modal, dan preferensi gerak. |
    | Performa | 6.5/10 | Ada lazy loading, cache, pagination, dan deferred loading; ketergantungan CDN dan query front-end masih perlu dioptimalkan. |
    | Konten, SEO, dan kepercayaan | 6.5/10 | Meta dasar, canonical, Open Graph, sitemap, dan schema dinamis sudah ada; freshness, verifikasi sumber, dan URL detail perlu diperkuat. |
    | Maintainability | 6/10 | Modul sudah dipisahkan per domain, tetapi konfigurasi berulang, CSS tumpang tindih, serta banyak file skrip admin meningkatkan risiko regresi. |

    ## 2. Inventaris halaman dan fitur yang terdeteksi

    ### Halaman publik

    | Halaman | Fungsi yang tersedia | Evaluasi singkat |
    |---|---|---|
    | Beranda | Hero, statistik konten, pencarian cepat, pintasan, artikel/lowongan/info/wiki terbaru, dokumen dan FAQ ringkas | Landing page kaya konten dan CTA jelas; berpotensi terasa panjang dan sangat bergantung pada data remote. |
    | Jurusan | Direktori prodi, pencarian, filter fakultas/jenjang/akreditasi, sort, pagination, URL filter, akses pembanding | Sangat relevan untuk calon mahasiswa; perlu indikator asal/tahun data statistik. |
    | Detail jurusan | Profil, statistik penerimaan, Chart.js, biaya, FAQ, artikel dan lowongan terkait, jurusan mirip, bagikan, SEO/schema dinamis | Fitur unggulan; halaman perlu jaminan kualitas data, tanggal pembaruan, dan fallback tanpa JavaScript. |
    | Bandingkan jurusan | Pilih dua prodi, ringkasan keputusan, pemenang aspek, tabel, radar, biaya dan peluang masuk | Nilai keputusan tinggi; jangan menyederhanakan “pemenang” tanpa konteks preferensi pengguna dan sumber data. |
    | Lowongan | Cari, chip cepat, filter jurusan/tag, pagination/muat lebih banyak, cache filter | Baik untuk alumni dan mahasiswa; perlu status validitas lowongan, deadline, dan pelaporan lowongan bermasalah. |
    | Info kampus & Wiki | Daftar konten, pencarian, pagination, detail artikel | Struktur konten memadai; perlu sumber resmi, penulis, tanggal revisi, dan konten terkait. |
    | Post/detail artikel | Konten, relasi kategori/tag/jurusan, daftar isi, progress membaca, share/copy, SEO dinamis | Pengalaman membaca cukup matang; perlu sanitasi HTML terserver dan rekomendasi yang lebih transparan. |
    | Dokumen | Cari, kategori/chip, sort, kartu dokumen, tautan keluar | Berguna; perlu preview, metadata file, status verifikasi, dan pemeriksaan tautan rusak. |
    | FAQ | Pencarian, kategori, FAQ populer, accordion, pagination | Sangat tepat untuk self-service; perlu voting “membantu/tidak”, sumber jawaban, dan eskalasi ke manusia. |
    | Kalender akademik | Kalender bulanan, daftar, filter, pagination, modal detail, event berikutnya | Fungsional; karena data akademik sensitif waktu, sumber dan status pembaruan wajib sangat jelas. |
    | Panduan mahasiswa baru | Checklist lokal, progress, kalender maru, accordion, pencarian FAQ, konten dinamis | Alur onboarding bagus; terdapat tanda beberapa bagian masih placeholder/versi awal. |
    | Pencarian global | URL query, filter jenis hasil, highlight, ranking sederhana, recent search, Ctrl/Cmd+K | Salah satu fitur inti yang baik; perlu typo tolerance, empty-state yang memberi alternatif, dan analytics pencarian tanpa hasil. |
    | Asisten AI | Chat, Enter untuk kirim, respons Markdown dari Edge Function | Nilai potensial tinggi; saat ini perlu hardening keamanan dan transparansi sumber sebelum dipromosikan luas. |
    | Komunitas, Tentang, Hubungi Kami | Informasi komunitas, CTA bergabung, FAQ, kanal email/WhatsApp | Membangun kepercayaan; perlu formulir kontak terstruktur, SLA respons, dan kanal laporan masalah. |
    | Kosan | Cari, filter tipe/area/harga, kartu, WhatsApp kontak, data Supabase | Relevan untuk mahasiswa; tersembunyi dari indeks dan sitemap sehingga discoverability rendah. |
    | 404 | Pesan error, aksi kembali, pencarian | Lebih baik daripada 404 standar; gaya inline sebaiknya masuk sistem desain dan animasi menghormati preferensi pengguna. |

    ### Back office dan integrasi

    - Dashboard admin dengan autentikasi Supabase, CRUD informasi, wiki, lowongan, dokumen, FAQ, jurusan, statistik, biaya, kategori/tag, FAQ jurusan, dan kosan.
    - Editor Quill, autosave draft, upload gambar, relasi konten, OCR Tesseract untuk lowongan, serta alat Menfess Analyzer/draft generator.
    - Supabase digunakan untuk data publik dan autentikasi admin.
    - Google Analytics tersedia pada banyak halaman.
    - Komponen navbar/footer dimuat melalui fetch; tema terang/gelap disimpan di localStorage.

    ## 3. Penilaian UI

    ### Kekuatan

    1. **Identitas visual sudah terbentuk.** Token warna biru, emas, surface, border, radius, shadow, dan spacing memberi titik awal design system yang baik.
    2. **Pola komponen cukup modern.** Hero, card, pill, skeleton, empty state, filter, CTA, dan dashboard dipakai untuk mengelompokkan informasi yang kompleks.
    3. **Beranda dapat mengarahkan pengguna.** Akses cepat, pencarian hero, dan blok eksplorasi mengurangi kebingungan pengguna pertama kali.
    4. **Dark mode telah dipikirkan.** Tema mengikuti preferensi sistem dan dapat diubah manual, lalu disimpan.
    5. **Halaman kompleks memiliki visualisasi.** Detail dan perbandingan jurusan memakai tabel, navigasi bagian, dan grafik untuk meringkas data.

    ### Temuan dan rekomendasi UI

    | Prioritas | Temuan | Dampak | Rekomendasi |
    |---|---|---|---|
    | P0 | Sejumlah emoji/karakter tampil sebagai mojibake, misalnya `ðŸŽ“`, `â“`, dan `â—€`. | Kesan produk turun, teks tidak nyaman dibaca, dan dapat mengganggu screen reader. | Simpan seluruh HTML/CSS/JS sebagai UTF-8 tanpa BOM atau pastikan pipeline encoding konsisten; ganti emoji penting dengan SVG/icon Font Awesome yang memiliki `aria-hidden` dan label teks. |
    | P0 | Gaya global dan halaman tampak berasal dari beberapa lapisan CSS. | Risiko tampilan berbeda antarhalaman dan dark mode tidak konsisten. | Tetapkan token tunggal, dokumentasikan komponen inti, lalu pecah CSS menjadi `tokens`, `reset`, `components`, dan `pages`; hapus aturan duplikat secara bertahap. |
    | P1 | Banyak kartu dan CTA bersaing pada beranda yang panjang. | Beban kognitif dan scroll fatigue meningkat. | Kelompokkan beranda menurut tiga persona: calon mahasiswa, mahasiswa aktif, alumni. Jadikan satu CTA utama per bagian dan tampilkan konten personal/relevan terlebih dahulu. |
    | P1 | Beberapa halaman memakai inline style/markup padat. | Sulit dipelihara dan lebih rentan tidak responsif. | Pindahkan aturan visual ke CSS modular dan gunakan komponen markup yang konsisten. |
    | P1 | Perbedaan istilah “maba” dan “maru” muncul bersamaan. | Terminologi berpotensi membingungkan. | Pilih istilah utama, jelaskan sinonim satu kali, dan gunakan konsisten di label, SEO, serta CTA. |
    | P2 | Status data, hasil filter, dan pembaruan konten belum selalu terlihat secara visual. | Pengguna kurang percaya pada hasil. | Tambahkan “Diperbarui pada”, jumlah hasil, sumber, badge terverifikasi, dan state filter aktif yang ringkas. |

    ## 4. Penilaian UX

    ### Yang sudah baik

    - Navigasi membagi tujuan utama menjadi Akademik, Karier, Sumber Daya, Komunitas, dan Tentang.
    - Pencarian global punya input dari URL, filter jenis konten, recent search, dan shortcut keyboard.
    - Daftar jurusan, lowongan, dokumen, FAQ, wiki, dan informasi memiliki pencarian/filter yang relevan.
    - Loading skeleton, pesan kosong, dan beberapa `aria-live` sudah membantu saat konten dimuat asinkron.
    - Checklist mahasiswa baru tersimpan lokal sehingga memberi kontinuitas tanpa mewajibkan akun.
    - Detail konten mendukung daftar isi, reading progress, dan berbagi.

    ### Titik friksi UX

    1. **Navigasi penting tidak memuat semua fitur.** Kosan, panduan mahasiswa baru, pembanding jurusan, dan asisten AI tidak tampak sebagai jalur utama pada navbar. Pengguna harus menemukan lewat beranda, URL, atau mesin pencari.
    2. **Keterhubungan antarfitur belum selalu kuat.** Contoh: dari lowongan menuju profil jurusan, dari FAQ menuju dokumen resmi, atau dari kalender menuju checklist tindakan belum dijadikan alur yang eksplisit.
    3. **Konten dinamis berisiko gagal diam-diam.** Jika Supabase bermasalah, sebagian halaman dapat berubah menjadi kosong atau fallback generik tanpa aksi pemulihan yang jelas.
    4. **Keputusan jurusan membutuhkan konteks personal.** Membandingkan statistik, akreditasi, biaya, dan prospek saja belum cukup tanpa prioritas pengguna, lokasi, minat, kemampuan finansial, dan jalur masuk.
    5. **Tidak ada akun pengguna.** Bookmark, riwayat, alert, preferensi jurusan, dan checklist lintas perangkat tidak dapat dipertahankan.
    6. **Komunitas lebih banyak bersifat landing page.** Belum terlihat direktori komunitas terstruktur, moderasi, pelaporan, atau integrasi kontribusi pengguna.

    ### Perbaikan alur yang disarankan

    - Tambahkan **“Mulai dari kebutuhan saya”** di beranda: `Saya calon mahasiswa`, `Saya mahasiswa baru`, `Saya mahasiswa aktif`, `Saya alumni`.
    - Beri persistent utility bar atau menu “Lainnya” yang memuat AI, Maba, Bandingkan, Kosan, dan Dokumen.
    - Pada detail jurusan, tambahkan CTA berurutan: simpan jurusan → bandingkan → lihat biaya → lihat lowongan terkait → tanya AI dengan konteks jurusan.
    - Pada setiap informasi/kalendar, tambahkan aksi kontekstual: simpan pengingat, buka dokumen sumber, lihat FAQ terkait, dan laporkan data kedaluwarsa.
    - Sediakan empty state berorientasi solusi: kata kunci alternatif, hapus filter, kirim permintaan konten, atau hubungi admin.

    ## 5. Aksesibilitas

    ### Praktik positif yang terlihat

    - Dokumen memakai `lang="id"`, meta viewport, heading utama pada banyak halaman, label form, beberapa `aria-label`, `aria-expanded`, `aria-pressed`, dan `aria-live`.
    - Gambar kartu yang dihasilkan memiliki `alt` berdasarkan judul.
    - Kontrol dropdown navbar memperbarui `aria-expanded`.

    ### Gap yang perlu ditangani

    | Prioritas | Perbaikan aksesibilitas |
    |---|---|
    | P0 | Tambahkan fokus yang sangat terlihat untuk link, tombol, input, chip, kartu interaktif, dan kontrol slider. Jangan mengandalkan perubahan warna saja. |
    | P0 | Audit keyboard lengkap: menu mobile harus dapat dibuka/ditutup dengan Escape, fokus tidak boleh hilang, dan dropdown harus menutup saat fokus keluar. |
    | P0 | Modal kalender harus memiliki `role="dialog"`, `aria-modal="true"`, label yang benar, focus trap, pengembalian fokus ke pemicu, dan penutupan Escape. |
    | P0 | Sanitasi hasil Markdown AI sebelum masuk ke `innerHTML`; gunakan DOMPurify atau renderer Markdown yang menonaktifkan HTML mentah. Ini juga penting untuk keamanan XSS. |
    | P1 | Beri label nama pada tombol ikon seperti search/menu/kirim, dan tetapkan tipe tombol untuk mencegah submit tidak sengaja. |
    | P1 | Tambahkan `prefers-reduced-motion` untuk animasi 404, shimmer/skeleton, chart, slider, dan transisi besar. |
    | P1 | Validasi kontras teks muted, pill, border, dan state dark mode dengan WCAG AA. |
    | P2 | Tambahkan skip link menuju konten utama serta landmark `main`, `nav`, dan `footer` yang konsisten pada semua halaman. |

    ## 6. Performa dan kualitas teknis

    ### Hal positif

    - Beranda memakai pagination, mengambil kolom seperlunya, `loading="lazy"`, `decoding="async"`, cache localStorage dengan TTL, dan deferred loading untuk FAQ/dokumen.
    - List konten memiliki pagination/muat lebih banyak.
    - Beberapa halaman menerapkan debounce input dan cache.
    - Komponen bersama mengurangi duplikasi HTML navbar/footer.

    ### Risiko dan rekomendasi

    1. **Library CDN cukup banyak.** Supabase, Font Awesome, Chart.js, Quill, Tesseract, Marked, dan Google Analytics dapat memperlambat halaman pada jaringan mahasiswa yang terbatas. Muat library berat hanya di halaman yang membutuhkan, gunakan `defer`, preconnect, SRI bila memungkinkan, dan evaluasi self-host untuk aset penting.
    2. **Komponen navigasi dimuat sesudah DOM siap melalui fetch.** Pengguna dapat melihat layout shift dan navigasi baru tersedia setelah request selesai. Pertimbangkan static include/build step atau placeholder dengan ukuran pasti.
    3. **Konfigurasi Supabase berulang dalam banyak file.** Pusatkan konfigurasi dan client di satu modul untuk mengurangi drift, sambil tetap memastikan RLS tidak bergantung pada penyembunyian key publik.
    4. **Query masih banyak dipicu dari browser.** Buat index database untuk kolom pencarian/filter/order, batasi hasil, dan pertimbangkan RPC/full-text search untuk pencarian global skala besar.
    5. **Tidak tampak strategi observability.** Tambahkan monitoring error front-end, event kegagalan request, Web Vitals, dan dashboard query lambat.
    6. **Tidak tampak automated test/deployment gate.** Tambahkan lint, format, test unit fungsi kritis, test end-to-end alur pencarian/filter/admin, serta audit Lighthouse/axe pada CI.

    ## 7. Keamanan, data, dan kepercayaan

    ### Temuan utama

    - Anon key Supabase di front-end adalah pola yang benar **hanya jika** Row Level Security dan policy database ketat. Policy admin `to authenticated with check (true)` perlu dipastikan dibatasi oleh role/claim admin, bukan sekadar semua pengguna yang berhasil login.
    - Hasil AI dirender lewat `marked.parse()` lalu ditulis ke `innerHTML`. Tanpa sanitasi, respons tak tepercaya dapat menghasilkan XSS.
    - Tautan dokumen, lowongan, gambar, dan kontak pihak ketiga perlu validasi skema URL dan pemeriksaan keamanan.
    - Data akademik, biaya, daya tampung, peminat, dan kalender perlu sumber resmi, tanggal data, pengelola data, disclaimer, serta workflow review.
    - Lowongan dan kosan adalah kategori yang rentan spam/penipuan; perlu verifikasi, kedaluwarsa otomatis, pelaporan, dan moderasi.

    ### Tindakan prioritas

    1. Terapkan role admin melalui custom claims atau tabel profil dengan policy RLS yang memeriksa peran tersebut.
    2. Sanitasi semua HTML/Markdown sebelum render, termasuk isi editor dan respons AI.
    3. Validasi URL menggunakan allowlist protokol `https:`/`mailto:`/`tel:` sesuai konteks.
    4. Tambahkan audit log admin: siapa mengubah apa, kapan, dan nilai sebelum/sesudah.
    5. Tampilkan sumber, tanggal verifikasi, dan tombol “Laporkan data tidak akurat” pada data penting.

    ## 8. SEO dan konten

    ### Kekuatan

    - Beranda dan banyak halaman memiliki title, description, canonical, Open Graph, Twitter Card, analytics, robots, dan sitemap.
    - Detail post dan jurusan memperbarui SEO/schema secara dinamis.

    ### Perbaikan

    - Halaman detail berbasis query string tunggal (`post.html?type=...&id=...`, `jurusan-detail.html?id=...`) kurang ideal untuk URL yang mudah dibagikan dan SEO. Gunakan slug/permalink stabil atau prerender halaman detail penting.
    - Sitemap belum memasukkan Kosan dan halaman 404, sedangkan kosan secara eksplisit `noindex`. Tentukan strategi produk: jika kosan publik dan aman dicari, hapus `noindex` lalu masukkan sitemap; bila privat, hapus dari jalur publik dan lindungi aksesnya.
    - Tambahkan `last reviewed`, nama/role penulis, sumber primer, dan kebijakan editorial pada konten informasi.
    - Sediakan FAQ schema pada halaman FAQ dan Article/JobPosting schema bila data/validitas memenuhi ketentuan Google.
    - Buat laporan kata kunci tanpa hasil dari pencarian untuk menjadi backlog konten.

    ## 9. Roadmap pengembangan fitur

    ### Fase 0 — Perbaikan kritis (0–2 minggu)

    - Perbaiki seluruh encoding karakter/emoji.
    - Sanitasi Markdown AI dan seluruh HTML dari CMS sebelum render.
    - Audit RLS dan batasi operasi admin berdasarkan role yang tervalidasi.
    - Tambahkan error state yang bisa ditindaklanjuti untuk semua request Supabase.
    - Pastikan keyboard, Escape, focus state, dan modal kalender memenuhi dasar aksesibilitas.
    - Tambahkan sumber, tanggal pembaruan, dan disclaimer pada kalender, biaya, statistik jurusan, lowongan, dan kosan.

    ### Fase 1 — Penguatan inti (2–6 minggu)

    - Konsolidasikan design system dan CSS agar komponen konsisten di light/dark mode.
    - Buat navigasi “Lainnya”/utility yang mencakup AI, Maba, Bandingkan, Kosan, dan Dokumen.
    - Tambahkan dashboard kualitas konten untuk admin: data kosong, tautan mati, konten kedaluwarsa, lowongan expired, dan item tanpa kategori.
    - Implementasikan verifikasi/expiry untuk lowongan serta laporan masalah dari pengguna.
    - Tambahkan bookmark lokal untuk jurusan, artikel, dokumen, dan lowongan.
    - Tambahkan event analytics yang berfokus pada pencarian kosong, filter yang sering dipakai, CTA komunitas, dan pembandingan jurusan.

    ### Fase 2 — Pengalaman personal (1–3 bulan)

    - Akun pengguna opsional dengan login sosial/email untuk menyinkronkan bookmark, checklist maba, preferensi jurusan, dan notifikasi.
    - Wizard pemilihan jurusan berdasarkan minat, nilai mapel, preferensi biaya, lokasi, dan toleransi kompetisi; hasil harus menjelaskan alasan/rekomendasi, bukan memberi keputusan mutlak.
    - Watchlist jurusan: notifikasi perubahan daya tampung, jadwal, biaya, artikel, dan lowongan terkait.
    - Alert lowongan berdasarkan jurusan/tag/lokasi/deadline melalui email atau WhatsApp opt-in.
    - Kalender personal: simpan event, ekspor ICS/Google Calendar, dan pengingat.
    - FAQ feedback: “apakah jawaban membantu?”, alasan tidak membantu, dan routing ke pertanyaan baru.

    ### Fase 3 — Ekosistem komunitas (3–6 bulan)

    - Direktori komunitas/UKM/himpunan berdasarkan fakultas, jurusan, minat, kanal kontak, dan status verifikasi.
    - Form kontribusi publik untuk informasi, wiki, lowongan, kosan, dan koreksi data dengan antrean moderasi.
    - Sistem verifikasi kontributor/organisasi serta badge sumber resmi.
    - Halaman kosan yang lebih aman: peta, fasilitas terstruktur, kisaran biaya, tanggal ketersediaan, aturan hunian, laporan listing, dan status terverifikasi.
    - Asisten AI berbasis retrieval dari dokumen SA UPI yang terverifikasi, dengan citation per jawaban, batasan topik, tombol feedback, rate limit, dan eskalasi ke sumber resmi.

    ### Fase 4 — Keunggulan data dan operasional (6–12 bulan)

    - Pipeline ingest/validasi untuk data resmi kampus; change detection dan reminder review berkala.
    - Dashboard analitik produk dan konten: funnel pengguna, pencarian zero-result, performa halaman, kualitas jawaban AI, serta kesehatan database.
    - PWA/offline cache untuk dokumen/FAQ/checklist penting.
    - API publik terbatas untuk data yang telah terverifikasi serta dokumentasi integrasi.
    - Suite pengujian otomatis, visual regression, accessibility regression, performance budget, dan deployment preview.

    ## 10. Backlog fitur tambahan (lengkap per domain)

    ### Akademik dan jurusan

    - Kalkulator peluang masuk berbasis data historis dengan penjelasan keterbatasan.
    - Timeline penerimaan per jalur serta pengingat deadline.
    - Peta kurikulum/mata kuliah per semester dan prasyarat.
    - Perbandingan lebih dari dua jurusan, mode cetak/PDF, dan shareable comparison link.
    - Testimoni mahasiswa/alumni yang dimoderasi dan diberi konteks angkatan.
    - Rekomendasi jurusan terkait minat dan jurusan alternatif.
    - Kalkulator biaya total: UKT, tempat tinggal, transport, buku, dan biaya hidup estimasi.

    ### Konten dan pengetahuan

    - Workflow editorial: draft → review → publish → review ulang → archive.
    - Versi/revision history serta diff perubahan artikel.
    - Hubungan otomatis antarartikel, FAQ, dokumen, dan jurusan berbasis tag yang dikurasi.
    - Pembaca dokumen di dalam situs, metadata ukuran/format, dan link checker terjadwal.
    - Form “usulkan topik” dan voting prioritas konten.
    - Newsletter mingguan yang disesuaikan dengan minat pengguna.

    ### Karier dan alumni

    - Form submit lowongan dengan status review.
    - Filter gaji, tipe kerja, remote/hybrid, pengalaman, dan deadline.
    - Status lowongan: aktif, segera tutup, ditutup, terverifikasi.
    - CV checklist/template, panduan interview, dan portofolio per jurusan.
    - Program mentoring alumni dan direktori alumni opt-in.
    - Pelacakan lamaran pribadi tanpa membagikan data ke publik.

    ### Komunitas dan layanan mahasiswa

    - Direktori layanan kampus: kesehatan, konseling, beasiswa, fasilitas, perpustakaan, transportasi.
    - Peta kampus aksesibel dan rute antar gedung.
    - Jadwal/event kampus dan RSVP.
    - Kanal pelaporan aman untuk misinformation/scam/pelecehan dengan kebijakan penanganan.
    - Halaman status layanan SA UPI dan formulir feedback/bug report.

    ## 11. Metrik keberhasilan yang disarankan

    | Area | Metrik |
    |---|---|
    | Discovery | Rasio pencarian yang menghasilkan klik, zero-result rate, waktu menuju konten tujuan. |
    | Akademik | Jumlah perbandingan jurusan selesai, save/watchlist jurusan, klik ke sumber resmi. |
    | Konten | Freshness rate, tautan rusak, rasio artikel yang punya sumber dan tanggal review. |
    | Karier | Lowongan aktif tervalidasi, report rate, click-through ke aplikasi, expiry compliance. |
    | AI | Jawaban dengan citation, helpful vote, escalation rate, error/rate-limit count. |
    | Aksesibilitas | Skor axe/Lighthouse, issue keyboard kritis, kontras gagal, completion rate via keyboard. |
    | Performa | Core Web Vitals per halaman, ukuran JavaScript, error request Supabase, cache hit rate. |
    | Operasional | Waktu moderasi, waktu perbaikan data salah, perubahan admin tercatat dalam audit log. |

    ## 12. Urutan implementasi yang paling bernilai

    1. Keamanan render AI/CMS, RLS admin, dan konsistensi encoding.
    2. Sumber/validitas/freshness untuk seluruh data yang memengaruhi keputusan pengguna.
    3. Aksesibilitas keyboard, modal, fokus, dan reduced motion.
    4. Konsolidasi design system dan state error/loading yang konsisten.
    5. Navigasi berdasarkan persona dan keterhubungan antarfitur.
    6. Verifikasi serta moderasi lowongan/kosan/kontribusi komunitas.
    7. Akun opsional, bookmark, alert, dan personalisasi.
    8. AI dengan knowledge base terverifikasi serta citation.

    ## Penutup

    SA UPI sudah lebih dari sekadar situs informasi: fondasinya telah mendekati platform pendamping perjalanan mahasiswa. Investasi berikutnya sebaiknya tidak berfokus pada menambah halaman baru terlebih dahulu, melainkan membuat data lebih tepercaya, pengalaman lebih konsisten dan aksesibel, serta fitur yang ada saling terhubung dalam alur pengguna yang jelas. Dengan prioritas tersebut, perluasan fitur pada roadmap akan lebih aman, mudah dipelihara, dan benar-benar membantu pengguna.
