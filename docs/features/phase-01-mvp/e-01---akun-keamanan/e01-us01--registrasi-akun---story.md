# USER STORY

## Story Metadata

### Title
E01-US01 — Registrasi akun

### Priority
High (Must Have, FEAT-001)

### PM Sync
Not synced

## 1. User Need

### As a
Calon pengguna DompetKu

### I want
Membuat akun dengan nama, email, dan password

### So that
Saya memiliki ruang pribadi yang aman untuk mencatat keuangan saya, dan hanya saya yang dapat melihatnya

### Business Value
Registrasi adalah pintu masuk seluruh fitur DompetKu. Prosesnya harus singkat supaya pengguna baru bisa langsung mencatat transaksi pertama tanpa hambatan. Kategori bawaan yang disiapkan otomatis membuat pengguna tidak perlu melakukan setup apa pun sebelum mulai mencatat.

## 2. Delivery Context

### Assumptions
- Satu email hanya bisa dipakai untuk satu akun.
- Email dianggap sama tanpa membedakan huruf besar dan kecil (`Budi@Example.com` = `budi@example.com`).
- Verifikasi email tidak dilakukan di MVP.

### Dependencies
- Environment dengan HTTPS sudah siap (PEP D01).
- Daftar kategori bawaan disepakati (lihat Acceptance Criteria no. 7).

### Out of Scope
- Verifikasi email.
- Registrasi dengan Google atau akun media sosial lainnya.
- Syarat & ketentuan dan kebijakan privasi (belum ada di MVP personal).
- Ubah profil dan hapus akun.

## 3. Acceptance

### Acceptance Criteria
1. Halaman login memiliki tautan "Daftar" menuju halaman registrasi, dan halaman registrasi memiliki tautan "Masuk" kembali ke halaman login.
2. Form registrasi berisi **Nama** (wajib, maksimal 50 karakter), **Email** (wajib, format email valid), **Password** (wajib), dan **Konfirmasi Password** (wajib).
3. Password minimal 8 karakter dan mengandung minimal 1 huruf dan 1 angka. Persyaratan ini ditampilkan di bawah field password sebelum pengguna mengetik.
4. Konfirmasi password harus sama dengan password.
5. Jika email sudah terdaftar, muncul pesan "Email sudah terdaftar. Silakan masuk." beserta tautan ke halaman login, dan akun baru tidak dibuat.
6. Jika ada field yang tidak valid, pesan muncul di bawah field terkait dan data lain yang sudah diisi tidak hilang. Field password dan konfirmasi password dikosongkan hanya jika registrasi gagal karena kesalahan sistem.
7. Setelah registrasi berhasil, akun otomatis memiliki kategori bawaan:
   - Pengeluaran: Makan & Minum, Transportasi, Belanja, Tagihan, Hiburan, Kesehatan, Lainnya
   - Pemasukan: Gaji, Bonus, Hadiah, Lainnya
8. Setelah registrasi berhasil, pengguna otomatis login dan diarahkan ke Beranda, dengan sapaan "Selamat datang, <nama>!".
9. Tombol "Daftar" tidak bisa ditekan dua kali selama proses berjalan, sehingga tidak ada akun ganda.
10. Jika registrasi gagal karena kesalahan sistem atau koneksi, muncul pesan error dan pengguna bisa mencoba lagi.
11. Password tidak pernah ditampilkan atau dikirim kembali dalam bentuk teks biasa. Pengguna dapat menekan ikon mata untuk melihat password yang sedang diketik.
12. Pengguna yang sudah login dan membuka halaman registrasi langsung diarahkan ke Beranda.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e01-us01--registrasi-akun---design.md`
- Testing: `e01-us01--registrasi-akun---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-001, FEAT-001, §6 Security)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us01--registrasi-akun---story.md
-->
