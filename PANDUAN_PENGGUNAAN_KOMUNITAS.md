# Panduan Penggunaan Fitur Komunitas SA UPI

Dokumen ini menjelaskan penggunaan direktori komunitas, pengajuan komunitas, pelaporan, dan moderasi pada SA UPI.

## Prasyarat Aktivasi

Fitur yang dijelaskan di bawah membutuhkan migrasi database pada [`supabase/migrations/20260711_user_platform_foundation.sql`](supabase/migrations/20260711_user_platform_foundation.sql) sudah diterapkan ke project Supabase.

Sebelum digunakan di produksi, administrator perlu:

1. Menjalankan migrasi foundation melalui Supabase CLI atau SQL Editor.
2. Mengaktifkan metode masuk **Email Magic Link** dan **Google OAuth** di Supabase Auth.
3. Menambahkan URL redirect situs ke pengaturan Auth Supabase.
4. Membuat data kategori di tabel `community_categories`.
5. Memberikan peran `moderator` atau `admin` kepada akun staf pada tabel `user_roles`.

Contoh promosi akun menjadi moderator:

```sql
insert into public.user_roles (user_id, role)
values ('AUTH_USER_ID', 'moderator')
on conflict (user_id) do update set role = excluded.role;
```

> Ganti `AUTH_USER_ID` dengan UUID pengguna dari Supabase Auth. Jangan memberikan peran staf kepada akun yang belum diverifikasi.

## 1. Pengunjung: Mencari Komunitas

1. Buka halaman [`pages/komunitas.html`](pages/komunitas.html).
2. Gunakan kolom **Cari nama, jurusan, minat, atau fakultas** untuk menemukan komunitas.
3. Gunakan filter kategori untuk membatasi hasil.
4. Buka tombol **Kunjungi kanal** untuk menuju tautan komunitas.

Hanya entri dengan status `published` yang ditampilkan kepada publik. Label entri memiliki arti berikut:

- **Kanal resmi**: moderator menandai kanal sebagai sumber resmi.
- **Terverifikasi**: kanal telah diperiksa moderator.
- **Belum diverifikasi**: entri telah dipublikasikan, tetapi belum menerima verifikasi tambahan.

## 2. Anggota: Masuk atau Membuat Akun

Pengajuan komunitas dan pelaporan memerlukan akun.

1. Buka [`pages/akun.html`](pages/akun.html).
2. Masukkan alamat email untuk menerima Magic Link, atau pilih masuk dengan Google.
3. Selesaikan proses autentikasi.
4. Kembali ke halaman [`pages/komunitas.html`](pages/komunitas.html).

Akun diperlukan agar setiap usulan dan laporan dapat ditelusuri serta diproses dengan aman.

## 3. Kontributor: Mengusulkan Komunitas

Setelah masuk:

1. Buka bagian **Usulkan komunitas untuk direktori** di [`pages/komunitas.html`](pages/komunitas.html).
2. Isi nama komunitas, kategori, dan deskripsi singkat.
3. Masukkan tautan kanal yang valid dengan awalan `https://` atau `http://`.
4. Tambahkan fakultas, jurusan terkait, atau minat bila relevan.
5. Pilih **Kirim untuk moderasi**.

Usulan baru otomatis memiliki status `pending` dan **belum tampil di direktori publik**. Moderator akan mempublikasikan atau meminta perbaikan sesuai kelengkapan dan keamanan data.

### Isi usulan yang baik

- Jelaskan tujuan komunitas dan siapa yang dapat bergabung.
- Gunakan tautan kanal yang aktif dan aman.
- Hindari informasi pribadi, promosi menyesatkan, spam, atau tautan berbahaya.
- Pastikan kategori serta jurusan/minat yang dipilih sesuai.

## 4. Anggota: Melaporkan Entri Bermasalah

Jika menemukan entri yang bermasalah:

1. Pastikan sudah masuk ke akun.
2. Pilih tombol **Laporkan** pada kartu komunitas.
3. Tulis alasan laporan dengan jelas, misalnya tautan mati, spam, penipuan, atau informasi tidak relevan.
4. Kirim laporan.

Laporan akan masuk dengan status `open` dan hanya dapat dilihat oleh pelapor serta staf moderator. Jangan menggunakan laporan untuk menyerang anggota atau komunitas lain.

## 5. Moderator dan Admin: Meninjau Usulan

Staf dengan peran `moderator` atau `admin` dapat membuka [`pages/admin-community.html`](pages/admin-community.html).

### Menangani usulan komunitas

1. Masuk menggunakan akun staf.
2. Buka halaman moderasi.
3. Periksa nama, deskripsi, tautan kanal, kategori, dan relevansi usulan.
4. Pilih salah satu tindakan:
   - **Publikasikan**: mengubah status menjadi `published`; entri langsung terlihat di direktori publik.
   - **Minta perbaikan**: mengubah status menjadi `needs_changes`; penulis perlu memperbarui data sebelum diajukan kembali.

### Menangani laporan

1. Periksa alasan laporan dan entri terkait.
2. Ambil tindakan moderasi yang diperlukan pada entri jika memang melanggar.
3. Pilih **Tandai selesai** jika laporan valid dan sudah ditangani.
4. Pilih **Tutup laporan** jika laporan tidak dapat dibuktikan atau tidak relevan.

Perubahan status usulan dan laporan direkam oleh trigger audit pada [`supabase/migrations/20260711_user_platform_foundation.sql`](supabase/migrations/20260711_user_platform_foundation.sql). Catatan ini dapat ditinjau oleh staf melalui tabel `audit_log`.

## Status Moderasi

| Status | Arti |
| --- | --- |
| `draft` | Draf yang belum diajukan. |
| `pending` | Menunggu peninjauan moderator. |
| `in_review` | Sedang diperiksa moderator. |
| `needs_changes` | Memerlukan perbaikan dari pengusul. |
| `approved` | Disetujui, tetapi belum tentu dipublikasikan. |
| `published` | Ditampilkan kepada publik. |
| `rejected` | Ditolak karena tidak memenuhi pedoman. |
| `archived` | Disimpan sebagai arsip dan tidak lagi ditampilkan. |

## Catatan Keamanan dan Operasional

- Antarmuka publik ada di [`pages/komunitas.html`](pages/komunitas.html) dan logikanya di [`assets/js/community-directory.js`](assets/js/community-directory.js).
- Antarmuka moderasi ada di [`pages/admin-community.html`](pages/admin-community.html) dan logikanya di [`assets/js/community-moderation.js`](assets/js/community-moderation.js).
- Akses publik, pengusul, pelapor, dan staf dibatasi oleh Row Level Security pada migrasi foundation.
- Jangan mengandalkan pembatasan antarmuka saja; peran dan kebijakan database harus sudah aktif sebelum rilis.
- Fitur blok pengguna dan tampilan status kontribusi personal belum tersedia pada tahap ini.
- Pelaporan data basi anonim dengan CAPTCHA/rate limit merupakan fitur terpisah dan belum termasuk dalam direktori komunitas ini.
