---
haie_story: docs/features/phase-01-mvp/e-03---anggaran/e03-us01--atur-anggaran-kategori---story.md
status: implemented
branch: dev/e03-us01--atur-anggaran-kategori
---

# E03-US01 — Atur anggaran kategori

## Why

Pengguna sering over-budget karena tidak punya batas pengeluaran per kategori yang tertulis (BRD FEAT-007, BO-03).
Tab **Anggaran** saat ini masih placeholder. Acceptance criteria (story §3):

1. Halaman **Anggaran** dari tab "Anggaran" di bottom nav (HP) / sidebar (desktop).
2. Default bulan berjalan; navigasi ◀ ▶; ▶ nonaktif di bulan depan (maksimal +1 bulan).
3. Semua kategori pengeluaran aktif dengan nominal anggaran atau "Belum diatur".
4. Atur anggaran: nominal > 0 dan ≤ Rp 1.000.000.000, format Rupiah.
5. Ubah nominal anggaran yang sudah ada.
6. Hapus anggaran setelah konfirmasi → kembali "Belum diatur".
7. Satu anggaran per kategori per bulan (atur ulang = ubah).
8. **Total anggaran** bulan tsb di atas halaman, langsung diperbarui.
9. Bulan tanpa anggaran + bulan lalu punya → **"Salin dari bulan lalu"** (hanya kategori yang masih aktif), toast
   "Anggaran disalin dari [bulan]".
10. Bulan lampau read-only: tanpa tombol atur/ubah/hapus/salin.
11. Toast "Anggaran tersimpan"; gagal → pesan error, nominal tetap.
12. Anggaran hanya bisa dilihat/diubah pemiliknya.

## What Changes

- **Schema** (`src/modules/budgets/schema.ts`, isomorfik): `budgetAmountSchema` (string digit → number, 1 s.d.
  1.000.000.000, pesan sesuai design), `budgetSetSchema` (`categoryId` UUID, `month` "YYYY-MM", `amount`),
  `budgetRefSchema` (`categoryId`, `month`), `budgetCopySchema` (`month`), pesan `BUDGET_MESSAGES`, aturan bulan:
  `parseBudgetMonthParam` (URL `?month=` → dibatasi `[2000-01, bulan berjalan + 1]`, tidak valid → bulan berjalan),
  `budgetMaxMonth`, `isBudgetMonthEditable` (bulan berjalan atau bulan depan), `budgetsHref`.
- **Server Action** (`src/modules/budgets/actions.ts`): `setBudgetAction` (upsert pada unique
  `(user_id, category_id, period_month)`), `deleteBudgetAction`, `copyPreviousBudgetsAction`.
  - `userId` selalu dari session; kategori wajib milik user, jenis **EXPENSE**, dan **aktif** — selain itu
    `NOT_FOUND` "Kategori tidak ditemukan" (tanpa membedakan milik user lain / tidak ada).
  - Bulan dievaluasi dengan jam server (Asia/Jakarta): bulan lampau atau > +1 bulan → `CONFLICT`
    "Anggaran bulan yang sudah lewat hanya bisa dilihat" / "Anggaran hanya bisa diatur maksimal 1 bulan ke depan".
  - Mutasi anggaran & kategori satu user diserialkan dengan advisory lock yang sama (`categories:<userId>`,
    dipindah ke `src/modules/categories/lock.ts`) — atur anggaran tidak bisa balapan dengan arsip/hapus kategori.
  - Salin: hanya bila bulan tujuan belum punya anggaran sama sekali (`CONFLICT` bila sudah ada); menyalin anggaran
    bulan sebelumnya untuk kategori pengeluaran yang masih aktif (`createMany` + `skipDuplicates`); tidak ada yang
    bisa disalin → `NOT_FOUND` "Bulan lalu belum punya anggaran".
  - Setelah berhasil `revalidatePath("/", "layout")`.
- **Query** (`src/modules/budgets/queries.ts`, dipakai ulang E03-US02/US03 & E04-US01):
  - `getBudgetMonth(userId, month)` — data halaman: baris kategori (aktif + terarsip yang punya anggaran bulan tsb),
    total anggaran, jumlah anggaran yang bisa disalin dari bulan lalu.
  - `getMonthBudgets(userId, month)` — anggaran per kategori bulan tsb (termasuk kategori terarsip).
  - `getMonthExpenseByCategory(userId, month)` — total pengeluaran per kategori (semua kategori).
  - `getBudgetSummary(userId, month)` — `{ totalBudget, totalSpent, budgetCount }`; `totalSpent` = **seluruh**
    pengeluaran bulan itu, termasuk kategori tanpa anggaran (keputusan PO, untuk E03-US02 & Beranda E04-US01).
  - Logika penyusunan baris murni (`src/modules/budgets/view.ts`, isomorfik): urutan, slug unik, total.
- **Route** `src/app/(app)/budgets/page.tsx` (+ `loading.tsx`): bulan dari `?month=YYYY-MM`.
- **UI** (`~/components/budgets/`): `budgets-view.tsx` (navigasi bulan, label "Hanya lihat", kartu Total anggaran,
  kartu kosong + "Salin dari bulan lalu", daftar kategori), `budget-form-sheet.tsx` (bottom sheet HP / dialog
  desktop, `AmountInput` fokus otomatis, Simpan, Hapus anggaran + konfirmasi), `budget-skeleton.tsx`.
  `MonthNavigator` (transactions) diberi prop `maxMonth` dan `testIds` agar bisa dipakai ulang tanpa mengubah
  selector lama.
- **Kelola Kategori (E02-US05):** kategori yang punya anggaran dianggap "sudah dipakai" — `deleteCategoryAction`
  menolak hapus bila kategori punya transaksi **atau anggaran** (dicek di transaksi + advisory lock yang sama),
  pesan "Kategori ini sudah dipakai transaksi atau anggaran, sehingga tidak bisa dihapus. Arsipkan saja.". Form
  kategori menampilkan Arsipkan + penjelasan jumlah transaksi/anggaran. `getManagedCategories` ikut menghitung
  anggaran.
- **Migration** `budgets_category_restrict`: FK `budgets.category_id → categories.id` dari `ON DELETE CASCADE` menjadi
  `ON DELETE RESTRICT` (sama seperti transaksi) — pengaman terakhir di DB; hapus user tetap meng-cascade semuanya.
- **Seed:** contoh anggaran bulan berjalan untuk `budi@example.com` (idempoten, tidak menimpa yang sudah ada).
- **Paket `web`:** export `./lib/date` agar E2E menghitung bulan berjalan dengan aturan yang sama dengan server.

## Decisions (open questions)

- **Bulan lampau** read-only (story); bulan depan maksimal **+1 bulan** (story). ◀ bisa mundur sampai Jan 2000
  (sejalan dengan batas tanggal transaksi).
- **Kategori terarsip (keputusan PO a):** anggaran yang sudah ada pada kategori terarsip tetap tampil di bulannya
  (di bawah kategori aktif, label "Diarsipkan", tidak bisa ditap/diubah/dihapus — aktifkan kembali kategorinya untuk
  mengubah), tetap dihitung di **Total anggaran**, tidak bisa dipilih untuk anggaran baru, dan tidak ikut "Salin dari
  bulan lalu".
- **Salin sebagian (UX):** hanya tersedia saat bulan tujuan belum punya anggaran sama sekali (AC 9). Tombol hanya
  tampil bila bulan lalu punya anggaran yang **bisa disalin** (kategori aktif); kategori terarsip dilewati tanpa
  pemberitahuan khusus (QA open question) — toast tetap "Anggaran disalin dari [bulan]".
- **Kategori diarsipkan di tengah bulan (QA):** anggarannya tetap tampil di bulan tsb (read-only, "Diarsipkan").
- **Total anggaran** = jumlah semua anggaran yang tampil di bulan tsb (termasuk kategori terarsip).
- **Hapus kategori yang punya anggaran:** ditolak (arsipkan saja) — kategori dengan anggaran dianggap sudah dipakai.
- **Urutan baris:** urutan kategori form (bawaan sesuai urutan tetap, custom abjad), lalu kategori terarsip abjad.
- **Selector:** `budget-row-<slug>` (slug nama; nomor urut bila bentrok), `budget-row-<slug>-amount`,
  `data-budget-set`, `data-archived`, `data-readonly`; kartu kosong `budget-empty-state`.
- **Konfirmasi hapus:** dialog "Hapus anggaran Makan & Minum untuk Oktober 2026?" (`budget-delete-dialog`,
  `confirm-delete-button`, `confirm-cancel-button`), toast "Anggaran dihapus".

## Catatan untuk story berikutnya

- **E03-US02 (indikator):** pakai `getMonthBudgets` + `getMonthExpenseByCategory` (atau `getBudgetSummary` untuk
  kartu ringkasan); baris `budget-row-<slug>` sudah ada — tambahkan `-percent`, `-remaining`, `data-status`.
  Kategori tanpa anggaran tapi ada pengeluaran → bagian "Tanpa anggaran" (data dari `getMonthExpenseByCategory`).
- **E04-US01 (Beranda):** `getBudgetSummary(userId, currentMonthKey())` → "Rp X dari Rp Y"; `budgetCount === 0` →
  ajakan "Atur anggaran bulan ini" (`budgetsHref()`).
