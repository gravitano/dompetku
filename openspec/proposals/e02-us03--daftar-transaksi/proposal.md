---
haie_story: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us03--daftar-transaksi---story.md
status: in-progress
branch: dev/e02-us03--daftar-transaksi
---

# E02-US03 — Daftar transaksi dengan filter

## Why

Pengguna perlu menelusuri ke mana uangnya pergi dan menemukan transaksi tertentu dengan cepat (BRD FEAT-004, masalah
utama "tidak tahu uang habis ke mana"). Tab **Transaksi** saat ini hanya menampilkan 20 transaksi terbaru tanpa
periode, filter, maupun ringkasan. Acceptance criteria (story §3):

1. Default bulan berjalan (Asia/Jakarta), dikelompokkan per tanggal dengan header "Rabu, 30 Sep 2026".
2. Baris: ikon + nama kategori, catatan (atau nama kategori bila kosong), nominal **−** merah / **+** hijau.
3. Navigasi bulan **◀ September 2026 ▶**; ▶ nonaktif di bulan berjalan.
4. Filter **Jenis** (Semua / Pengeluaran / Pemasukan) dan **Kategori** (≥ 1, termasuk kategori terarsip).
5. Ringkasan **Total Pemasukan**, **Total Pengeluaran**, **Selisih** untuk periode + filter aktif.
6. Filter aktif tampil sebagai chip yang bisa dihapus satu per satu + tombol "Reset filter".
7. Filter tetap berlaku saat pindah bulan.
8. Empty state tanpa filter (+ tombol catat) dan dengan filter (+ "Reset filter").
9. Infinite scroll per 50; ringkasan dihitung dari seluruh transaksi periode, bukan yang tampil.
10. Tap baris → detail transaksi (E02-US04).
11. Hanya transaksi milik user yang login.
12. Bisa dibuka dari halaman lain dengan filter bulan + kategori terpasang (E04-US02); filter tercermin di URL, tampil
    sebagai chip, bisa di-reset, dan bertahan saat refresh.

## What Changes

- **Kontrak URL (AC 7, 12)** — `src/modules/transactions/schema.ts` (isomorfik):
  - `/transactions?month=YYYY-MM&type=expense|income&category=<uuid>&category=<uuid>`.
    `month` dihilangkan bila sama dengan bulan berjalan; `category` boleh diulang atau dipisah koma.
  - `parseTransactionListParams()` — parameter tidak valid diabaikan (bulan di masa depan / format salah → bulan
    berjalan, jenis tak dikenal → Semua, id bukan UUID dibuang, maks. 50 id, duplikat dibuang).
  - `transactionListHref()` — dipakai navigasi bulan, filter, chip, dan oleh E04-US02 untuk membuka daftar terfilter.
  - `normalizeTransactionListFilter()` — id kategori yang **bukan milik user** dibuang (tidak ada chip, tidak bocor
    nama); bila jenis dipilih, kategori jenis lain dibuang (UX-07).
- **Query server** — `src/modules/transactions/queries.ts`:
  - `buildTransactionListWhere()` — selalu `userId` dari session + rentang tanggal bulan (DATE, Asia/Jakarta) + jenis +
    `categoryId IN (...)`. Memakai index `(user_id, transaction_date)` / `(user_id, category_id, transaction_date)`
    (ITA §4.2) — tanpa migrasi.
  - `getTransactionListSummary()` — `groupBy type` atas **seluruh** transaksi periode + filter (AC 5, 9).
  - `getTransactionListPage()` — pagination cursor stabil `(transaction_date DESC, created_at DESC, id DESC)`, 50 per
    halaman (ambil 51 untuk tahu masih ada), plus total bersih per tanggal (`groupBy transactionDate, type`) untuk
    tanggal di halaman tsb agar header tanggal akurat walau grup terpotong antar halaman.
  - `getTransactionDetail()` — detail milik user (untuk tujuan tap baris).
- **Server Action** `loadTransactionPageAction()` (`actions.ts`) — halaman berikutnya untuk infinite scroll; input
  (filter + cursor) divalidasi Zod, `userId` dari session.
- **Kategori** — `getFilterCategories()` (`src/modules/categories/queries.ts`) mengembalikan semua kategori user
  termasuk terarsip; `buildFilterCategories()` (`options.ts`) mengurutkan (aktif dulu, terarsip di bawah) dan memberi
  `key` unik untuk `data-testid` (`lainnya-expense` / `lainnya-income` bila nama sama di dua jenis).
- **Pengelompokan** — `groupTransactionsByDate()` (`src/modules/transactions/grouping.ts`, isomorfik) + label
  `formatDayLabel()` ("Rabu, 30 Sep 2026") di `~/lib/date`.
- **UI** (`~/components/transactions/`): `transactions-view.tsx` (orkestrasi, `useOptimistic` + `useTransition` untuk
  label bulan/chip yang langsung berubah dan skeleton saat memuat), `month-navigator.tsx`, `transaction-filter-panel.tsx`
  (bottom sheet di HP, panel ber-anchor kanan atas di desktop), `filter-chips.tsx`, `period-summary-card.tsx`,
  `transaction-list.tsx` (grup per tanggal, infinite scroll `IntersectionObserver`, error + "Coba lagi"),
  `transaction-list-skeleton.tsx`, `transactions-empty-state.tsx`.
- **Route** — `src/app/(app)/transactions/page.tsx` membaca `searchParams`; `error.tsx` untuk kegagalan memuat awal;
  `src/app/(app)/transactions/[id]/page.tsx` detail **read-only** + `not-found.tsx` "Transaksi tidak ditemukan"
  sebagai tujuan tap baris (AC 10). Ubah/hapus tetap di E02-US04.
- **Follow-up review sebelumnya:** toggle jenis di form `disabled` saat menyimpan; fixture E2E mengirim
  `x-forwarded-for` acak per test (browser context) agar limiter Server Action login/registrasi (production) tidak
  berbagi satu bucket — limiter produk tidak diubah.

## Decisions (open questions)

- **Filter diingat saat keluar lalu kembali ke tab Transaksi? (UX):** tidak disimpan di storage. Sumber kebenaran
  filter adalah URL, sehingga filter bertahan saat refresh, tombol Back/Forward, dan tautan dari Laporan (AC 12),
  tetapi membuka tab Transaksi dari navigasi selalu mulai bersih (bulan berjalan, tanpa filter) — lebih mudah
  diprediksi dan tidak menyembunyikan transaksi karena filter lama yang terlupa.
- **Pencarian teks catatan (UX):** di luar scope (story Out of Scope); kontrak URL bisa ditambah `q` nanti.
- **Total harian di header tanggal (QA):** nilai **bersih** (pemasukan − pengeluaran) dengan tanda +/− seperti
  wireframe ("− Rp 43.000"), dihitung server dari seluruh transaksi tanggal tsb sesuai filter (bukan hanya baris yang
  sudah dimuat).
- **Selisih:** `Pemasukan − Pengeluaran`; negatif ditampilkan "− Rp 1.250.000" (merah), positif "Rp 7.607.000".
- **Tap baris sebelum E02-US04:** baris adalah tautan ke `/transactions/<id>` yang menampilkan detail read-only
  (jenis, nominal, kategori + label "Diarsipkan", tanggal, catatan, waktu dicatat). Transaksi milik user lain / id
  tidak valid → "Transaksi tidak ditemukan" (sesuai E02-US04 AC 11). E02-US04 mengganti isi halaman ini dengan form
  ubah/hapus (sheet/dialog, bisa lewat intercepting route) tanpa mengubah kontrak tautan.
- **Chip "Reset filter" vs bulan:** reset hanya melepas Jenis & Kategori; bulan yang sedang dilihat tetap (bulan
  bukan filter, melainkan periode — ditunjukkan navigasi bulan).
- **Jenis dipilih + kategori jenis lain di URL:** kategori jenis lain dibuang (konsisten dengan UX-07; kombinasi itu
  pasti kosong).
- **Batas navigasi mundur:** Januari 2000 (`TRANSACTION_DATE_MIN`), ◀ nonaktif di sana.
- **Membaca halaman berikutnya lewat Server Action:** ITA §5.1 memakai RSC untuk baca data; halaman pertama &
  ringkasan tetap dirender server (RSC), hanya "muat berikutnya" yang lewat action karena dipicu scroll di client.
- **Error memuat:** kegagalan memuat halaman berikutnya menampilkan "Gagal memuat transaksi." + **Coba lagi** di
  bawah daftar dan data yang sudah tampil tetap ada; kegagalan render awal ditangkap `error.tsx` dengan pesan & tombol
  yang sama. E2E mensimulasikan kegagalan dengan `page.route` (HTTP 500) pada request Server Action — dokumen HTML
  awal yang di-intercept tidak bisa menampilkan UI aplikasi.
- **"Hari ini" di E2E:** server memakai jam sistem, sehingga `page.clock` tidak berpengaruh ke data RSC. Data uji
  dibuat relatif terhadap tanggal hari ini (Asia/Jakarta) dan nilai harapan dihitung dari fixture.

## Validation

- Unit (Vitest): parsing/validasi search params & `transactionListHref`, normalisasi kategori (milik user, jenis),
  query builder (where, cursor, rentang bulan), ringkasan & halaman (mock Prisma), pengelompokan per tanggal & total
  harian, `formatDayLabel`, `buildFilterCategories`, action halaman berikutnya (session, validasi).
- E2E (Playwright, HP 390×844 & desktop 1280×800): semua skenario `e02-us03--daftar-transaksi---testing.md` →
  `test/web/features/e02-us03-daftar-transaksi.spec.ts` + smoke `test/web/smoke/daftar-transaksi.spec.ts`, plus tautan
  terfilter dari URL (AC 12) + refresh, kategori user lain di URL diabaikan, dan tap baris → detail.
- Data uji: akun baru per test (`createUser`), transaksi di-insert langsung lewat fixture `db`.
- Seluruh E2E + smoke dijalankan terhadap `next dev` dan `next start` (build production).
