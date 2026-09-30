---
haie_story: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us05--kelola-kategori---story.md
status: implemented
branch: dev/e02-us05--kelola-kategori
---

# E02-US05 — Kelola kategori

## Why

Kategori bawaan tidak cocok untuk semua orang; bila tidak ada kategori yang pas, transaksi menumpuk di "Lainnya" dan
laporan per kategori kehilangan makna (BRD FEAT-006, Should Have). Saat ini menu akun → **Kategori** masih nonaktif
("Segera") dan tautan **Kelola kategori** di empty state form transaksi belum punya tujuan. Acceptance criteria
(story §3):

1. Halaman **Kategori** dari menu akun, tab **Pengeluaran | Pemasukan**, daftar aktif lalu bagian **Diarsipkan**.
2. Tambah kategori: jenis = tab aktif, nama wajib 1–30 karakter, ikon wajib dari daftar.
3. Nama unik per jenis tanpa membedakan huruf besar/kecil (aktif **dan** terarsip) → "Nama kategori sudah ada".
4. Ubah nama & ikon; langsung terlihat di semua transaksi yang memakainya.
5. Arsipkan kategori aktif: hilang dari form catat/ubah, tetap tampil di transaksi lama & filter daftar.
6. Aktifkan kembali kategori terarsip.
7. Kategori aktif terakhir per jenis tidak bisa diarsipkan → "Minimal harus ada 1 kategori aktif".
8. Hapus permanen hanya untuk kategori yang belum dipakai (dengan konfirmasi); yang sudah dipakai hanya Arsipkan +
   penjelasan.
9. Toast per aksi berhasil; gagal → pesan error, data tidak berubah.
10. Kategori milik user lain tidak terlihat dan tidak bisa diubah.

## What Changes

- **Schema** (`src/modules/categories/schema.ts`, isomorfik): `categoryFormSchema` (nama di-trim, 1–30 karakter,
  ikon dari `CATEGORY_ICON_KEYS`), `categoryCreateSchema` (+ jenis), `categoryUpdateSchema` (+ id UUID),
  `categoryIdSchema`, `normalizeCategoryName` (trim + lower-case, dipakai untuk cek unik) dan pesan `CATEGORY_MESSAGES`.
- **Ikon** (`src/modules/categories/icons.ts`): 24 kunci ikon lucide (termasuk 10 ikon bawaan yang sudah ada di DB),
  `CategoryIcon` memetakan semuanya. Kolom `icon` tetap berisi kunci (bukan emoji) — data lama tetap valid.
- **Server Action** (`src/modules/categories/actions.ts`) — `createCategoryAction`, `updateCategoryAction`,
  `archiveCategoryAction`, `restoreCategoryAction`, `deleteCategoryAction`:
  - `userId` selalu dari session; setiap baca/tulis memakai `where { id, userId }`. Id bukan UUID / tidak ada / milik
    user lain → `NOT_FOUND` "Kategori tidak ditemukan".
  - Semua mutasi berjalan di `prisma.$transaction` yang diawali `pg_advisory_xact_lock(<user>)` — mutasi kategori
    satu user diserialkan, sehingga cek "nama unik" dan "minimal 1 aktif" aman dari race dua tab (tanpa unique index
    ekspresi `lower(name)` yang tidak bisa dinyatakan di `schema.prisma` dan akan dianggap drift oleh
    `prisma migrate dev`).
  - Unik: bandingkan `lower(trim(name))` dengan semua kategori jenis yang sama (termasuk terarsip, kecuali dirinya).
  - Arsip: tolak bila tinggal 1 aktif (`CONFLICT`). Hapus: tolak bila sudah dipakai transaksi (`CONFLICT`, sarankan
    arsip) atau bila itu kategori aktif terakhir; FK `Restrict` transaksi tetap jadi pengaman terakhir. Anggaran
    kategori yang dihapus ikut terhapus (cascade, tidak mungkin ada data transaksinya).
  - Pulihkan: cek batas jumlah & keunikan nama terhadap kategori aktif.
  - Setelah berhasil `revalidatePath("/", "layout")` (form catat, daftar, filter, Beranda ikut baru).
- **Query** (`queries.ts`): `getManagedCategories(userId)` — semua kategori + jumlah transaksi (semua waktu).
- **Route** `src/app/(app)/categories/page.tsx` (+ `loading.tsx` skeleton), tab awal dari `?type=income|expense`.
- **UI** (`~/components/categories/`): `categories-view.tsx` (tab, tombol tambah, daftar aktif, bagian Diarsipkan
  yang bisa dilipat), `category-form-sheet.tsx` (bottom sheet HP / dialog desktop memakai wadah sheet transaksi;
  nama + counter `n/30`, pratinjau ikon, grid ikon, Simpan; mode ubah: Hapus / Arsipkan + teks bantuan, menu ⋯ untuk
  mengarsipkan kategori yang belum dipakai, konfirmasi "Hapus kategori X?"), `category-icon-picker.tsx`.
- **Integrasi:** menu akun → Kategori aktif (tautan `/categories`); `ManageCategoriesLink` diberi `href`
  (`/categories?type=<jenis>`).
- **Seed kategori bawaan:** `seedDefaultCategories` kini hanya membuat kategori bawaan bila user belum punya kategori
  sama sekali — `pnpm db:seed` ulang tidak menghidupkan lagi kategori bawaan yang sudah diubah namanya / dihapus user
  (dan tidak menabrak aturan nama unik).
- **Tanpa migrasi database.**

## Decisions (open questions)

- **Batas jumlah kategori (UX):** maksimal **30 kategori aktif per jenis** (terarsip tidak dihitung) — grid form
  transaksi tetap ringkas. Tambah/pulihkan saat sudah 30 → "Maksimal 30 kategori aktif per jenis".
- **Urutan (UX):** tanpa urutan manual (out of scope). Halaman Kategori: aktif & terarsip urut abjad (design
  "Default"). Grid form transaksi tetap memakai urutan yang sudah ada (kategori bawaan urutan tetap, custom abjad);
  kategori bawaan yang diganti namanya tetap dianggap bawaan dan tampil setelah bawaan lain.
- **Kategori bawaan:** boleh diubah nama/ikon, diarsipkan, dan — bila belum dipakai — dihapus, sama seperti custom
  (story §2 Assumptions).
- **Jumlah transaksi (QA):** dihitung dari semua waktu.
- **Kategori terarsip:** tidak bisa diubah/dihapus langsung; aksi yang tersedia hanya **Aktifkan kembali** (tombol di
  baris). Ubah/hapus setelah diaktifkan.
- **Ikon:** grid 24 ikon lucide (konsisten dengan ikon bawaan yang sudah tersimpan sebagai kunci), bukan emoji.
  `data-testid="category-icon-option-<kunci>"`, mis. `category-icon-option-coffee` untuk ☕.
- **Nama:** hanya di-trim (spasi di tengah dipertahankan); unik dibandingkan lower-case.
- **Mengarsipkan kategori aktif terakhir:** tombol tetap bisa ditekan dan server menolak dengan pesan
  "Minimal harus ada 1 kategori aktif" (sama dengan skenario QA); aturan sama berlaku untuk menghapus kategori aktif
  terakhir.

## Follow-up review E02-US04 (commit terpisah)

- **Simpan perubahan** di detail transaksi membandingkan nilai ternormalisasi (catatan di-trim, nominal tanpa nol di
  depan) dengan data awal — spasi di belakang catatan saja tidak lagi mengaktifkan tombol / "Buang perubahan?".
- Detail sebagai modal (intercepted): setelah simpan/hapus memakai `router.back()` (ditunda sampai hasil revalidate
  Server Action ter-commit, lalu `router.refresh()`), bukan `router.replace(backHref)` — tidak ada entri riwayat
  ganda, Back pertama langsung kembali ke halaman sebelum daftar. Tautan langsung tetap `router.replace(backHref)`.

## Catatan untuk EPIC-003 Anggaran

- Kategori terarsip tetap punya `budgets` (tidak dihapus). EPIC-003 perlu memutuskan: anggaran bulan berjalan untuk
  kategori terarsip tetap tampil/dihitung atau disembunyikan, dan kategori terarsip tidak boleh menjadi pilihan
  anggaran baru (pakai `getActiveCategories`).
- Menghapus kategori (hanya yang belum dipakai transaksi) ikut menghapus anggarannya (FK `onDelete: Cascade`);
  pertimbangkan menolak hapus bila kategori punya anggaran, atau tampilkan peringatan.
