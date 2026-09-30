---
haie_story: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us04--ubah-hapus-transaksi---story.md
status: implemented
branch: dev/e02-us04--ubah-hapus-transaksi
---

# E02-US04 — Ubah dan hapus transaksi

## Why

Salah input pasti terjadi (salah nominal, kategori, tanggal, atau transaksi ganda). Tanpa cara memperbaikinya,
ringkasan, anggaran, dan laporan menjadi tidak akurat (BRD FEAT-005, BO-03). Saat ini `/transactions/<id>` (E02-US03)
hanya menampilkan detail read-only dan baris Beranda belum bisa ditekan. Acceptance criteria (story §3):

1. Tap baris di tab Transaksi **dan** transaksi terbaru di Beranda → **Detail Transaksi** berisi form terisi.
2. Semua field bisa diubah dengan validasi yang sama dengan E02-US01 (0 < nominal ≤ Rp 1 M, tanggal ≤ hari ini
   Asia/Jakarta, catatan ≤ 100).
3. Jenis diubah → kategori dikosongkan, wajib pilih kategori jenis baru.
4. **Simpan perubahan** hanya aktif bila ada perubahan.
5. Tersimpan → toast "Perubahan tersimpan", daftar & ringkasan diperbarui, transaksi pindah bulan bila tanggal dipindah.
6. Kategori terarsip tetap tampil (label "Diarsipkan") dan boleh dipertahankan, tetapi tidak bisa dipilih sebagai
   kategori baru.
7. **Hapus** dengan konfirmasi "Hapus transaksi ini? Tindakan ini tidak bisa dibatalkan." + nominal & kategori.
8. Terhapus → toast "Transaksi dihapus", detail tertutup, daftar & ringkasan diperbarui.
9. Menutup detail yang sudah diubah → "Buang perubahan?".
10. Gagal simpan/hapus → pesan error, data tidak berubah (form tetap terisi).
11. Hanya transaksi milik sendiri; tautan transaksi user lain → "Transaksi tidak ditemukan".

## What Changes

- **Schema** (`src/modules/transactions/schema.ts`, isomorfik): `transactionIdSchema` (UUID), pesan
  `TRANSACTION_EDIT_MESSAGES` ("Perubahan tersimpan", "Transaksi dihapus", "Gagal menyimpan perubahan. Coba lagi.",
  "Gagal menghapus transaksi. Coba lagi.", "Transaksi tidak ditemukan"), dan penanda asal `from=home` di
  `detailBackHref` (Kembali/tutup dari Beranda → `/`) + `homeDetailHref()`.
- **Server Action** (`actions.ts`):
  - `updateTransactionAction({ id, ...form })` — `userId` dari session; id bukan UUID / transaksi tidak ada / milik
    user lain → `NOT_FOUND` "Transaksi tidak ditemukan" (tanpa membedakan). Validasi form = `transactionSchema`
    (sama dengan create). Kategori wajib milik user & jenis cocok; kategori terarsip hanya diterima bila **sama dengan
    kategori transaksi saat ini dan jenis tidak berubah**. Update memakai `updateMany({ where: { id, userId } })`
    (count 0 → `NOT_FOUND`), lalu `revalidatePath("/", "layout")`.
  - `deleteTransactionAction({ id })` — `deleteMany({ where: { id, userId } })`, count 0 → `NOT_FOUND`, lalu
    revalidate.
- **Route detail (modal + deep link):**
  - Parallel route `@modal` di `src/app/(app)/` + intercepting route `@modal/(.)transactions/[id]` → tap baris
    (Transaksi/Beranda) membuka detail sebagai **bottom sheet (HP) / dialog (desktop)** di atas halaman asal, URL
    tetap `/transactions/<id>?from=...`. `@modal/default.tsx`, `@modal/page.tsx`, `@modal/[...catchAll]/page.tsx`
    mengembalikan `null` agar modal tertutup saat navigasi.
  - Tautan langsung / refresh `/transactions/<id>` merender sheet yang sama (halaman penuh). Transaksi user lain /
    sudah dihapus / id tidak valid → isi sheet "Transaksi tidak ditemukan" + **Kembali ke daftar** (sama di modal dan
    halaman; `not-found.tsx` detail dihapus agar revalidate setelah hapus tidak sempat menampilkan halaman 404 —
    data yang tampil dibekukan selama menghapus).
  - Tutup tanpa perubahan: `router.back()` bila dibuka sebagai modal, selain itu `router.replace(backHref)`. Setelah
    simpan/hapus selalu `router.replace(backHref)` (daftar asal beserta filter / Beranda) sehingga data terbaru dimuat
    dan tombol Back tidak kembali ke transaksi yang sudah dihapus.
  - `loading.tsx` di intercepting route → skeleton sheet saat membuka detail.
- **UI** (`~/components/transactions/`):
  - `transaction-form.tsx` dipakai ulang untuk mode ubah (prop `transaction`): judul "Detail Transaksi", nilai awal
    dari transaksi, tombol `transaction-update-button` "Simpan perubahan" nonaktif sampai `isDirty`, pesan gagal
    khusus ubah, info "Dicatat 30 Sep 2026, 12:15", slot aksi hapus.
  - `transaction-sheet.tsx` — wadah sheet/dialog + dialog "Buang perubahan?" dipakai bersama form catat & detail.
  - `transaction-detail-sheet.tsx` — orkestrasi detail: simpan, hapus + dialog konfirmasi (`confirm-delete-button`,
    `confirm-cancel-button`, ringkasan ikon + catatan − nominal + tanggal), pencegahan klik ganda, error gagal hapus.
  - `CategoryGrid` mendukung opsi terarsip dengan badge `category-archived-badge` "Diarsipkan".
  - `recent-transactions.tsx` — baris Beranda menjadi tautan ke detail (`?from=home`).
- **Tanpa migrasi** (kolom yang dibutuhkan sudah ada).

## Decisions (open questions)

- **Undo setelah hapus (UX):** tidak. Story menaruh undo di Out of Scope; dialog konfirmasi yang menampilkan ringkasan
  transaksi sudah cukup mencegah salah hapus. Bisa ditambah nanti (soft delete + toast "Urungkan").
- **Swipe-to-delete di daftar (UX):** tidak. Hapus hanya dari detail — satu jalur yang jelas, tidak bentrok dengan
  gesture scroll/back di HP, dan tetap melalui konfirmasi.
- **Kategori terarsip:** chip kategori terarsip hanya tampil selama masih menjadi pilihan transaksi (label
  "Diarsipkan"). Setelah pengguna memilih kategori lain atau mengganti jenis, chip itu hilang dan tidak bisa dipilih
  ulang (kecuali membuka ulang detail). Server menegakkan aturan yang sama.
- **"Sudah dihapus" vs "milik user lain" (QA):** tidak dibedakan — keduanya "Transaksi tidak ditemukan".
- **Gagal hapus:** pesan tampil di dialog konfirmasi (dialog tetap terbuka, tombol Hapus bisa ditekan lagi); transaksi
  tetap ada.
- **Detail via tautan langsung:** sheet yang sama dirender sebagai halaman (tanpa daftar di belakangnya); menutupnya
  membuka daftar bulan transaksi (atau daftar/Beranda asal bila ada `from=`).
