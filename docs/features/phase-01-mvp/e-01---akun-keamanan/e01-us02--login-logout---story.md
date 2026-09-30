# USER STORY

## Story Metadata

### Title
E01-US02 — Login & logout

### Priority
High (Must Have, FEAT-002)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah memiliki akun

### I want
Masuk dengan email dan password, tetap masuk selama saya aktif memakai aplikasi, dan bisa keluar kapan saja

### So that
Data keuangan saya hanya dapat diakses oleh saya, dan saya tidak perlu login berulang kali setiap kali ingin mencatat

### Business Value
Login memastikan data keuangan pribadi terlindungi (BRD §6). Sesi yang bertahan selama pengguna aktif mengurangi hambatan untuk mencatat setiap hari (BO-01). Logout memberi pengguna kendali saat memakai perangkat bersama.

## 2. Delivery Context

### Assumptions
- Pengguna sudah terdaftar melalui E01-US01.
- Sesi berlaku 7 hari dan diperpanjang otomatis selama pengguna aktif.
- Pengguna boleh login di lebih dari satu perangkat sekaligus.

### Dependencies
- E01-US01 Registrasi akun.

### Out of Scope
- Lupa password / reset password.
- Login dengan Google atau akun media sosial lainnya.
- Autentikasi dua faktor (2FA).
- Melihat daftar perangkat yang sedang login dan logout dari semua perangkat.
- Opsi "Ingat saya" (sesi 7 hari berlaku otomatis).

## 3. Acceptance

### Acceptance Criteria
1. Halaman login berisi **Email** (wajib), **Password** (wajib, dengan ikon mata), tombol **Masuk**, dan tautan "Belum punya akun? **Daftar**".
2. Dengan email dan password yang benar, pengguna masuk dan diarahkan ke Beranda. Email tidak membedakan huruf besar dan kecil.
3. Jika email atau password salah, muncul pesan umum "Email atau password salah". Pesan ini tidak menyebutkan apakah emailnya terdaftar atau tidak.
4. Setelah 5 kali gagal login dalam 15 menit untuk email yang sama, percobaan login berikutnya ditolak sementara dengan pesan "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
5. Jika login gagal, email yang sudah diisi tetap ada, sedangkan field password dikosongkan.
6. Pengguna yang belum login dan membuka halaman mana pun selain login dan registrasi diarahkan ke halaman login. Setelah berhasil login, pengguna dikembalikan ke halaman yang tadi ingin dibuka.
7. Pengguna tetap dalam keadaan login selama 7 hari sejak aktivitas terakhir, termasuk setelah menutup browser. Setelah 7 hari tanpa aktivitas, pengguna harus login kembali.
8. Pengguna yang sudah login dan membuka halaman login langsung diarahkan ke Beranda.
9. Menu akun di header kanan atas menampilkan nama pengguna dan pilihan **Keluar**.
10. Setelah memilih Keluar, pengguna diarahkan ke halaman login dengan pesan "Anda telah keluar", dan sesinya tidak berlaku lagi.
11. Setelah keluar, tombol *back* di browser tidak menampilkan data keuangan. Pengguna tetap diarahkan ke halaman login.
12. Tombol Masuk tidak bisa ditekan dua kali selama proses berjalan. Jika gagal karena kesalahan sistem atau koneksi, muncul pesan error dan pengguna bisa mencoba lagi.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e01-us02--login-logout---design.md`
- Testing: `e01-us02--login-logout---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-001, FEAT-002, §6 Security)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us02--login-logout---story.md
-->
